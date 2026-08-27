const pool = require('../config/db');
const FuelPriceService = require('../services/fuel_price.service');

// Get current active fuel price for a fuel type (from Today's Live Market Rate)
exports.getCurrentPrice = async (req, res) => {
    try {
        const fuelType = req.query.fuel_type || 'Diesel';
        
        // 1. Query today's Live Market Rate from fuel_prices table
        const marketRes = await pool.query(
            `SELECT * FROM fuel_prices 
             WHERE LOWER(fuel_type::text) = LOWER($1) 
             ORDER BY effective_date DESC, fetched_at DESC 
             LIMIT 1`,
            [fuelType]
        );

        if (marketRes.rows.length > 0) {
            const mRow = marketRes.rows[0];
            return res.json({
                fuel_type: mRow.fuel_type,
                price_per_liter: parseFloat(mRow.price_per_litre),
                effective_from: mRow.effective_date,
                source: mRow.source || 'Live Market Rate'
            });
        }

        // 2. Query System Base Rate from fuel_price table as fallback
        const result = await pool.query(
            `SELECT * FROM fuel_price 
             WHERE LOWER(fuel_type::text) = LOWER($1) 
             ORDER BY effective_from DESC, created_at DESC 
             LIMIT 1`,
            [fuelType]
        );

        if (result.rows.length > 0) {
            const row = result.rows[0];
            return res.json({
                fuel_type: row.fuel_type,
                price_per_liter: parseFloat(row.price_per_liter),
                effective_from: row.effective_from,
                notes: row.notes,
                created_at: row.created_at,
                source: 'System Base Rate'
            });
        }

        // 3. Fallback defaults if no records in DB
        const defaults = { Diesel: 99.55, Petrol: 107.76, CNG: 97.00, Electric: 9.50 };
        const normKey = fuelType.charAt(0).toUpperCase() + fuelType.slice(1).toLowerCase();
        return res.json({
            fuel_type: fuelType,
            price_per_liter: defaults[normKey] || 100.00,
            effective_from: new Date().toISOString(),
            source: 'Default Market Reference'
        });
    } catch (err) {
        console.error('Error in getCurrentPrice:', err);
        res.status(500).json({ success: false, message: err.message || 'Server error' });
    }
};

// Get all fuel price history (System Base Rates)
exports.getPriceHistory = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM fuel_price ORDER BY effective_from DESC, created_at DESC`
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Error in getPriceHistory:', err);
        res.status(500).json({ success: false, message: 'Server error fetching price history' });
    }
};

// Create new system base fuel price entry (Fleet Manager / Admin)
exports.createPrice = async (req, res) => {
    try {
        const { fuel_type, price_per_liter, price_per_litre, effective_from, effective_date, notes } = req.body;

        if (!fuel_type || typeof fuel_type !== 'string' || !fuel_type.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Valid fuel_type string is required (e.g. Diesel, Petrol, CNG, Electric).'
            });
        }

        const rawPrice = price_per_liter !== undefined ? price_per_liter : price_per_litre;
        const price = parseFloat(rawPrice);
        if (isNaN(price) || price <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid positive price_per_liter is required.'
            });
        }

        const effDate = effective_from || effective_date || new Date().toISOString();
        const normalizedType = fuel_type.trim().charAt(0).toUpperCase() + fuel_type.trim().slice(1);

        let createdBy = null;
        if (req.user?.id) {
            try {
                const uRes = await pool.query('SELECT id FROM users WHERE id = $1', [req.user.id]);
                if (uRes.rows.length > 0) {
                    createdBy = req.user.id;
                }
            } catch (uErr) {
                // Ignore user check error
            }
        }

        const result = await pool.query(
            `INSERT INTO fuel_price (fuel_type, price_per_liter, effective_from, notes, created_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [normalizedType, price, effDate, notes || null, createdBy]
        );

        const newRow = result.rows[0];
        return res.status(201).json({
            success: true,
            message: 'Fuel price published successfully',
            data: {
                id: newRow.id,
                fuel_type: newRow.fuel_type,
                price_per_liter: parseFloat(newRow.price_per_liter),
                effective_from: newRow.effective_from,
                created_at: newRow.created_at
            }
        });
    } catch (err) {
        console.error('Error in createPrice:', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Failed to publish fuel price'
        });
    }
};

// Update system base fuel price entry
exports.updatePrice = async (req, res) => {
    try {
        const { id } = req.params;
        const { price_per_liter, price_per_litre, notes } = req.body;
        const rawPrice = price_per_liter !== undefined ? price_per_liter : price_per_litre;
        const price = parseFloat(rawPrice);

        if (isNaN(price) || price <= 0) {
            return res.status(400).json({ success: false, message: 'Valid positive price_per_liter is required.' });
        }

        const result = await pool.query(
            `UPDATE fuel_price
             SET price_per_liter = $1, notes = COALESCE($2, notes)
             WHERE id = $3 RETURNING *`,
            [price, notes || null, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Base fuel price record not found' });
        }

        return res.json({
            success: true,
            message: 'Fuel price updated successfully',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Error in updatePrice:', err);
        return res.status(500).json({ success: false, message: 'Failed to update fuel price' });
    }
};

// Delete fuel price entry
exports.deletePrice = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM fuel_price WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Fuel price record not found' });
        }
        return res.json({ success: true, message: 'Fuel price deleted successfully' });
    } catch (err) {
        console.error('Error in deletePrice:', err);
        return res.status(500).json({ success: false, message: 'Failed to delete fuel price' });
    }
};
