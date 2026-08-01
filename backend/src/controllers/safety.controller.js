const pool = require('../config/db');

// ── GET all safety records (or one by driver_id) ──────────────────────────
exports.getDriverSafety = async (req, res) => {
    try {
        const { driver_id } = req.query;
        let query = `
            SELECT ds.*, d.name AS driver_name
            FROM driver_safety ds
            JOIN drivers d ON ds.driver_id = d.id
        `;
        const params = [];
        if (driver_id) {
            query += ' WHERE ds.driver_id = $1';
            params.push(driver_id);
        }
        query += ' ORDER BY ds.updated_at DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('getDriverSafety error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ── GET single safety record by driver_id ─────────────────────────────────
exports.getDriverSafetyByDriverId = async (req, res) => {
    try {
        const { id } = req.params; // driver_id
        const result = await pool.query(
            `SELECT ds.*, d.name AS driver_name
             FROM driver_safety ds
             JOIN drivers d ON ds.driver_id = d.id
             WHERE ds.driver_id = $1
             LIMIT 1`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'No safety record found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('getDriverSafetyByDriverId error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ── CREATE or UPDATE (upsert) safety record for a driver ─────────────────
exports.upsertDriverSafety = async (req, res) => {
    try {
        const {
            driver_id,
            license_expiry_date,
            trip_failures,
            total_accidents,
            // Accident details stored as JSON array
            accident_records,
            // Goods safety
            goods_damaged_incidents,
            goods_damage_notes,
            // Additional notes
            notes,
        } = req.body;

        if (!driver_id) return res.status(400).json({ message: 'driver_id is required' });

        // Check if record already exists
        const existing = await pool.query(
            'SELECT id FROM driver_safety WHERE driver_id = $1',
            [driver_id]
        );

        const accidentJson = accident_records ? JSON.stringify(accident_records) : null;

        if (existing.rows.length > 0) {
            // UPDATE
            const result = await pool.query(
                `UPDATE driver_safety SET
                    license_expiry_date = $1,
                    trip_failures       = $2,
                    total_accidents     = $3,
                    accident_records    = $4,
                    goods_damaged_incidents = $5,
                    goods_damage_notes  = $6,
                    notes               = $7,
                    updated_at          = CURRENT_TIMESTAMP
                 WHERE driver_id = $8
                 RETURNING *`,
                [
                    license_expiry_date || null,
                    trip_failures       || 0,
                    total_accidents     || 0,
                    accidentJson,
                    goods_damaged_incidents || 0,
                    goods_damage_notes  || null,
                    notes               || null,
                    driver_id,
                ]
            );
            return res.json(result.rows[0]);
        } else {
            // INSERT
            const result = await pool.query(
                `INSERT INTO driver_safety (
                    driver_id, license_expiry_date, trip_failures,
                    total_accidents, accident_records,
                    goods_damaged_incidents, goods_damage_notes, notes
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
                [
                    driver_id,
                    license_expiry_date || null,
                    trip_failures       || 0,
                    total_accidents     || 0,
                    accidentJson,
                    goods_damaged_incidents || 0,
                    goods_damage_notes  || null,
                    notes               || null,
                ]
            );
            return res.status(201).json(result.rows[0]);
        }
    } catch (err) {
        console.error('upsertDriverSafety error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ── DELETE a safety record ────────────────────────────────────────────────
exports.deleteDriverSafety = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM driver_safety WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ message: 'Safety record not found' });
        res.json({ message: 'Safety record deleted' });
    } catch (err) {
        console.error('deleteDriverSafety error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
