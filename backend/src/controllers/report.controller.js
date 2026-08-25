const FinancialAnalyticsService = require('../services/financial_analytics.service');

exports.getDashboardAnalytics = async (req, res) => {
    try {
        const filters = {
            period: req.query.period,
            startDate: req.query.startDate || req.query.dateFrom,
            endDate: req.query.endDate || req.query.dateTo,
            vehicleId: req.query.vehicleId,
            driverId: req.query.driverId,
            status: req.query.status
        };

        const overview = await FinancialAnalyticsService.getDashboardOverview(filters);
        res.json(overview.operational);
    } catch (err) {
        console.error("Error in getDashboardAnalytics:", err);
        res.status(500).json({ message: 'Failed to fetch report analytics data', error: err.message });
    }
};

exports.getCharts = async (req, res) => {
    try {
        const filters = {
            period: req.query.period,
            startDate: req.query.startDate || req.query.dateFrom,
            endDate: req.query.endDate || req.query.dateTo,
            vehicleId: req.query.vehicleId,
            driverId: req.query.driverId,
            status: req.query.status
        };

        const charts = await FinancialAnalyticsService.getChartsData(filters);
        res.json(charts);
    } catch (err) {
        console.error("Error in getCharts:", err);
        res.status(500).json({ message: 'Failed to fetch report charts data', error: err.message });
    }
};

exports.getInsights = async (req, res) => {
    try {
        const filters = {
            period: req.query.period,
            startDate: req.query.startDate || req.query.dateFrom,
            endDate: req.query.endDate || req.query.dateTo,
            vehicleId: req.query.vehicleId,
            driverId: req.query.driverId,
            status: req.query.status
        };

        const insights = await FinancialAnalyticsService.getInsights(filters);
        res.json(insights);
    } catch (err) {
        console.error("Error in getInsights:", err);
        res.status(500).json({ message: 'Failed to fetch report insights data', error: err.message });
    }
};
