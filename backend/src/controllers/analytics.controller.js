const FinancialAnalyticsService = require('../services/financial_analytics.service');
const pool = require('../config/db');

exports.getFinancialAnalytics = async (req, res) => {
    try {
        const filters = {
            period: req.query.period,
            startDate: req.query.startDate || req.query.dateFrom,
            endDate: req.query.endDate || req.query.dateTo,
            vehicleId: req.query.vehicleId,
            driverId: req.query.driverId
        };

        const metrics = await FinancialAnalyticsService.getFinancialMetrics(filters);
        const charts = await FinancialAnalyticsService.getChartsData(filters);
        const vehicleRankings = await FinancialAnalyticsService.getVehicleRankings(filters);

        // Build Category Breakdown for Financials Page
        const categoryBreakdown = charts.expense_breakdown.map(e => ({
            name: e.category,
            value: e.amount
        })).filter(c => c.value > 0);

        // Fetch daily trend points
        const dateMap = {};

        const tripsRes = await pool.query(`
            SELECT DATE(COALESCE(end_time, start_time, created_at))::text AS date, SUM(revenue)::float AS revenue
            FROM trips WHERE status = 'Completed' ${filters.vehicleId ? 'AND vehicle_id = $1' : ''}
            GROUP BY DATE(COALESCE(end_time, start_time, created_at)) ORDER BY date ASC
        `, filters.vehicleId ? [filters.vehicleId] : []);

        const fuelRes = await pool.query(`
            SELECT DATE(date)::text AS date, SUM(cost)::float AS cost
            FROM fuel ${filters.vehicleId ? 'WHERE vehicle_id = $1' : ''}
            GROUP BY DATE(date) ORDER BY date ASC
        `, filters.vehicleId ? [filters.vehicleId] : []);

        const maintRes = await pool.query(`
            SELECT DATE(service_date)::text AS date, SUM(cost)::float AS cost
            FROM maintenance ${filters.vehicleId ? 'WHERE vehicle_id = $1' : ''}
            GROUP BY DATE(service_date) ORDER BY date ASC
        `, filters.vehicleId ? [filters.vehicleId] : []);

        const expRes = await pool.query(`
            SELECT DATE(date)::text AS date, SUM(amount)::float AS cost
            FROM expenses WHERE LOWER(category) NOT IN ('fuel', 'maintenance')
            ${filters.vehicleId ? 'AND vehicle_id = $1' : ''}
            GROUP BY DATE(date) ORDER BY date ASC
        `, filters.vehicleId ? [filters.vehicleId] : []);

        const addTrend = (d, rev, exp) => {
            if (!d) return;
            if (!dateMap[d]) dateMap[d] = { date: d, revenue: 0, total_expense: 0 };
            dateMap[d].revenue += rev;
            dateMap[d].total_expense += exp;
        };

        tripsRes.rows.forEach(r => addTrend(r.date, r.revenue || 0, 0));
        fuelRes.rows.forEach(r => addTrend(r.date, 0, r.cost || 0));
        maintRes.rows.forEach(r => addTrend(r.date, 0, r.cost || 0));
        expRes.rows.forEach(r => addTrend(r.date, 0, r.cost || 0));

        const sortedTrend = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

        res.json({
            summary: {
                total_trips: metrics.total_trips,
                completed_trips: metrics.completed_trips,
                total_distance: metrics.total_distance,
                total_revenue: metrics.total_revenue,
                total_fuel_cost: metrics.total_fuel_cost,
                total_maintenance_cost: metrics.total_maintenance_cost,
                total_toll_cost: metrics.total_toll_cost,
                total_other_expenses: metrics.total_other_expenses,
                total_expenses: metrics.total_expenses,
                profit_loss: metrics.net_result,
                profit: metrics.profit,
                loss: metrics.loss,
                cost_per_km: metrics.cost_per_km,
                fuel_efficiency: metrics.fuel_efficiency
            },
            categoryBreakdown,
            trendData: sortedTrend,
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
        const metrics = await FinancialAnalyticsService.getFinancialMetrics({
            ...req.query,
            vehicleId: id
        });

        res.json({
            vehicle_id: id,
            total_trips: metrics.total_trips,
            completed_trips: metrics.completed_trips,
            distance: metrics.total_distance,
            revenue: metrics.total_revenue,
            expenses: metrics.total_expenses,
            fuel_cost: metrics.total_fuel_cost,
            maintenance_cost: metrics.total_maintenance_cost,
            toll_cost: metrics.total_toll_cost,
            other_expenses: metrics.total_other_expenses,
            profit: metrics.profit,
            loss: metrics.loss,
            net_result: metrics.net_result
        });
    } catch (err) {
        console.error('Error in getVehicleFinancials:', err);
        res.status(500).json({ message: 'Server error fetching vehicle financials' });
    }
};
