const pool = require('../config/db');

/**
 * Calculates start and end Date objects for period strings.
 */
function parseDateBoundaries(period, startDate, endDate) {
    const now = new Date();
    let start = null;
    let end = null;

    if (startDate) {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
    }
    if (endDate) {
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
    }

    if (!start && !end && period && period !== 'All Time') {
        if (period === 'Today') {
            start = new Date(now);
            start.setHours(0, 0, 0, 0);
            end = new Date(now);
            end.setHours(23, 59, 59, 999);
        } else if (period === 'This Week' || period === 'Week') {
            // Monday 00:00:00 of current week
            const day = now.getDay();
            const diffToMon = (day === 0 ? -6 : 1 - day); // 1 = Monday
            start = new Date(now);
            start.setDate(now.getDate() + diffToMon);
            start.setHours(0, 0, 0, 0);
            end = new Date(now);
            end.setHours(23, 59, 59, 999);
        } else if (period === 'This Month' || period === 'Month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (period === 'This Quarter') {
            const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
            start = new Date(now.getFullYear(), quarterMonth, 1, 0, 0, 0, 0);
            end = new Date(now.getFullYear(), quarterMonth + 3, 0, 23, 59, 59, 999);
        } else if (period === 'Year to Date') {
            start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            end = new Date(now);
            end.setHours(23, 59, 59, 999);
        }
    }

    return { start, end };
}

/**
 * Builds parameterized SQL WHERE clause for common filters.
 */
function buildFilterClause({ dateCol, vehicleId, driverId, status, start, end, alias = '' }) {
    const conditions = [];
    const params = [];
    let idx = 1;
    const colPrefix = alias ? `${alias}.` : '';

    if (vehicleId) {
        conditions.push(`${colPrefix}vehicle_id = $${idx++}`);
        params.push(vehicleId);
    }
    if (driverId) {
        conditions.push(`${colPrefix}driver_id = $${idx++}`);
        params.push(driverId);
    }
    if (status) {
        conditions.push(`${colPrefix}status = $${idx++}`);
        params.push(status);
    }
    if (start) {
        conditions.push(`${colPrefix}${dateCol} >= $${idx++}`);
        params.push(start.toISOString());
    }
    if (end) {
        conditions.push(`${colPrefix}${dateCol} <= $${idx++}`);
        params.push(end.toISOString());
    }

    const clause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    return { clause, params, nextIndex: idx };
}

class FinancialAnalyticsService {

