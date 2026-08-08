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

const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

exports.createTrip = async (req, res) => {
    const { vehicle_id, driver_id, source, destination, cargo_weight, planned_distance } = req.body;
    
    if (!vehicle_id || !driver_id) {
        return res.status(400).json({ message: 'Both vehicle and driver must be selected.' });
    }

    if (!isUUID(vehicle_id)) {
        return res.status(400).json({ message: 'Invalid vehicle ID format.' });
    }

    if (!isUUID(driver_id)) {
        return res.status(400).json({ message: 'Invalid driver ID format.' });
    }

    // Resolve real authenticated user ID from database for created_by foreign key
    let createdBy = null;
    const reqUserId = req.user?.id || req.user?.userId || req.user?.sub;
    const reqUserEmail = req.user?.email;

    if (reqUserId && isUUID(reqUserId)) {
        const uCheck = await pool.query('SELECT id FROM users WHERE id = $1', [reqUserId]);
        if (uCheck.rows.length > 0) {
            createdBy = uCheck.rows[0].id;
        }
    }

    if (!createdBy && reqUserEmail) {
        const uCheckEmail = await pool.query('SELECT id FROM users WHERE email = $1', [reqUserEmail]);
        if (uCheckEmail.rows.length > 0) {
            createdBy = uCheckEmail.rows[0].id;
        }
    }

    if (!createdBy && req.body.created_by && isUUID(req.body.created_by)) {
        const uCheckBody = await pool.query('SELECT id FROM users WHERE id = $1', [req.body.created_by]);
        if (uCheckBody.rows.length > 0) {
            createdBy = uCheckBody.rows[0].id;
        }
    }

    if (!createdBy) {
        const firstUser = await pool.query('SELECT id FROM users ORDER BY created_at ASC LIMIT 1');
        if (firstUser.rows.length > 0) {
            createdBy = firstUser.rows[0].id;
        }
    }

    try {
        await pool.query('BEGIN');
        
        // 1. Check vehicle existence and status
        const vRes = await pool.query('SELECT id, registration_no, vehicle_name, status FROM vehicles WHERE id = $1 FOR UPDATE', [vehicle_id]);
        if (vRes.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ message: 'Selected vehicle does not exist.' });
        }
        const vehicle = vRes.rows[0];
        if (vehicle.status !== 'Available') {
            await pool.query('ROLLBACK');
            return res.status(400).json({ message: `Vehicle ${vehicle.vehicle_name} (${vehicle.registration_no}) is currently ${vehicle.status} and unavailable for assignment.` });
        }

        // Check if vehicle has an active trip
        const activeVTrip = await pool.query("SELECT id FROM trips WHERE vehicle_id = $1 AND status IN ('Dispatched', 'In Progress', 'Draft')", [vehicle_id]);
        if (activeVTrip.rows.length > 0) {
            await pool.query('ROLLBACK');
            return res.status(400).json({ message: `Vehicle ${vehicle.vehicle_name} (${vehicle.registration_no}) is already assigned to an active trip.` });
        }

        // 2. Check driver existence and status
        const dRes = await pool.query('SELECT id, name, status FROM drivers WHERE id = $1 FOR UPDATE', [driver_id]);
        if (dRes.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ message: 'Selected driver does not exist.' });
        }
        const driver = dRes.rows[0];
        if (driver.status !== 'Available') {
            await pool.query('ROLLBACK');
            return res.status(400).json({ message: `Driver ${driver.name} is currently ${driver.status} and unavailable for assignment.` });
        }

        // Check if driver has an active trip
        const activeDTrip = await pool.query("SELECT id FROM trips WHERE driver_id = $1 AND status IN ('Dispatched', 'In Progress', 'Draft')", [driver_id]);
        if (activeDTrip.rows.length > 0) {
            await pool.query('ROLLBACK');
            return res.status(400).json({ message: `Driver ${driver.name} is already assigned to an active trip.` });
        }

        // 3. Create trip
        const insertQuery = `
            INSERT INTO trips (vehicle_id, driver_id, source, destination, cargo_weight, planned_distance, status, created_by, start_time)
            VALUES ($1, $2, $3, $4, $5, $6, 'Dispatched', $7, CURRENT_TIMESTAMP) RETURNING *
        `;
        const result = await pool.query(insertQuery, [
            vehicle_id, 
            driver_id, 
            source || '', 
            destination || '', 
            cargo_weight ? Number(cargo_weight) : null, 
            planned_distance ? Number(planned_distance) : null,
            createdBy
        ]);
        
        // 4. Update vehicle and driver status
        await pool.query("UPDATE vehicles SET status = 'On Trip', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [vehicle_id]);
        await pool.query("UPDATE drivers SET status = 'On Trip', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [driver_id]);
        
        await pool.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error("Error in createTrip:", err);
        const errMsg = err.code === '22P02' ? 'Invalid ID syntax format' : (err.message || 'Server error creating trip');
        res.status(400).json({ message: errMsg });
    }
};

exports.updateTrip = async (req, res) => {
    const { id } = req.params;
    const { status, actual_distance, final_odometer, fuel_used, revenue } = req.body;
    try {
        await pool.query('BEGIN');
        
        const currentTrip = await pool.query('SELECT * FROM trips WHERE id = $1 FOR UPDATE', [id]);
        if (currentTrip.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ message: 'Trip not found' });
        }
        
        const oldStatus = currentTrip.rows[0].status;
        const vehicle_id = currentTrip.rows[0].vehicle_id;
        const driver_id = currentTrip.rows[0].driver_id;
        
        const isEnding = status === 'Completed' || status === 'Cancelled';
        const endTimeClause = isEnding ? ', end_time = CURRENT_TIMESTAMP' : '';

        const updateQuery = `
            UPDATE trips 
            SET status = COALESCE($1, status), 
                actual_distance = COALESCE($2, actual_distance), 
                final_odometer = COALESCE($3, final_odometer), 
                fuel_used = COALESCE($4, fuel_used), 
                revenue = COALESCE($5, revenue),
                updated_at = CURRENT_TIMESTAMP
                ${endTimeClause}
            WHERE id = $6 RETURNING *
        `;
        const result = await pool.query(updateQuery, [status, actual_distance, final_odometer, fuel_used, revenue, id]);
        
        if (oldStatus !== 'Completed' && oldStatus !== 'Cancelled' && isEnding) {
            await pool.query("UPDATE vehicles SET status = 'Available', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [vehicle_id]);
            await pool.query("UPDATE drivers SET status = 'Available', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [driver_id]);
        } else if ((oldStatus === 'Completed' || oldStatus === 'Cancelled') && (status === 'Dispatched' || status === 'In Progress')) {
            await pool.query("UPDATE vehicles SET status = 'On Trip', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [vehicle_id]);
            await pool.query("UPDATE drivers SET status = 'On Trip', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [driver_id]);
        }
        
        await pool.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error("Error in updateTrip:", err);
        res.status(500).json({ message: 'Server error updating trip' });
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
