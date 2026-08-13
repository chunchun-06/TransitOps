const pool = require('../config/db');

// Get current active fuel price for a fuel type
exports.getCurrentPrice = async (req, res) => {
    try {
        const fuelType = req.query.fuel_type || 'Diesel';
        const result = await pool.query(
            `SELECT * FROM fuel_price
             WHERE fuel_type = $1
               AND effective_from <= CURRENT_DATE
               AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
             ORDER BY effective_from DESC LIMIT 1`,
            [fuelType]
        );

        if (result.rows.length === 0) {
            // Return a default if none found
            return res.json({
                fuel_type: fuelType,
                price_per_liter: 100.0,
                effective_from: new Date().toISOString().split('T')[0],
                is_default: true
            });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error in getCurrentPrice:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all fuel price history
exports.getPriceHistory = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT fp.*, u.username AS created_by_name
             FROM fuel_price fp
             LEFT JOIN users u ON fp.created_by = u.id
             ORDER BY fp.effective_from DESC, fp.created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error in getPriceHistory:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create new fuel price entry (Fleet Manager only)
exports.createPrice = async (req, res) => {
    try {
        const { fuel_type, price_per_liter, effective_from, effective_to, notes } = req.body;

        if (!price_per_liter || parseFloat(price_per_liter) <= 0) {
            return res.status(400).json({ message: 'Price per liter must be greater than 0.' });
        }
        if (!effective_from) {
            return res.status(400).json({ message: 'Effective from date is required.' });
        }

        const result = await pool.query(
            `INSERT INTO fuel_price (fuel_type, price_per_liter, effective_from, effective_to, notes, created_by)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [
                fuel_type || 'Diesel',
                parseFloat(price_per_liter),
                effective_from,
                effective_to || null,
                notes || null,
                req.user?.id || null
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error in createPrice:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update fuel price entry
exports.updatePrice = async (req, res) => {
    try {
        const { id } = req.params;
        const { fuel_type, price_per_liter, effective_from, effective_to, notes } = req.body;

        const result = await pool.query(
            `UPDATE fuel_price
             SET fuel_type = $1, price_per_liter = $2, effective_from = $3, effective_to = $4, notes = $5
             WHERE id = $6 RETURNING *`,
            [fuel_type || 'Diesel', parseFloat(price_per_liter), effective_from, effective_to || null, notes || null, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Fuel price entry not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error in updatePrice:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete fuel price entry
exports.deletePrice = async (req, res) => {
    try {
        await pool.query('DELETE FROM fuel_price WHERE id = $1', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error('Error in deletePrice:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
