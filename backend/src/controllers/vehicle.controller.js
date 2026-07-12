const pool = require('../config/db');

exports.getVehicles = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM vehicles ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getVehicleById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM vehicles WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Vehicle not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getAvailableVehicles = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM vehicles WHERE status = 'Available' ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createVehicle = async (req, res) => {
    try {
        const { registration_no, vehicle_name, vehicle_type, max_load_capacity, odometer, acquisition_cost, status } = req.body;
        
        // Duplicate check
        const dupCheck = await pool.query('SELECT id FROM vehicles WHERE registration_no = $1', [registration_no]);
        if (dupCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Registration number must be unique' });
        }

        const result = await pool.query(
            `INSERT INTO vehicles (registration_no, vehicle_name, vehicle_type, max_load_capacity, odometer, acquisition_cost, status, created_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [registration_no, vehicle_name, vehicle_type, max_load_capacity || null, odometer || 0, acquisition_cost || null, status || 'Available', req.user?.id || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // Postgres unique constraint violation
            return res.status(400).json({ message: 'Registration number must be unique' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        const { registration_no, vehicle_name, vehicle_type, max_load_capacity, odometer, acquisition_cost, status } = req.body;

        // Duplicate check for other vehicles
        const dupCheck = await pool.query('SELECT id FROM vehicles WHERE registration_no = $1 AND id != $2', [registration_no, id]);
        if (dupCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Registration number must be unique' });
        }

        const result = await pool.query(
            `UPDATE vehicles 
             SET registration_no = $1, vehicle_name = $2, vehicle_type = $3, max_load_capacity = $4, odometer = $5, acquisition_cost = $6, status = $7, updated_at = CURRENT_TIMESTAMP, updated_by = $8
             WHERE id = $9 RETURNING *`,
            [registration_no, vehicle_name, vehicle_type, max_load_capacity || null, odometer || 0, acquisition_cost || null, status || 'Available', req.user?.id || null, id]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: 'Vehicle not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            return res.status(400).json({ message: 'Registration number must be unique' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM vehicles WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Vehicle not found' });
        res.json({ message: 'Vehicle deleted successfully' });
    } catch (err) {
        console.error(err);
        if (err.code === '23503') { // Foreign key constraint violation
            return res.status(400).json({ message: 'Cannot delete vehicle as it is referenced in trips or logs.' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

exports.bulkDelete = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'No vehicle IDs provided' });
        
        const result = await pool.query('DELETE FROM vehicles WHERE id = ANY($1::uuid[]) RETURNING *', [ids]);
        res.json({ message: `${result.rowCount} vehicles deleted` });
    } catch (err) {
        console.error(err);
        if (err.code === '23503') {
            return res.status(400).json({ message: 'Cannot delete some vehicles as they are referenced in trips or logs.' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

exports.bulkUpdateStatus = async (req, res) => {
    try {
        const { ids, status } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'No vehicle IDs provided' });
        if (!status) return res.status(400).json({ message: 'No status provided' });

        const result = await pool.query('UPDATE vehicles SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2::uuid[]) RETURNING *', [status, ids]);
        res.json({ message: `${result.rowCount} vehicles updated` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
