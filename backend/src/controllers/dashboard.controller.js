const FinancialAnalyticsService = require('../services/financial_analytics.service');
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
        const filters = {
            period: req.query.period,
            startDate: req.query.startDate || req.query.dateFrom,
            endDate: req.query.endDate || req.query.dateTo,
            vehicleId: req.query.vehicleId,
            driverId: req.query.driverId
        };

        const overview = await FinancialAnalyticsService.getDashboardOverview(filters);

        // Fetch fuel prices
        const dieselPrice = await getFuelPrice('Diesel');
        const petrolPrice = await getFuelPrice('Petrol');
        const cngPrice = await getFuelPrice('CNG');

        res.json({
            ...overview,
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