    /**
     * Compute authoritative Financial Metrics for given filters.
     */
    static async getFinancialMetrics(filters = {}) {
        const { period, startDate, endDate, vehicleId, driverId, status } = filters;
        const { start, end } = parseDateBoundaries(period, startDate, endDate);

        // 1. TRIPS (Revenue & Distance & Toll)
        const tripFilters = buildFilterClause({
            dateCol: 'COALESCE(end_time, start_time, created_at)',
            vehicleId, driverId, status, start, end
        });

        const tripsRes = await pool.query(`
            SELECT 
                COUNT(*)::int AS total_trips,
                COUNT(*) FILTER (WHERE status = 'Completed')::int AS completed_trips,
                COUNT(*) FILTER (WHERE status = 'Dispatched')::int AS active_trips,
                COUNT(*) FILTER (WHERE status = 'Draft')::int AS draft_trips,
                COUNT(*) FILTER (WHERE status = 'Cancelled')::int AS cancelled_trips,
                COALESCE(SUM(revenue) FILTER (WHERE status = 'Completed'), 0)::float AS total_revenue,
                COALESCE(SUM(COALESCE(actual_distance, planned_distance, 0)) FILTER (WHERE status = 'Completed'), 0)::float AS total_distance,
                COALESCE(SUM(toll_amount) FILTER (WHERE status = 'Completed'), 0)::float AS trip_toll_amount
            FROM trips
            ${tripFilters.clause}
        `, tripFilters.params);

        const tripData = tripsRes.rows[0];

        // 2. FUEL LOGS (For volume metrics only, cost is from expenses ledger)
        let fuelQuery = '';
        let fuelParams = [];
        if (driverId) {
            fuelQuery = `
                SELECT COALESCE(SUM(f.fuel_amount), 0)::float AS total_fuel_liters
                FROM fuel f
                LEFT JOIN trips t ON f.trip_id = t.id
                LEFT JOIN vehicles v ON f.vehicle_id = v.id
                WHERE (t.driver_id = $1 OR v.current_driver_id = $1)
            `;
            fuelParams = [driverId];
            let idx = 2;
            if (vehicleId) { fuelQuery += ` AND f.vehicle_id = $${idx++}`; fuelParams.push(vehicleId); }
            if (start) { fuelQuery += ` AND f.date >= $${idx++}`; fuelParams.push(start.toISOString()); }
            if (end) { fuelQuery += ` AND f.date <= $${idx++}`; fuelParams.push(end.toISOString()); }
        } else {
            const fuelFilters = buildFilterClause({ dateCol: 'date', vehicleId, start, end });
            fuelQuery = `
                SELECT COALESCE(SUM(fuel_amount), 0)::float AS total_fuel_liters
                FROM fuel
                ${fuelFilters.clause}
            `;
            fuelParams = fuelFilters.params;
        }
        const fuelRes = await pool.query(fuelQuery, fuelParams);
        const fuelData = fuelRes.rows[0];

        // 3. EXPENSES LEDGER (Centralized Costs)
        let expQuery = '';
        let expParams = [];
        if (driverId) {
            expQuery = `
                SELECT 
                    COALESCE(SUM(amount) FILTER (WHERE UPPER(e.category) = 'FUEL'), 0)::float AS total_fuel_cost,
                    COALESCE(SUM(amount) FILTER (WHERE UPPER(e.category) = 'MAINTENANCE'), 0)::float AS total_maintenance_cost,
                    COALESCE(SUM(amount) FILTER (WHERE UPPER(e.category) = 'TOLL'), 0)::float AS total_toll_cost,
                    COALESCE(SUM(amount) FILTER (WHERE UPPER(e.category) NOT IN ('FUEL', 'MAINTENANCE', 'TOLL')), 0)::float AS total_other_cost
                FROM expenses e
                LEFT JOIN trips t ON e.trip_id = t.id
                LEFT JOIN vehicles v ON e.vehicle_id = v.id
                WHERE (t.driver_id = $1 OR v.current_driver_id = $1)
            `;
            expParams = [driverId];
            let idx = 2;
            if (vehicleId) { expQuery += ` AND e.vehicle_id = $${idx++}`; expParams.push(vehicleId); }
            if (start) { expQuery += ` AND e.date >= $${idx++}`; expParams.push(start.toISOString()); }
            if (end) { expQuery += ` AND e.date <= $${idx++}`; expParams.push(end.toISOString()); }
        } else {
            const expFilters = buildFilterClause({ dateCol: 'date', vehicleId, start, end });
            expQuery = `
                SELECT 
                    COALESCE(SUM(amount) FILTER (WHERE UPPER(category) = 'FUEL'), 0)::float AS total_fuel_cost,
                    COALESCE(SUM(amount) FILTER (WHERE UPPER(category) = 'MAINTENANCE'), 0)::float AS total_maintenance_cost,
                    COALESCE(SUM(amount) FILTER (WHERE UPPER(category) = 'TOLL'), 0)::float AS total_toll_cost,
                    COALESCE(SUM(amount) FILTER (WHERE UPPER(category) NOT IN ('FUEL', 'MAINTENANCE', 'TOLL')), 0)::float AS total_other_cost
                FROM expenses
                ${expFilters.clause}
            `;
            expParams = expFilters.params;
        }
        const expRes = await pool.query(expQuery, expParams);
        const expData = expRes.rows[0];

        // Computations
        const revenue = parseFloat(tripData.total_revenue || 0);
        const fuelCost = parseFloat(expData.total_fuel_cost || 0);
        const maintenanceCost = parseFloat(expData.total_maintenance_cost || 0);
        const tollCost = parseFloat(expData.total_toll_cost || 0);
        const generalOtherExpenses = parseFloat(expData.total_other_cost || 0);
        
        const totalExpenses = fuelCost + maintenanceCost + tollCost + generalOtherExpenses;

        const netResult = revenue - totalExpenses;
        const profit = netResult > 0 ? netResult : 0;
        const loss = netResult < 0 ? Math.abs(netResult) : 0;

        const totalDistance = parseFloat(tripData.total_distance || 0);
        const costPerKm = totalDistance > 0 ? (totalExpenses / totalDistance) : 0;
        const fuelLiters = parseFloat(fuelData.total_fuel_liters || 0);
        const fuelEfficiency = fuelLiters > 0 ? (totalDistance / fuelLiters) : 0;

        return {
            total_revenue: revenue,
            total_fuel_cost: fuelCost,
            total_maintenance_cost: maintenanceCost,
            total_toll_cost: tollCost,
            total_other_expenses: generalOtherExpenses,
            total_expenses: totalExpenses,
            net_result: netResult,
            profit: profit,
            loss: loss,
            total_distance: totalDistance,
            cost_per_km: costPerKm,
            fuel_efficiency: fuelEfficiency,
            total_trips: tripData.total_trips,
            completed_trips: tripData.completed_trips,
            active_trips: tripData.active_trips,
            draft_trips: tripData.draft_trips,
            cancelled_trips: tripData.cancelled_trips
        };
    }

