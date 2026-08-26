const FuelPriceService = require('../services/fuel_price.service');

// Get current active fuel price for a fuel type
exports.getCurrentPrice = async (req, res) => {
    try {
        const city = req.query.city || 'Chennai';
        const state = req.query.state || 'Tamil Nadu';
        const fuelType = req.query.fuel_type || 'Diesel';
        
        const priceData = await FuelPriceService.getCurrentFuelPrice({ city, state, fuelType });
        
        res.json({
            fuel_type: priceData.fuelType,
            price_per_liter: priceData.pricePerLitre,
            effective_from: priceData.effectiveDate,
            source: priceData.source,
            is_stale: priceData.isStale,
            fetched_at: priceData.fetchedAt,
            city: priceData.city
        });
    } catch (err) {
        console.error('Error in getCurrentPrice:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
};

// Get all fuel price history
exports.getPriceHistory = async (req, res) => {
    // Keep this or adapt it for historical view if needed.
    // We will just read from the new fuel_prices table instead of the old one.
    const pool = require('../config/db');
    try {
        const result = await pool.query(
            `SELECT *
             FROM fuel_prices
             ORDER BY effective_date DESC, created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error in getPriceHistory:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create new fuel price entry (Fleet Manager only)
exports.createPrice = async (req, res) => {
    const {
        fuel_type,
        price_per_liter,
        effective_from
    } = req.body;

    try {
        if (!fuel_type || !price_per_liter || !effective_from) {
            return res.status(400).json({
                message: "fuel_type, price_per_liter and effective_from are required"
            });
        }

        const result = await pool.query(
            `
            INSERT INTO fuel_prices (
                fuel_type,
                country,
                state,
                city,
                price_per_litre,
                currency,
                effective_date,
                source,
                fetched_at,
                created_at,
                updated_at
            )
            VALUES (
                $1,
                'India',
                'Tamil Nadu',
                'Chennai',
                $2,
                'INR',
                $3,
                'Manual',
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            RETURNING *
            `,
            [
                fuel_type,
                price_per_liter,
                effective_from
            ]
        );

        return res.status(201).json({
            message: "Fuel price published successfully",
            data: result.rows[0]
        });

    } catch (err) {
        console.error("Error creating fuel price:", err);

        return res.status(500).json({
            message: "Failed to create fuel price"
        });
    }
};
// Update fuel price entry
exports.updatePrice = async (req, res) => {
    return res.status(400).json({ message: 'Manual price updates are disabled.' });
};

// Delete fuel price entry
exports.deletePrice = async (req, res) => {
    return res.status(400).json({ message: 'Manual price deletion is disabled.' });
};
