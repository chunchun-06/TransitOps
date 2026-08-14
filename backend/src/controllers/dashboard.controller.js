const pool = require('../config/db');

// Helper to get active fuel price
async function getFuelPrice(fuelType) {
    const r = await pool.query(
        `SELECT price_per_liter FROM fuel_price
         WHERE fuel_type = $1 AND effective_from <= CURRENT_DATE
         AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
         ORDER BY effective_from DESC LIMIT 1`,
        [fuelType]
    );
    return r.rows.length > 0 ? parseFloat(r.rows[0].price_per_liter) : 100.0;
}

exports.getDashboardData = async (req, res) => {
    try {
        // TODAY
        const todayRevRes = await pool.query(
            `SELECT COALESCE(SUM(revenue), 0)::float AS revenue FROM trips 
             WHERE status = 'Completed' AND COALESCE(end_time, updated_at)::date = CURRENT_DATE`
        );
        const todayFuelRes = await pool.query(
            `SELECT COALESCE(SUM(cost), 0)::float AS fuel FROM fuel WHERE date::date = CURRENT_DATE`
        );
        const todayMaintRes = await pool.query(
            `SELECT COALESCE(SUM(cost), 0)::float AS maint FROM maintenance WHERE service_date::date = CURRENT_DATE`
        );
        const todayExpRes = await pool.query(
            `SELECT COALESCE(SUM(amount), 0)::float AS exp FROM expenses WHERE date::date = CURRENT_DATE`
        );
        
        const todayRev = todayRevRes.rows[0].revenue;
        const todayCost = todayFuelRes.rows[0].fuel + todayMaintRes.rows[0].maint + todayExpRes.rows[0].exp;
        const todayProfit = Math.max(todayRev - todayCost, 0);
        const todayLoss = Math.max(todayCost - todayRev, 0);

        // THIS WEEK (Last 7 days)
        const weekRevRes = await pool.query(
            `SELECT COALESCE(SUM(revenue), 0)::float AS revenue FROM trips 
             WHERE status = 'Completed' AND COALESCE(end_time, updated_at) >= CURRENT_DATE - INTERVAL '7 days'`
        );
        const weekFuelRes = await pool.query(
            `SELECT COALESCE(SUM(cost), 0)::float AS fuel FROM fuel WHERE date >= CURRENT_DATE - INTERVAL '7 days'`
        );
        const weekMaintRes = await pool.query(
            `SELECT COALESCE(SUM(cost), 0)::float AS maint FROM maintenance WHERE service_date >= CURRENT_DATE - INTERVAL '7 days'`
        );
        const weekExpRes = await pool.query(
            `SELECT COALESCE(SUM(amount), 0)::float AS exp FROM expenses WHERE date >= CURRENT_DATE - INTERVAL '7 days'`
        );
        const weekRev = weekRevRes.rows[0].revenue;
        const weekCost = weekFuelRes.rows[0].fuel + weekMaintRes.rows[0].maint + weekExpRes.rows[0].exp;
        const weekProfit = Math.max(weekRev - weekCost, 0);
        const weekLoss = Math.max(weekCost - weekRev, 0);

        // THIS MONTH (Start of current month)
        const monthRevRes = await pool.query(
            `SELECT COALESCE(SUM(revenue), 0)::float AS revenue FROM trips 
             WHERE status = 'Completed' AND COALESCE(end_time, updated_at) >= DATE_TRUNC('month', CURRENT_DATE)`
        );
        const monthFuelRes = await pool.query(
            `SELECT COALESCE(SUM(cost), 0)::float AS fuel FROM fuel WHERE date >= DATE_TRUNC('month', CURRENT_DATE)`
        );
        const monthMaintRes = await pool.query(
            `SELECT COALESCE(SUM(cost), 0)::float AS maint FROM maintenance WHERE service_date >= DATE_TRUNC('month', CURRENT_DATE)`
        );
        const monthExpRes = await pool.query(
            `SELECT COALESCE(SUM(amount), 0)::float AS exp FROM expenses WHERE date >= DATE_TRUNC('month', CURRENT_DATE)`
        );
        const monthRev = monthRevRes.rows[0].revenue;
        const monthCost = monthFuelRes.rows[0].fuel + monthMaintRes.rows[0].maint + monthExpRes.rows[0].exp;
        const monthProfit = Math.max(monthRev - monthCost, 0);
        const monthLoss = Math.max(monthCost - monthRev, 0);

        // ── 2. Operational metrics ───────────────────────────────────────────
        const tripCountsRes = await pool.query(
            `SELECT 
                COUNT(*)::int AS total_trips,
                COUNT(*) FILTER (WHERE status = 'Dispatched')::int AS active_trips,
                COUNT(*) FILTER (WHERE status = 'Completed')::int AS completed_trips
             FROM trips`
        );
        const tripCounts = tripCountsRes.rows[0];

        const totalDistRes = await pool.query(
            `SELECT COALESCE(SUM(actual_distance), SUM(planned_distance), 0)::float AS total_distance FROM trips WHERE status = 'Completed'`
        );
        const totalDistance = totalDistRes.rows[0].total_distance;

        // Fuel and maintenance totals
        const fuelTotalRes = await pool.query(`SELECT COALESCE(SUM(cost), 0)::float AS total FROM fuel`);
        const maintTotalRes = await pool.query(`SELECT COALESCE(SUM(cost), 0)::float AS total FROM maintenance`);
        const tollTotalRes = await pool.query(`SELECT COALESCE(SUM(toll_amount), 0)::float AS total FROM trips WHERE status = 'Completed'`);

        // ── 3. Live Fuel Prices ──────────────────────────────────────────────
        const dieselPrice = await getFuelPrice('Diesel');
        const petrolPrice = await getFuelPrice('Petrol');
        const cngPrice = await getFuelPrice('CNG');

        res.json({
            financial: {
                today: { revenue: todayRev, expenses: todayCost, profit: todayProfit, loss: todayLoss },
                this_week: { revenue: weekRev, expenses: weekCost, profit: weekProfit, loss: weekLoss },
                this_month: { revenue: monthRev, expenses: monthCost, profit: monthProfit, loss: monthLoss }
            },
            operational: {
                total_trips: tripCounts.total_trips,
                active_trips: tripCounts.active_trips,
                completed_trips: tripCounts.completed_trips,
                total_distance: totalDistance,
                fuel_expense: fuelTotalRes.rows[0].total,
                maintenance_expense: maintTotalRes.rows[0].total,
                toll_expense: tollTotalRes.rows[0].total
            },
            fuel_prices: {
                Diesel: { price: dieselPrice, updated_at: new Date().toISOString() },
                Petrol: { price: petrolPrice, updated_at: new Date().toISOString() },
                CNG: { price: cngPrice, updated_at: new Date().toISOString() }
            }
        });
    } catch (err) {
        console.error('Error in getDashboardData:', err);
        res.status(500).json({ message: 'Server error fetching dashboard metrics.' });
    }
};