    /**
     * Operational overview metrics (Vehicle counts, Driver counts, P&L periods).
     */
    static async getDashboardOverview(filters = {}) {
        const { vehicleId, driverId } = filters;

        // Vehicle counts
        let vWhere = vehicleId ? 'WHERE id = $1' : '';
        let vParams = vehicleId ? [vehicleId] : [];
        const vRes = await pool.query(`
            SELECT 
                COUNT(*)::int AS total_vehicles,
                COUNT(*) FILTER (WHERE status = 'Available')::int AS available_vehicles,
                COUNT(*) FILTER (WHERE status = 'On Trip')::int AS on_trip_vehicles,
                COUNT(*) FILTER (WHERE status = 'In Shop')::int AS maintenance_vehicles,
                COUNT(*) FILTER (WHERE status = 'Inactive')::int AS inactive_vehicles,
                COUNT(*) FILTER (WHERE status = 'Retired')::int AS retired_vehicles
            FROM vehicles ${vWhere}
        `, vParams);
        const vCounts = vRes.rows[0];

        // Driver counts
        let dWhere = driverId ? 'WHERE id = $1' : '';
        let dParams = driverId ? [driverId] : [];
        const dRes = await pool.query(`
            SELECT 
                COUNT(*)::int AS total_drivers,
                COUNT(*) FILTER (WHERE status = 'Available')::int AS available_drivers,
                COUNT(*) FILTER (WHERE status = 'On Trip')::int AS on_trip_drivers,
                COUNT(*) FILTER (WHERE status = 'Off Duty')::int AS off_duty_drivers,
                COUNT(*) FILTER (WHERE status = 'Suspended')::int AS suspended_drivers
            FROM drivers ${dWhere}
        `, dParams);
        const dCounts = dRes.rows[0];

        // Period P&L summaries
        const todayMetrics = await this.getFinancialMetrics({ ...filters, period: 'Today' });
        const weekMetrics = await this.getFinancialMetrics({ ...filters, period: 'This Week' });
        const monthMetrics = await this.getFinancialMetrics({ ...filters, period: 'This Month' });
        const overallMetrics = await this.getFinancialMetrics(filters);

        const totalV = Number(vCounts.total_vehicles || 0);
        const availableV = Number(vCounts.available_vehicles || 0);
        const onTripV = Number(vCounts.on_trip_vehicles || 0);
        const inShopV = Number(vCounts.maintenance_vehicles || 0);

        const utilization = totalV > 0 ? Math.round(((onTripV + inShopV) / totalV) * 100) : 0;
        const availability = totalV > 0 ? Math.round((availableV / totalV) * 100) : 0;

        return {
            financial: {
                today: { revenue: todayMetrics.total_revenue, expenses: todayMetrics.total_expenses, profit: todayMetrics.profit, loss: todayMetrics.loss },
                this_week: { revenue: weekMetrics.total_revenue, expenses: weekMetrics.total_expenses, profit: weekMetrics.profit, loss: weekMetrics.loss },
                this_month: { revenue: monthMetrics.total_revenue, expenses: monthMetrics.total_expenses, profit: monthMetrics.profit, loss: monthMetrics.loss },
                overall: overallMetrics
            },
            operational: {
                total_vehicles: totalV,
                available_vehicles: availableV,
                on_trip_vehicles: onTripV,
                maintenance_vehicles: inShopV,
                inactive_vehicles: Number(vCounts.inactive_vehicles || 0),
                retired_vehicles: Number(vCounts.retired_vehicles || 0),
                
                total_drivers: Number(dCounts.total_drivers || 0),
                available_drivers: Number(dCounts.available_drivers || 0),
                on_trip_drivers: Number(dCounts.on_trip_drivers || 0),
                off_duty_drivers: Number(dCounts.off_duty_drivers || 0),
                suspended_drivers: Number(dCounts.suspended_drivers || 0),

                total_trips: overallMetrics.total_trips,
                completed_trips: overallMetrics.completed_trips,
                active_trips: overallMetrics.active_trips,
                draft_trips: overallMetrics.draft_trips,
                cancelled_trips: overallMetrics.cancelled_trips,
                
                total_distance: overallMetrics.total_distance,
                monthly_fuel_cost: overallMetrics.total_fuel_cost,
                monthly_maintenance_cost: overallMetrics.total_maintenance_cost,
                monthly_expense_cost: overallMetrics.total_other_expenses + overallMetrics.total_toll_cost,
                monthly_operational_cost: overallMetrics.total_expenses,

                fleet_utilization: utilization,
                vehicle_availability: availability
            }
        };
    }

