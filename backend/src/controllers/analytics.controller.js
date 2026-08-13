const pool = require('../config/db');

// Helper to construct SQL where clauses for dates/vehicles
const buildConditions = (dateColumn, vehicleId, startDate, endDate, period, paramIndexStart = 1) => {
    const conditions = [];
    const params = [];
    let pIdx = paramIndexStart;

    if (vehicleId) {
        conditions.push(`vehicle_id = $${pIdx++}`);
        params.push(vehicleId);
    }

    if (startDate) {
        conditions.push(`${dateColumn} >= $${pIdx++}`);
        params.push(startDate);
    }
    if (endDate) {
        conditions.push(`${dateColumn} <= $${pIdx++}`);
        params.push(endDate);
    }

    if (!startDate && !endDate && period && period !== 'All Time') {
        const now = new Date();
        let fromDate;
        if (period === 'Today') {
            fromDate = new Date(now.setHours(0, 0, 0, 0));
        } else if (period === 'This Week' || period === 'Week') {
            fromDate = new Date(now.setDate(now.getDate() - 7));
        } else if (period === 'This Month' || period === 'Month') {
            fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (period === 'This Quarter') {
            const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
            fromDate = new Date(now.getFullYear(), quarterMonth, 1);
        } else if (period === 'Year to Date') {
            fromDate = new Date(now.getFullYear(), 0, 1);
        }

        if (fromDate) {
            conditions.push(`${dateColumn} >= $${pIdx++}`);
            params.push(fromDate.toISOString());
        }
    }

    return {
        clause: conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '',
        params,
        nextIndex: pIdx
    };
};

exports.getFinancialAnalytics = async (req, res) => {
    try {
        const { dateFrom, dateTo, vehicleId, period } = req.query;

        // 1. Gather stats from TRIPS (Revenue, distance, trips count)
        // Note: trips dates are based on start_time or created_at. Let's use created_at.
        const tripsCond = buildConditions('created_at', vehicleId, dateFrom, dateTo, period, 1);
        const tripsQuery = `
            SELECT 
                COUNT(*)::int AS total_trips,
                COUNT(*) FILTER (WHERE status = 'Completed')::int AS completed_trips,
                COALESCE(SUM(revenue), 0)::decimal AS total_revenue,
                COALESCE(SUM(COALESCE(actual_distance, planned_distance)), 0)::decimal AS total_distance,
                COALESCE(SUM(actual_fuel_cost), 0)::decimal AS trips_actual_fuel_cost,
                COALESCE(SUM(estimated_fuel_cost), 0)::decimal AS trips_estimated_fuel_cost,
                COALESCE(SUM(fuel_used), 0)::decimal AS total_fuel_liters
            FROM trips
            ${tripsCond.clause}
        `;
        const tripsRes = await pool.query(tripsQuery, tripsCond.params);
        const tripStats = tripsRes.rows[0];

        // 2. Gather stats from FUEL logs (Fuel expenses)
        const fuelCond = buildConditions('date', vehicleId, dateFrom, dateTo, period, 1);
        const fuelQuery = `
            SELECT COALESCE(SUM(cost), 0)::decimal AS total_fuel_cost
            FROM fuel
            ${fuelCond.clause}
        `;
        const fuelRes = await pool.query(fuelQuery, fuelCond.params);
        const totalFuelCost = parseFloat(fuelRes.rows[0].total_fuel_cost);

        // 3. Gather stats from MAINTENANCE logs
        const maintCond = buildConditions('service_date', vehicleId, dateFrom, dateTo, period, 1);
        const maintQuery = `
            SELECT 
                COALESCE(SUM(cost), 0)::decimal AS total_maintenance_cost,
                COUNT(*)::int AS maintenance_count
            FROM maintenance
            ${maintCond.clause}
        `;
        const maintRes = await pool.query(maintQuery, maintCond.params);
        const maintenanceStats = maintRes.rows[0];

        // 4. Gather stats from GENERAL EXPENSES
        const expenseCond = buildConditions('date', vehicleId, dateFrom, dateTo, period, 1);
        const expenseQuery = `
            SELECT COALESCE(SUM(amount), 0)::decimal AS total_expense_amount
            FROM expenses
            ${expenseCond.clause}
        `;
        const expenseRes = await pool.query(expenseQuery, expenseCond.params);
        const totalExpenseCost = parseFloat(expenseRes.rows[0].total_expense_amount);

        // 5. Aggregate calculations
        const revenue = parseFloat(tripStats.total_revenue);
        // Fuel cost is prioritised from direct fuel logs if no vehicle filter, but let's take the direct logs.
        // If vehicle filter is active, it also filters both.
        const fuelCost = totalFuelCost > 0 ? totalFuelCost : parseFloat(tripStats.trips_actual_fuel_cost || tripStats.trips_estimated_fuel_cost || 0);
        const maintenanceCost = parseFloat(maintenanceStats.total_maintenance_cost);
        const otherExpenses = totalExpenseCost;

        const totalOperationalCost = fuelCost + maintenanceCost + otherExpenses;
        const profitLoss = revenue - totalOperationalCost;
        const totalDistance = parseFloat(tripStats.total_distance);
        const costPerKm = totalDistance > 0 ? (totalOperationalCost / totalDistance) : 0;
        const fuelEfficiency = parseFloat(tripStats.total_fuel_liters) > 0 ? (totalDistance / parseFloat(tripStats.total_fuel_liters)) : 0;

        // 6. Expense Breakdown by Category
        const catQuery = `
            SELECT category, COALESCE(SUM(amount), 0)::decimal AS amount
            FROM expenses
            ${expenseCond.clause}
            GROUP BY category
            ORDER BY amount DESC
        `;
        const catRes = await pool.query(catQuery, expenseCond.params);
        const categoryBreakdown = catRes.rows.map(row => ({
            name: row.category,
            value: parseFloat(row.amount)
        }));

        // Add fuel and maintenance as categories
        if (fuelCost > 0) {
            categoryBreakdown.push({ name: 'Fuel', value: fuelCost });
        }
        if (maintenanceCost > 0) {
            categoryBreakdown.push({ name: 'Maintenance', value: maintenanceCost });
        }
        categoryBreakdown.sort((a, b) => b.value - a.value);

        // 7. Trend Data (grouped by date)
        // Group by day if range <= 30 days, else by month
        // We'll generate daily points for the last 30 days or the date range.
        let trendQuery = `
            SELECT 
                DATE(coalesce_date) AS date,
                SUM(revenue) AS revenue,
                SUM(expense) AS expense
            FROM (
                SELECT created_at AS coalesce_date, revenue, 0 AS expense FROM trips ${tripsCond.clause}
                UNION ALL
                SELECT date AS coalesce_date, 0 AS revenue, cost AS expense FROM fuel ${fuelCond.clause}
                UNION ALL
                SELECT service_date AS coalesce_date, 0 AS revenue, cost AS expense FROM maintenance ${maintCond.clause}
                UNION ALL
                SELECT date AS coalesce_date, 0 AS revenue, amount AS expense FROM expenses ${expenseCond.clause}
            ) combined
            WHERE coalesce_date IS NOT NULL
            GROUP BY DATE(coalesce_date)
            ORDER BY DATE(coalesce_date) ASC
        `;
        // Since parameters might differ across subqueries, let's keep it simple.
        // We can query each log individually and aggregate in JS to avoid complex param index alignment.
        const dailyTrips = await pool.query(`SELECT DATE(created_at) as date, SUM(revenue) as revenue FROM trips ${tripsCond.clause} GROUP BY DATE(created_at)`, tripsCond.params);
        const dailyFuel = await pool.query(`SELECT DATE(date) as date, SUM(cost) as fuel FROM fuel ${fuelCond.clause} GROUP BY DATE(date)`, fuelCond.params);
        const dailyMaint = await pool.query(`SELECT DATE(service_date) as date, SUM(cost) as maint FROM maintenance ${maintCond.clause} GROUP BY DATE(service_date)`, maintCond.params);
        const dailyExp = await pool.query(`SELECT DATE(date) as date, SUM(amount) as exp FROM expenses ${expenseCond.clause} GROUP BY DATE(date)`, expenseCond.params);

        const trendMap = {};
        const addPoint = (dateStr, type, val) => {
            if (!dateStr) return;
            const dateOnly = new Date(dateStr).toISOString().split('T')[0];
            if (!trendMap[dateOnly]) {
                trendMap[dateOnly] = { date: dateOnly, revenue: 0, fuel: 0, maintenance: 0, expenses: 0, total_expense: 0 };
            }
            trendMap[dateOnly][type] += parseFloat(val || 0);
            if (type !== 'revenue') {
                trendMap[dateOnly].total_expense += parseFloat(val || 0);
            }
        };

        dailyTrips.rows.forEach(r => addPoint(r.date, 'revenue', r.revenue));
        dailyFuel.rows.forEach(r => addPoint(r.date, 'fuel', r.fuel));
        dailyMaint.rows.forEach(r => addPoint(r.date, 'maintenance', r.maint));
        dailyExp.rows.forEach(r => addPoint(r.date, 'expenses', r.exp));

        const trendData = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

        // 8. Vehicle performance rankings
        const vehicleRankQuery = `
            SELECT 
                v.id, v.registration_no, v.vehicle_name, v.vehicle_type,
                COALESCE(SUM(t.revenue), 0)::decimal AS revenue,
                COALESCE((
                    SELECT SUM(f.cost) FROM fuel f WHERE f.vehicle_id = v.id
                ), 0)::decimal AS fuel_cost,
                COALESCE((
                    SELECT SUM(m.cost) FROM maintenance m WHERE m.vehicle_id = v.id
                ), 0)::decimal AS maintenance_cost,
                COALESCE((
                    SELECT SUM(e.amount) FROM expenses e WHERE e.vehicle_id = v.id
                ), 0)::decimal AS other_cost
            FROM vehicles v
            LEFT JOIN trips t ON t.vehicle_id = v.id
            GROUP BY v.id, v.registration_no, v.vehicle_name, v.vehicle_type
            ORDER BY revenue DESC
            LIMIT 10
        `;
        const vehicleRankRes = await pool.query(vehicleRankQuery);
        const vehicleRankings = vehicleRankRes.rows.map(row => {
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

        res.json({
            summary: {
                total_trips: tripStats.total_trips,
                completed_trips: tripStats.completed_trips,
                total_distance: totalDistance,
                total_revenue: revenue,
                total_fuel_cost: fuelCost,
                total_maintenance_cost: maintenanceCost,
                total_other_expenses: otherExpenses,
                total_expenses: totalOperationalCost,
                profit_loss: profitLoss,
                cost_per_km: costPerKm,
                fuel_efficiency: fuelEfficiency
            },
            categoryBreakdown,
            trendData,
            vehicleRankings
        });

    } catch (err) {
        console.error('Error in getFinancialAnalytics:', err);
        res.status(500).json({ message: 'Server error fetching financial analytics' });
    }
};

exports.getVehicleFinancials = async (req, res) => {
    try {
        const { id } = req.params;
        const { dateFrom, dateTo } = req.query;

        const tripsCond = buildConditions('created_at', id, dateFrom, dateTo, null, 1);
        const tripsRes = await pool.query(`
            SELECT 
                COUNT(*)::int AS total_trips,
                COALESCE(SUM(revenue), 0)::decimal AS revenue,
                COALESCE(SUM(actual_distance), 0)::decimal AS distance,
                COALESCE(SUM(fuel_used), 0)::decimal AS fuel_consumed
            FROM trips
            ${tripsCond.clause}
        `, tripsCond.params);

        const maintCond = buildConditions('service_date', id, dateFrom, dateTo, null, 1);
        const maintRes = await pool.query(`
            SELECT COALESCE(SUM(cost), 0)::decimal AS maintenance_cost
            FROM maintenance
            ${maintCond.clause}
        `, maintCond.params);

        const fuelCond = buildConditions('date', id, dateFrom, dateTo, null, 1);
        const fuelRes = await pool.query(`
            SELECT COALESCE(SUM(cost), 0)::decimal AS fuel_cost
            FROM fuel
            ${fuelCond.clause}
        `, fuelCond.params);

        const expCond = buildConditions('date', id, dateFrom, dateTo, null, 1);
        const expRes = await pool.query(`
            SELECT COALESCE(SUM(amount), 0)::decimal AS other_cost
            FROM expenses
            ${expCond.clause}
        `, expCond.params);

        const revenue = parseFloat(tripsRes.rows[0].revenue);
        const fuel = parseFloat(fuelRes.rows[0].fuel_cost);
        const maintenance = parseFloat(maintRes.rows[0].maintenance_cost);
        const other = parseFloat(expRes.rows[0].other_cost);
        const expenses = fuel + maintenance + other;

        res.json({
            vehicle_id: id,
            total_trips: tripsRes.rows[0].total_trips,
            distance: parseFloat(tripsRes.rows[0].distance),
            fuel_consumed: parseFloat(tripsRes.rows[0].fuel_consumed),
            revenue,
            expenses,
            fuel_cost: fuel,
            maintenance_cost: maintenance,
            other_expenses: other,
            profit: revenue - expenses
        });
    } catch (err) {
        console.error('Error in getVehicleFinancials:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
