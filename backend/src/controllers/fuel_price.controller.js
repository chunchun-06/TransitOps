const pool = require('../config/db');
const FuelPriceService = require('../services/fuel_price.service');

// Get current active fuel price for a fuel type
exports.getCurrentPrice = async (req, res) => {
    try {
        const city = req.query.city || 'Chennai';
        const state = req.query.state || 'Tamil Nadu';
        const fuelType = req.query.fuel_type || 'Diesel';
        
        const priceData = await FuelPriceService.getCurrentFuelPrice({ city, state, fuelType });
        
        res.json({
            success: true,
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
        res.status(500).json({ success: false, message: err.message || 'Server error' });
    }
};

// Get all fuel price history
exports.getPriceHistory = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT *
             FROM fuel_prices
             ORDER BY effective_date DESC, created_at DESC`
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Error in getPriceHistory:', err);
        res.status(500).json({ success: false, message: 'Server error fetching price history' });
    }
};

// Create / Publish new fuel price entry (Fleet Manager & Admin allowed)
exports.createPrice = async (req, res) => {
    const {
        fuel_type,
        price_per_liter,
        effective_from,
        city,
        state,
        country
    } = req.body;

    try {
        if (!fuel_type || price_per_liter === undefined || price_per_liter === null || !effective_from) {
            return res.status(400).json({
                success: false,
                message: "fuel_type, price_per_liter, and effective_from are required"
            });
        }

        const numericPrice = parseFloat(price_per_liter);
        if (isNaN(numericPrice) || numericPrice <= 0) {
            return res.status(400).json({
                success: false,
                message: "price_per_liter must be a positive number"
            });
        }

        const cityVal = city || 'Chennai';
        const stateVal = state || 'Tamil Nadu';
        const countryVal = country || 'India';

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
                $2,
                $3,
                $4,
                $5,
                'INR',
                $6,
                'Manual',
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (city, fuel_type, effective_date) 
            DO UPDATE SET 
                price_per_litre = EXCLUDED.price_per_litre,
                source = 'Manual',
                fetched_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
            `,
            [
                fuel_type,
                countryVal,
                stateVal,
                cityVal,
                numericPrice,
                effective_from
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Fuel price published successfully",
            data: result.rows[0]
        });

    } catch (err) {
        console.error("Error creating fuel price:", err);

        return res.status(500).json({
            success: false,
            message: err.message || "Failed to create fuel price"
        });
    }
};

// Update fuel price entry
exports.updatePrice = async (req, res) => {
    return res.status(400).json({ success: false, message: 'Manual price updates are managed via Publish Rate.' });
};

// Delete fuel price entry
exports.deletePrice = async (req, res) => {
    return res.status(400).json({ success: false, message: 'Manual price deletion is disabled.' });
};
