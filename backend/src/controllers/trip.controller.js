const pool = require('../config/db');

exports.getTrips = async (req, res) => {
    try {
        const query = `
            SELECT t.*, v.registration_no, v.vehicle_name, d.name AS driver_name
            FROM trips t
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            LEFT JOIN drivers d ON t.driver_id = d.id
            ORDER BY t.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createTrip = async (req, res) => {
    const { vehicle_id, driver_id, source, destination, cargo_weight, planned_distance } = req.body;
    try {
        await pool.query('BEGIN');
        
        // Create trip
        const insertQuery = `
            INSERT INTO trips (vehicle_id, driver_id, source, destination, cargo_weight, planned_distance, status, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, 'Dispatched', $7) RETURNING *
        `;
        const result = await pool.query(insertQuery, [
            vehicle_id, 
            driver_id, 
            source || '', 
            destination || '', 
            cargo_weight ? Number(cargo_weight) : null, 
            planned_distance ? Number(planned_distance) : null,
            req.user?.id || null
        ]);
        
        // Update vehicle and driver status
        await pool.query("UPDATE vehicles SET status = 'On Trip' WHERE id = $1", [vehicle_id]);
        await pool.query("UPDATE drivers SET status = 'On Trip' WHERE id = $1", [driver_id]);
        
        await pool.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateTrip = async (req, res) => {
    const { id } = req.params;
    const { status, actual_distance, final_odometer, fuel_used, revenue } = req.body;
    try {
        await pool.query('BEGIN');
        
        const currentTrip = await pool.query('SELECT * FROM trips WHERE id = $1', [id]);
        if (currentTrip.rows.length === 0) {
            return res.status(404).json({ message: 'Trip not found' });
        }
        
        const oldStatus = currentTrip.rows[0].status;
        const vehicle_id = currentTrip.rows[0].vehicle_id;
        const driver_id = currentTrip.rows[0].driver_id;
        
        const updateQuery = `
            UPDATE trips 
            SET status = COALESCE($1, status), 
                actual_distance = COALESCE($2, actual_distance), 
                final_odometer = COALESCE($3, final_odometer), 
                fuel_used = COALESCE($4, fuel_used), 
                revenue = COALESCE($5, revenue),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6 RETURNING *
        `;
        const result = await pool.query(updateQuery, [status, actual_distance, final_odometer, fuel_used, revenue, id]);
        
        if (oldStatus !== 'Completed' && oldStatus !== 'Cancelled' && (status === 'Completed' || status === 'Cancelled')) {
            await pool.query("UPDATE vehicles SET status = 'Available' WHERE id = $1", [vehicle_id]);
            await pool.query("UPDATE drivers SET status = 'Available' WHERE id = $1", [driver_id]);
        } else if ((oldStatus === 'Completed' || oldStatus === 'Cancelled') && (status === 'Dispatched' || status === 'In Progress')) {
            await pool.query("UPDATE vehicles SET status = 'On Trip' WHERE id = $1", [vehicle_id]);
            await pool.query("UPDATE drivers SET status = 'On Trip' WHERE id = $1", [driver_id]);
        }
        
        await pool.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};


exports.deleteTrip = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('BEGIN');
        const trip = await pool.query('SELECT * FROM trips WHERE id = $1', [id]);
        if (trip.rows.length > 0) {
            const { status, vehicle_id, driver_id } = trip.rows[0];
            if (status !== 'Completed' && status !== 'Cancelled') {
                await pool.query("UPDATE vehicles SET status = 'Available' WHERE id = $1", [vehicle_id]);
                await pool.query("UPDATE drivers SET status = 'Available' WHERE id = $1", [driver_id]);
            }
            await pool.query('DELETE FROM trips WHERE id = $1', [id]);
        }
        await pool.query('COMMIT');
        res.json({ message: 'Trip deleted' });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
