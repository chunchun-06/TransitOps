const pool = require('../config/db');

exports.getDrivers = async (req, res) => {
    try {
        const query = `
            SELECT 
                d.*,
                u.email,
                (SELECT COUNT(*) FROM trips t WHERE t.driver_id = d.id) AS trip_count,
                (
                    SELECT v.registration_no 
                    FROM trips t 
                    JOIN vehicles v ON t.vehicle_id = v.id 
                    WHERE t.driver_id = d.id AND t.status IN ('Dispatched', 'Draft')
                    ORDER BY t.created_at DESC 
                    LIMIT 1
                ) AS assigned_vehicle
            FROM drivers d
            LEFT JOIN users u ON d.user_id = u.id
            ORDER BY d.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getAvailableDrivers = async (req, res) => {
    try {
        const query = `
            SELECT d.*, u.email 
            FROM drivers d
            LEFT JOIN users u ON d.user_id = u.id
            WHERE d.status = 'Available'
              AND (d.license_expiry IS NULL OR d.license_expiry >= CURRENT_DATE)
            ORDER BY d.name ASC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error("Error in getAvailableDrivers:", err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getDriverById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM drivers WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Driver not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createDriver = async (req, res) => {
    try {
        const { name, license_number, license_category, license_expiry, contact_number, safety_score, status } = req.body;
        
        // Duplicate license check
        const dupCheck = await pool.query('SELECT id FROM drivers WHERE license_number = $1', [license_number]);
        if (dupCheck.rows.length > 0) {
            return res.status(400).json({ message: 'License number must be unique' });
        }

        // Expiry check - mark Suspended if expired, else Available unless explicitly stated
        let finalStatus = status || 'Available';
        if (license_expiry && new Date(license_expiry) < new Date()) {
            finalStatus = 'Suspended';
        }

        const result = await pool.query(
            `INSERT INTO drivers (name, license_number, license_category, license_expiry, contact_number, safety_score, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [name, license_number, license_category || null, license_expiry || null, contact_number || null, safety_score || 100, finalStatus]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            return res.status(400).json({ message: 'License number must be unique' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateDriver = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, license_number, license_category, license_expiry, contact_number, safety_score, status } = req.body;

        const dupCheck = await pool.query('SELECT id FROM drivers WHERE license_number = $1 AND id != $2', [license_number, id]);
        if (dupCheck.rows.length > 0) {
            return res.status(400).json({ message: 'License number must be unique' });
        }

        let finalStatus = status;
        if (license_expiry && new Date(license_expiry) < new Date()) {
            finalStatus = 'Suspended'; // Auto-suspend expired licenses
        }

        const result = await pool.query(
            `UPDATE drivers 
             SET name = $1, license_number = $2, license_category = $3, license_expiry = $4, contact_number = $5, safety_score = $6, status = $7, updated_at = CURRENT_TIMESTAMP
             WHERE id = $8 RETURNING *`,
            [name, license_number, license_category || null, license_expiry || null, contact_number || null, safety_score, finalStatus, id]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: 'Driver not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            return res.status(400).json({ message: 'License number must be unique' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteDriver = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM drivers WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Driver not found' });
        res.json({ message: 'Driver deleted successfully' });
    } catch (err) {
        console.error(err);
        if (err.code === '23503') {
            return res.status(400).json({ message: 'Cannot delete driver as they are referenced in active trips.' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const driver = await pool.query('SELECT license_expiry FROM drivers WHERE id = $1', [id]);
        if (driver.rows.length === 0) return res.status(404).json({ message: 'Driver not found' });
        
        if (status === 'Available' && driver.rows[0].license_expiry && new Date(driver.rows[0].license_expiry) < new Date()) {
            return res.status(400).json({ message: 'Cannot mark driver as Available. License is expired.' });
        }

        const result = await pool.query('UPDATE drivers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *', [status, id]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.bulkDelete = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'No driver IDs provided' });
        
        const result = await pool.query('DELETE FROM drivers WHERE id = ANY($1::uuid[]) RETURNING *', [ids]);
        res.json({ message: `${result.rowCount} drivers deleted` });
    } catch (err) {
        console.error(err);
        if (err.code === '23503') {
            return res.status(400).json({ message: 'Cannot delete some drivers as they are referenced in trips.' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

exports.bulkUpdateStatus = async (req, res) => {
    try {
        const { ids, status } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'No driver IDs provided' });
        if (!status) return res.status(400).json({ message: 'No status provided' });

        const result = await pool.query('UPDATE drivers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2::uuid[]) RETURNING *', [status, ids]);
        res.json({ message: `${result.rowCount} drivers updated` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