    /**
     * Dynamic Chart Data for Dashboard & Reports.
     */
    static async getChartsData(filters = {}) {
        const { vehicleId, driverId, status, period, startDate, endDate } = filters;
        const { start, end } = parseDateBoundaries(period, startDate, endDate);

        // 1. Vehicle status distribution
        let vWhere = vehicleId ? 'WHERE id = $1' : '';
        let vParams = vehicleId ? [vehicleId] : [];
        const vehicleStatusRes = await pool.query(`
            SELECT status, COUNT(*)::int as count 
            FROM vehicles ${vWhere}
            GROUP BY status
        `, vParams);

        // 2. Trip status distribution
        const tFilter = buildFilterClause({
            dateCol: 'COALESCE(start_time, created_at)',
            vehicleId, driverId, status, start, end
        });
        const tripStatusRes = await pool.query(`
            SELECT status, COUNT(*)::int as count 
            FROM trips ${tFilter.clause}
            GROUP BY status
        `, tFilter.params);

        // 3. Monthly trip volume timeline
        const monthlyTripsRes = await pool.query(`
            SELECT 
                TO_CHAR(COALESCE(start_time, created_at), 'Mon YYYY') as month, 
                DATE_TRUNC('month', COALESCE(start_time, created_at)) as month_date, 
                COUNT(*)::int as trips 
            FROM trips ${tFilter.clause}
            GROUP BY month, month_date
            ORDER BY month_date ASC
        `, tFilter.params);

        // 4. Expense Breakdown
        const metrics = await this.getFinancialMetrics(filters);
        const expense_breakdown = [
            { category: 'Fuel', amount: metrics.total_fuel_cost },
            { category: 'Maintenance', amount: metrics.total_maintenance_cost },
            { category: 'Toll', amount: metrics.total_toll_cost },
            { category: 'General Expenses', amount: metrics.total_other_expenses }
        ];

        return {
            vehicle_status: vehicleStatusRes.rows.length ? vehicleStatusRes.rows : [
                { status: 'Available', count: 0 }, { status: 'On Trip', count: 0 },
                { status: 'In Shop', count: 0 }, { status: 'Inactive', count: 0 }
            ],
            trip_status: tripStatusRes.rows.length ? tripStatusRes.rows : [
                { status: 'Draft', count: 0 }, { status: 'Dispatched', count: 0 },
                { status: 'Completed', count: 0 }, { status: 'Cancelled', count: 0 }
            ],
            monthly_trips: monthlyTripsRes.rows,
            expense_breakdown
        };
    }

