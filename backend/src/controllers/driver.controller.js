const pool = require('../config/db');
const cloudinaryService = require('../services/cloudinary.service');

exports.getDrivers = async (req, res) => {
    try {
        const query = `
            SELECT 
                d.*,
                u.email,
                (SELECT COUNT(*) FROM trips t WHERE t.driver_id = d.id) AS trip_count,
                v.id AS assigned_vehicle_id,
                v.registration_no AS assigned_vehicle,
                v.vehicle_name AS assigned_vehicle_name,
                v.photo_url AS assigned_vehicle_photo
            FROM drivers d
            LEFT JOIN users u ON d.user_id = u.id
            LEFT JOIN vehicles v ON v.current_driver_id = d.id
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
            SELECT d.*, u.email, v.registration_no AS current_vehicle, v.id AS current_vehicle_id
            FROM drivers d
            LEFT JOIN users u ON d.user_id = u.id
            LEFT JOIN vehicles v ON v.current_driver_id = d.id
            WHERE d.status != 'Inactive'
            ORDER BY d.name ASC
        `;
        const result = await pool.query(query);
        const rows = result.rows.map(d => {
            let isExpired = false;
            if (d.license_expiry) {
                const expDate = new Date(d.license_expiry);
                expDate.setHours(23, 59, 59, 999);
                if (expDate < new Date()) {
                    isExpired = true;
                }
            }
            return {
                ...d,
                is_expired: isExpired,
                effective_status: isExpired ? 'Suspended' : d.status
            };
        });
        res.json(rows);
    } catch (err) {
        console.error("Error in getAvailableDrivers:", err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getDriverById = async (req, res) => {
    try {
        const { id } = req.params;
        const driverResult = await pool.query(`
            SELECT d.*, u.email,
                   v.id AS assigned_vehicle_id,
                   v.registration_no AS assigned_vehicle_registration,
                   v.vehicle_name AS assigned_vehicle_name,
                   v.status AS assigned_vehicle_status,
                   v.photo_url AS assigned_vehicle_photo
            FROM drivers d
            LEFT JOIN users u ON d.user_id = u.id
            LEFT JOIN vehicles v ON v.current_driver_id = d.id
            WHERE d.id = $1
        `, [id]);

        if (driverResult.rows.length === 0) return res.status(404).json({ message: 'Driver not found' });
        const driver = driverResult.rows[0];

        // Fetch recent trips for this driver
        const tripsResult = await pool.query(
            `SELECT t.*, v.registration_no, v.vehicle_name 
             FROM trips t 
             LEFT JOIN vehicles v ON t.vehicle_id = v.id 
             WHERE t.driver_id = $1 
             ORDER BY t.created_at DESC LIMIT 10`,
            [id]
        );

        res.json({
            ...driver,
            trips: tripsResult.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createDriver = async (req, res) => {
    try {
        const { 
            name, license_number, license_category, license_expiry, contact_number, safety_score, status, photo_url,
            assigned_vehicle_id,
            // Co-registration fields for creating a new vehicle together
            vehicle_registration_no, vehicle_name, vehicle_type, fuel_type, vehicle_photo_url
        } = req.body;
        
        const dupCheck = await pool.query('SELECT id FROM drivers WHERE license_number = $1', [license_number]);
        if (dupCheck.rows.length > 0) {
            return res.status(400).json({ message: 'License number must be unique' });
        }

        let finalStatus = status || 'Available';
        if (license_expiry) {
            const expDate = new Date(license_expiry);
            expDate.setHours(23, 59, 59, 999);
            if (expDate < new Date()) {
                finalStatus = 'Suspended';
            }
        }

        const newDriverRes = await pool.query(
            `INSERT INTO drivers (name, license_number, license_category, license_expiry, contact_number, safety_score, status, photo_url) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [name, license_number, license_category || null, license_expiry || null, contact_number || null, safety_score || 100, finalStatus, photo_url || null]
        );

        const newDriver = newDriverRes.rows[0];

        // Handle Vehicle mapping
        if (vehicle_registration_no) {
            // User provided a NEW vehicle to co-register with this driver
            const vehDupCheck = await pool.query('SELECT id FROM vehicles WHERE registration_no = $1', [vehicle_registration_no]);
            if (vehDupCheck.rows.length === 0) {
                await pool.query(
                    `INSERT INTO vehicles (registration_no, vehicle_name, vehicle_type, fuel_type, current_driver_id, photo_url, status)
                     VALUES ($1, $2, $3, $4, $5, $6, 'Available')`,
                    [
                        vehicle_registration_no,
                        vehicle_name || `${name}'s ${vehicle_type || 'Vehicle'}`,
                        vehicle_type || 'Van',
                        fuel_type || 'Diesel',
                        newDriver.id,
                        vehicle_photo_url || null
                    ]
                );
            }
        } else if (assigned_vehicle_id) {
            // User selected an EXISTING vehicle to map
            await pool.query('UPDATE vehicles SET current_driver_id = NULL WHERE current_driver_id = $1', [newDriver.id]);
            await pool.query('UPDATE vehicles SET current_driver_id = $1 WHERE id = $2', [newDriver.id, assigned_vehicle_id]);
        }

        // Return full driver details
        const fullDriver = await pool.query(`
            SELECT d.*, v.id AS assigned_vehicle_id, v.registration_no AS assigned_vehicle, v.vehicle_name AS assigned_vehicle_name
            FROM drivers d
            LEFT JOIN vehicles v ON v.current_driver_id = d.id
            WHERE d.id = $1
        `, [newDriver.id]);

        res.status(201).json(fullDriver.rows[0] || newDriver);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            return res.status(400).json({ message: 'License or Registration number must be unique' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateDriver = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            name, license_number, license_category, license_expiry, contact_number, safety_score, status, photo_url,
            assigned_vehicle_id 
        } = req.body;

        const dupCheck = await pool.query('SELECT id FROM drivers WHERE license_number = $1 AND id != $2', [license_number, id]);
        if (dupCheck.rows.length > 0) {
            return res.status(400).json({ message: 'License number must be unique' });
        }

        let finalStatus = status;
        if (license_expiry) {
            const expDate = new Date(license_expiry);
            expDate.setHours(23, 59, 59, 999);
            if (expDate < new Date()) {
                finalStatus = 'Suspended';
            }
        }

        const result = await pool.query(
            `UPDATE drivers 
             SET name = $1, license_number = $2, license_category = $3, license_expiry = $4, contact_number = $5, safety_score = $6, status = $7, photo_url = COALESCE($8, photo_url), updated_at = CURRENT_TIMESTAMP
             WHERE id = $9 RETURNING *`,
            [name, license_number, license_category || null, license_expiry || null, contact_number || null, safety_score, finalStatus, photo_url || null, id]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: 'Driver not found' });

        if (assigned_vehicle_id !== undefined) {
            // Unassign from previous vehicle
            await pool.query('UPDATE vehicles SET current_driver_id = NULL WHERE current_driver_id = $1', [id]);
            if (assigned_vehicle_id) {
                await pool.query('UPDATE vehicles SET current_driver_id = $1 WHERE id = $2', [id, assigned_vehicle_id]);
            }
        }

        const updatedDriver = await pool.query(`
            SELECT d.*, v.id AS assigned_vehicle_id, v.registration_no AS assigned_vehicle, v.vehicle_name AS assigned_vehicle_name
            FROM drivers d
            LEFT JOIN vehicles v ON v.current_driver_id = d.id
            WHERE d.id = $1
        `, [id]);

        res.json(updatedDriver.rows[0] || result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            return res.status(400).json({ message: 'License number must be unique' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// Soft Deactivation: Update status to 'Inactive' instead of physical DELETE
exports.deleteDriver = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "UPDATE drivers SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Driver not found' });
        res.json({ message: 'Driver deactivated successfully', driver: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const VALID_STATUSES = ['Available', 'On Trip', 'Off Duty', 'Suspended', 'Inactive'];
        if (!status || !VALID_STATUSES.includes(status)) {
            return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
        }

        const driver = await pool.query('SELECT license_expiry FROM drivers WHERE id = $1', [id]);
        if (driver.rows.length === 0) return res.status(404).json({ message: 'Driver not found' });
        
        if (status === 'Available' && driver.rows[0].license_expiry) {
            const expDate = new Date(driver.rows[0].license_expiry);
            expDate.setHours(23, 59, 59, 999);
            if (expDate < new Date()) {
                return res.status(400).json({ message: 'Cannot mark driver as Available. License has expired.' });
            }
        }

        const result = await pool.query('UPDATE drivers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *', [status, id]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Soft Bulk Deactivation
exports.bulkDelete = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'No driver IDs provided' });

        const result = await pool.query(
            "UPDATE drivers SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ANY($1::uuid[]) RETURNING *",
            [ids]
        );
        res.json({ message: `${result.rowCount} drivers deactivated` });
    } catch (err) {
        console.error(err);
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

// Upload Driver Photo (Cloudinary / Fallback)
exports.uploadPhoto = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) return res.status(400).json({ message: 'No photo file provided' });

        const photoUrl = await cloudinaryService.uploadImage(req.file.buffer, 'transitops/drivers');

        const result = await pool.query(
            'UPDATE drivers SET photo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [photoUrl, id]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: 'Driver not found' });
        res.json({ message: 'Photo uploaded successfully', photo_url: photoUrl, driver: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to upload driver photo' });
    }
};
