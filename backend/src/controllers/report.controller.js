const pool = require('../config/db');

// Helper to construct SQL date filters based on query params
const getDateCondition = (dateCol, startDate, endDate, period, paramIndex = 1) => {
    const conditions = [];
    const params = [];

    if (startDate) {
        conditions.push(`${dateCol} >= $${paramIndex}`);
        params.push(startDate);
        paramIndex++;
    }
    if (endDate) {
        conditions.push(`${dateCol} <= $${paramIndex}`);
        params.push(endDate);
        paramIndex++;
    }

    if (!startDate && !endDate && period && period !== 'All Time') {
        const now = new Date();
        let fromDate;
        if (period === 'This Week') {
            fromDate = new Date(now.setDate(now.getDate() - 7));
        } else if (period === 'This Month') {
            fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (period === 'This Quarter') {
            const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
            fromDate = new Date(now.getFullYear(), quarterMonth, 1);
        } else if (period === 'Year to Date') {
            fromDate = new Date(now.getFullYear(), 0, 1);
        }

        if (fromDate) {
            conditions.push(`${dateCol} >= $${paramIndex}`);
            params.push(fromDate.toISOString());
            paramIndex++;
        }
    }

    return {
        clause: conditions.length > 0 ? conditions.join(' AND ') : null,
        params,
        nextIndex: paramIndex
    };
};

exports.getDashboardAnalytics = async (req, res) => {
    try {
        const { startDate, endDate, vehicleId, driverId, status, period } = req.query;

        // Base vehicle counts
        let vehicleWhere = [];
        let vehicleParams = [];
        if (vehicleId) {
            vehicleWhere.push(`id = $${vehicleParams.length + 1}`);
            vehicleParams.push(vehicleId);
        }
        const vWhereStr = vehicleWhere.length ? `WHERE ${vehicleWhere.join(' AND ')}` : '';

        const vehicleCountsRes = await pool.query(`
            SELECT 
                COUNT(*)::int AS total_vehicles,
                COUNT(*) FILTER (WHERE status = 'Available')::int AS available_vehicles,
                COUNT(*) FILTER (WHERE status = 'On Trip')::int AS on_trip_vehicles,
                COUNT(*) FILTER (WHERE status = 'In Shop')::int AS maintenance_vehicles,
                COUNT(*) FILTER (WHERE status = 'Retired')::int AS retired_vehicles
            FROM vehicles ${vWhereStr}
        `, vehicleParams);
        const vCounts = vehicleCountsRes.rows[0] || {};

        // Base driver counts
        let driverWhere = [];
        let driverParams = [];
        if (driverId) {
            driverWhere.push(`id = $${driverParams.length + 1}`);
            driverParams.push(driverId);
        }
        const dWhereStr = driverWhere.length ? `WHERE ${driverWhere.join(' AND ')}` : '';

        const driverCountsRes = await pool.query(`
            SELECT 
                COUNT(*)::int AS total_drivers,
                COUNT(*) FILTER (WHERE status = 'Available')::int AS available_drivers,
                COUNT(*) FILTER (WHERE status = 'On Trip')::int AS on_trip_drivers,
                COUNT(*) FILTER (WHERE status = 'Off Duty')::int AS off_duty_drivers,
                COUNT(*) FILTER (WHERE status = 'Suspended')::int AS suspended_drivers
            FROM drivers ${dWhereStr}
        `, driverParams);
        const dCounts = driverCountsRes.rows[0] || {};

        // Trip counts with filters
        let tripConditions = [];
        let tripParams = [];
        let pIdx = 1;

        if (vehicleId) {
            tripConditions.push(`vehicle_id = $${pIdx++}`);
            tripParams.push(vehicleId);
        }
        if (driverId) {
            tripConditions.push(`driver_id = $${pIdx++}`);
            tripParams.push(driverId);
        }
        if (status) {
            tripConditions.push(`status = $${pIdx++}`);
            tripParams.push(status);
        }

        const dateCond = getDateCondition('COALESCE(start_time, created_at)', startDate, endDate, period, pIdx);
        if (dateCond.clause) {
            tripConditions.push(dateCond.clause);
            tripParams.push(...dateCond.params);
            pIdx = dateCond.nextIndex;
        }

        const tWhereStr = tripConditions.length ? `WHERE ${tripConditions.join(' AND ')}` : '';

        const tripCountsRes = await pool.query(`
            SELECT 
                COUNT(*)::int AS total_trips,
                COUNT(*) FILTER (WHERE status = 'Draft')::int AS draft_trips,
                COUNT(*) FILTER (WHERE status = 'Dispatched')::int AS active_trips,
                COUNT(*) FILTER (WHERE status = 'Completed')::int AS completed_trips,
                COUNT(*) FILTER (WHERE status = 'Cancelled')::int AS cancelled_trips
            FROM trips ${tWhereStr}
        `, tripParams);
        const tCounts = tripCountsRes.rows[0] || {};

        // Financial costs (Fuel, Maintenance, Expenses)
        // Fuel
        let fuelConds = [];
        let fuelParams = [];
        let fIdx = 1;
        if (vehicleId) {
            fuelConds.push(`vehicle_id = $${fIdx++}`);
            fuelParams.push(vehicleId);
        }
        const fDateCond = getDateCondition('date', startDate, endDate, period, fIdx);
        if (fDateCond.clause) {
            fuelConds.push(fDateCond.clause);
            fuelParams.push(...fDateCond.params);
            fIdx = fDateCond.nextIndex;
        }
        const fWhereStr = fuelConds.length ? `WHERE ${fuelConds.join(' AND ')}` : '';
        const fuelRes = await pool.query(`SELECT COALESCE(SUM(cost), 0)::float AS total_fuel_cost FROM fuel ${fWhereStr}`, fuelParams);

        // Maintenance
        let maintConds = [];
        let maintParams = [];
        let mIdx = 1;
        if (vehicleId) {
            maintConds.push(`vehicle_id = $${mIdx++}`);
            maintParams.push(vehicleId);
        }
        const mDateCond = getDateCondition('service_date', startDate, endDate, period, mIdx);
        if (mDateCond.clause) {
            maintConds.push(mDateCond.clause);
            maintParams.push(...mDateCond.params);
            mIdx = mDateCond.nextIndex;
        }
        const mWhereStr = maintConds.length ? `WHERE ${maintConds.join(' AND ')}` : '';
        const maintRes = await pool.query(`SELECT COALESCE(SUM(cost), 0)::float AS total_maintenance_cost FROM maintenance ${mWhereStr}`, maintParams);

        // Expenses
        let expConds = [];
        let expParams = [];
        let eIdx = 1;
        if (vehicleId) {
            expConds.push(`vehicle_id = $${eIdx++}`);
            expParams.push(vehicleId);
        }
        const eDateCond = getDateCondition('date', startDate, endDate, period, eIdx);
        if (eDateCond.clause) {
            expConds.push(eDateCond.clause);
            expParams.push(...eDateCond.params);
            eIdx = eDateCond.nextIndex;
        }
        const eWhereStr = expConds.length ? `WHERE ${expConds.join(' AND ')}` : '';
        const expRes = await pool.query(`SELECT COALESCE(SUM(amount), 0)::float AS total_expense_cost FROM expenses ${eWhereStr}`, expParams);

        const fuelCost = fuelRes.rows[0]?.total_fuel_cost || 0;
        const maintenanceCost = maintRes.rows[0]?.total_maintenance_cost || 0;
        const generalExpenseCost = expRes.rows[0]?.total_expense_cost || 0;
        const totalCost = fuelCost + maintenanceCost + generalExpenseCost;

        const totalV = Number(vCounts.total_vehicles || 0);
        const availableV = Number(vCounts.available_vehicles || 0);
        const onTripV = Number(vCounts.on_trip_vehicles || 0);
        const inShopV = Number(vCounts.maintenance_vehicles || 0);

        const utilization = totalV > 0 
            ? Math.round(((onTripV + inShopV) / totalV) * 100) 
            : 0;
        const availability = totalV > 0
            ? Math.round((availableV / totalV) * 100)
            : 0;

        res.json({
            total_vehicles: totalV,
            available_vehicles: availableV,
            on_trip_vehicles: onTripV,
            maintenance_vehicles: inShopV,
            retired_vehicles: Number(vCounts.retired_vehicles || 0),
            
            total_drivers: Number(dCounts.total_drivers || 0),
            available_drivers: Number(dCounts.available_drivers || 0),
            on_trip_drivers: Number(dCounts.on_trip_drivers || 0),
            off_duty_drivers: Number(dCounts.off_duty_drivers || 0),
            suspended_drivers: Number(dCounts.suspended_drivers || 0),

            total_trips: Number(tCounts.total_trips || 0),
            draft_trips: Number(tCounts.draft_trips || 0),
            active_trips: Number(tCounts.active_trips || 0),
            completed_trips: Number(tCounts.completed_trips || 0),
            cancelled_trips: Number(tCounts.cancelled_trips || 0),

            monthly_fuel_cost: fuelCost,
            monthly_maintenance_cost: maintenanceCost,
            monthly_expense_cost: generalExpenseCost,
            monthly_operational_cost: totalCost,

            fleet_utilization: utilization,
            vehicle_availability: availability
        });
    } catch (err) {
        console.error("Error in getDashboardAnalytics:", err);
        res.status(500).json({ message: 'Failed to fetch report analytics data', error: err.message });
    }
};

exports.getCharts = async (req, res) => {
    try {
        const { startDate, endDate, vehicleId, driverId, status, period } = req.query;

        // 1. Vehicle status distribution
        let vWhere = vehicleId ? 'WHERE id = $1' : '';
        let vParams = vehicleId ? [vehicleId] : [];
        const vehicleStatusRes = await pool.query(`
            SELECT status, COUNT(*)::int as count 
            FROM vehicles ${vWhere}
            GROUP BY status
        `, vParams);

        // 2. Trip status distribution
        let tripConds = [];
        let tripParams = [];
        let pIdx = 1;
        if (vehicleId) { tripConds.push(`vehicle_id = $${pIdx++}`); tripParams.push(vehicleId); }
        if (driverId) { tripConds.push(`driver_id = $${pIdx++}`); tripParams.push(driverId); }
        if (status) { tripConds.push(`status = $${pIdx++}`); tripParams.push(status); }

        const tDateCond = getDateCondition('COALESCE(start_time, created_at)', startDate, endDate, period, pIdx);
        if (tDateCond.clause) {
            tripConds.push(tDateCond.clause);
            tripParams.push(...tDateCond.params);
        }
        const tWhereStr = tripConds.length ? `WHERE ${tripConds.join(' AND ')}` : '';

        const tripStatusRes = await pool.query(`
            SELECT status, COUNT(*)::int as count 
            FROM trips ${tWhereStr}
            GROUP BY status
        `, tripParams);

        // 3. Monthly trips timeline
        const monthlyTripsRes = await pool.query(`
            SELECT 
                TO_CHAR(COALESCE(start_time, created_at), 'Mon YYYY') as month, 
                DATE_TRUNC('month', COALESCE(start_time, created_at)) as month_date, 
                COUNT(*)::int as trips 
            FROM trips ${tWhereStr}
            GROUP BY month, month_date
            ORDER BY month_date ASC
        `, tripParams);

        // 4. Fuel vs Expense vs Maintenance summary
        let fConds = [];
        let fParams = [];
        let fIdx = 1;
        if (vehicleId) { fConds.push(`vehicle_id = $${fIdx++}`); fParams.push(vehicleId); }
        const fDateCond = getDateCondition('date', startDate, endDate, period, fIdx);
        if (fDateCond.clause) { fConds.push(fDateCond.clause); fParams.push(...fDateCond.params); }
        const fWhereStr = fConds.length ? `WHERE ${fConds.join(' AND ')}` : '';

        const fuelTotalRes = await pool.query(`SELECT COALESCE(SUM(cost), 0)::float as total FROM fuel ${fWhereStr}`, fParams);

        let mConds = [];
        let mParams = [];
        let mIdx = 1;
        if (vehicleId) { mConds.push(`vehicle_id = $${mIdx++}`); mParams.push(vehicleId); }
        const mDateCond = getDateCondition('service_date', startDate, endDate, period, mIdx);
        if (mDateCond.clause) { mConds.push(mDateCond.clause); mParams.push(...mDateCond.params); }
        const mWhereStr = mConds.length ? `WHERE ${mConds.join(' AND ')}` : '';

        const maintTotalRes = await pool.query(`SELECT COALESCE(SUM(cost), 0)::float as total FROM maintenance ${mWhereStr}`, mParams);

        let eConds = [];
        let eParams = [];
        let eIdx = 1;
        if (vehicleId) { eConds.push(`vehicle_id = $${eIdx++}`); eParams.push(vehicleId); }
        const eDateCond = getDateCondition('date', startDate, endDate, period, eIdx);
        if (eDateCond.clause) { eConds.push(eDateCond.clause); eParams.push(...eDateCond.params); }
        const eWhereStr = eConds.length ? `WHERE ${eConds.join(' AND ')}` : '';

        const expTotalRes = await pool.query(`SELECT COALESCE(SUM(amount), 0)::float as total FROM expenses ${eWhereStr}`, eParams);

        const expense_breakdown = [
            { category: 'Fuel', amount: fuelTotalRes.rows[0]?.total || 0 },
            { category: 'Maintenance', amount: maintTotalRes.rows[0]?.total || 0 },
            { category: 'General Expenses', amount: expTotalRes.rows[0]?.total || 0 }
        ];

        res.json({
            vehicle_status: vehicleStatusRes.rows.length ? vehicleStatusRes.rows : [
                { status: 'Available', count: 0 }, { status: 'On Trip', count: 0 },
                { status: 'In Shop', count: 0 }, { status: 'Retired', count: 0 }
            ],
            trip_status: tripStatusRes.rows.length ? tripStatusRes.rows : [
                { status: 'Draft', count: 0 }, { status: 'Dispatched', count: 0 },
                { status: 'Completed', count: 0 }, { status: 'Cancelled', count: 0 }
            ],
            monthly_trips: monthlyTripsRes.rows,
            expense_breakdown
        });
    } catch (err) {
        console.error("Error in getCharts:", err);
        res.status(500).json({ message: 'Failed to fetch report charts data', error: err.message });
    }
};

exports.getInsights = async (req, res) => {
    try {
        const insights = [];

        // 1. Maintenance status
        const shopRes = await pool.query(`
            SELECT vehicle_name, registration_no 
            FROM vehicles 
            WHERE status = 'In Shop'
        `);
        if (shopRes.rows.length > 0) {
            const names = shopRes.rows.map(r => `${r.vehicle_name} (${r.registration_no})`).join(', ');
            insights.push(`${shopRes.rows.length} vehicle(s) currently undergoing maintenance: ${names}.`);
        } else {
            insights.push("No vehicles are currently in shop for maintenance.");
        }

        // 2. Most active vehicle
        const activeVehRes = await pool.query(`
            SELECT v.vehicle_name, v.registration_no, COUNT(t.id)::int as trip_count 
            FROM vehicles v 
            JOIN trips t ON v.id = t.vehicle_id 
            GROUP BY v.id, v.vehicle_name, v.registration_no 
            ORDER BY trip_count DESC 
            LIMIT 1
        `);
        if (activeVehRes.rows.length > 0 && activeVehRes.rows[0].trip_count > 0) {
            const topVeh = activeVehRes.rows[0];
            insights.push(`Most active vehicle: ${topVeh.vehicle_name} (${topVeh.registration_no}) with ${topVeh.trip_count} completed/dispatched trips.`);
        } else {
            insights.push("No active trip logs associated with fleet vehicles yet.");
        }

        // 3. Total fuel & cost expenditure
        const totalFuelRes = await pool.query(`
            SELECT COALESCE(SUM(cost), 0)::float as fuel_cost, COALESCE(SUM(fuel_amount), 0)::float as fuel_qty 
            FROM fuel
        `);
        const fCost = totalFuelRes.rows[0]?.fuel_cost || 0;
        insights.push(`Total fleet fuel expenditure recorded is ₹ ${fCost.toLocaleString()}.`);

        // 4. Completed vs Ongoing trips ratio
        const tripSummaryRes = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'Completed')::int as completed,
                COUNT(*) FILTER (WHERE status = 'Dispatched')::int as dispatched,
                COUNT(*)::int as total
            FROM trips
        `);
        const tSummary = tripSummaryRes.rows[0] || {};
        insights.push(`Trips breakdown: ${tSummary.completed || 0} completed and ${tSummary.dispatched || 0} active/dispatched out of ${tSummary.total || 0} total trips.`);

        // 5. Driver License expiry
        const expiryRes = await pool.query(`
            SELECT name, license_expiry 
            FROM drivers 
            WHERE license_expiry IS NOT NULL AND license_expiry <= (CURRENT_DATE + INTERVAL '30 days') AND license_expiry >= CURRENT_DATE
        `);
        if (expiryRes.rows.length > 0) {
            insights.push(`Attention: ${expiryRes.rows.length} driver(s) have licenses expiring within the next 30 days.`);
        } else {
            insights.push("All driver licenses are up to date with no imminent expirations in the next 30 days.");
        }

        res.json(insights);
    } catch (err) {
        console.error("Error in getInsights:", err);
        res.status(500).json({ message: 'Failed to fetch report insights data', error: err.message });
    }
};