    /**
     * Vehicle Yield Rankings (Revenue - Direct Costs).
     */
    static async getVehicleRankings(filters = {}) {
        const { period, startDate, endDate } = filters;
        const { start, end } = parseDateBoundaries(period, startDate, endDate);

        let dateWhere = '';
        let params = [];
        if (start && end) {
            dateWhere = 'WHERE t.created_at >= $1 AND t.created_at <= $2';
            params = [start.toISOString(), end.toISOString()];
        }

        const vehicleRankQuery = `
            SELECT 
                v.id, v.registration_no, v.vehicle_name, v.vehicle_type,
                COALESCE(SUM(t.revenue) FILTER (WHERE t.status = 'Completed'), 0)::float AS revenue,
                COALESCE((SELECT SUM(amount) FROM expenses WHERE vehicle_id = v.id AND UPPER(category) = 'FUEL'), 0)::float AS fuel_cost,
                COALESCE((SELECT SUM(amount) FROM expenses WHERE vehicle_id = v.id AND UPPER(category) = 'MAINTENANCE'), 0)::float AS maintenance_cost,
                COALESCE((SELECT SUM(amount) FROM expenses WHERE vehicle_id = v.id AND UPPER(category) NOT IN ('FUEL', 'MAINTENANCE')), 0)::float AS other_cost
            FROM vehicles v
            LEFT JOIN trips t ON t.vehicle_id = v.id
            ${dateWhere}
            GROUP BY v.id, v.registration_no, v.vehicle_name, v.vehicle_type
            ORDER BY revenue DESC
            LIMIT 10
        `;
        const res = await pool.query(vehicleRankQuery, params);
        return res.rows.map(row => {
            const rev = parseFloat(row.revenue);
            const exp = parseFloat(row.fuel_cost) + parseFloat(row.maintenance_cost) + parseFloat(row.other_cost);
            return {
                id: row.id,
                registration_no: row.registration_no,
                vehicle_name: row.vehicle_name,
                vehicle_type: row.vehicle_type,
                revenue: rev,
                expenses: exp,
                profit: rev - exp
            };
        });
    }

    /**
     * Automated Insights.
     */
    static async getInsights(filters = {}) {
        const insights = [];

        // 1. Maintenance status
        const shopRes = await pool.query("SELECT vehicle_name, registration_no FROM vehicles WHERE status = 'In Shop'");
        if (shopRes.rows.length > 0) {
            const names = shopRes.rows.map(r => `${r.vehicle_name} (${r.registration_no})`).join(', ');
            insights.push(`${shopRes.rows.length} vehicle(s) currently undergoing maintenance: ${names}.`);
        } else {
            insights.push("No vehicles are currently in shop for maintenance.");
        }

        // 2. Active Trips Ratio
        const tripSummaryRes = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'Completed')::int as completed,
                COUNT(*) FILTER (WHERE status = 'Dispatched')::int as dispatched,
                COUNT(*)::int as total
            FROM trips
        `);
        const tSummary = tripSummaryRes.rows[0] || {};
        insights.push(`Fleet trips breakdown: ${tSummary.completed || 0} completed and ${tSummary.dispatched || 0} active out of ${tSummary.total || 0} total trips.`);

        // 3. Driver Expiries
        const expiryRes = await pool.query(`
            SELECT name, license_expiry 
            FROM drivers 
            WHERE license_expiry IS NOT NULL AND license_expiry <= (CURRENT_DATE + INTERVAL '30 days') AND license_expiry >= CURRENT_DATE
        `);
        if (expiryRes.rows.length > 0) {
            insights.push(`Attention: ${expiryRes.rows.length} driver(s) have licenses expiring within the next 30 days.`);
        } else {
            insights.push("All driver licenses are up to date with no imminent expirations in 30 days.");
        }

        return insights;
    }
}

module.exports = FinancialAnalyticsService;
