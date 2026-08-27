const pool = require('../config/db');
const cloudinaryService = require('../services/cloudinary.service');

const sanitizeUuid = (val) => {
    if (!val || val === 'null' || val === 'undefined' || String(val).trim() === '') return null;
    return val;
};

exports.getVehicles = async (req, res) => {
    try {
        const query = `
            SELECT v.*, d.name AS current_driver_name
            FROM vehicles v
            LEFT JOIN drivers d ON v.current_driver_id = d.id
            ORDER BY v.created_at DESC
        `;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error("Error in getVehicles:", err);
        res.status(500).json({ success: false, message: 'Failed to fetch vehicles' });
    }
};

exports.getVehicleById = async (req, res) => {
    try {
        const { id } = req.params;
        const vehResult = await pool.query(`
            SELECT v.*, 
                   d.name AS current_driver_name, 
                   d.license_number AS current_driver_license,
                   d.contact_number AS current_driver_phone,
                   d.status AS current_driver_status
            FROM vehicles v
            LEFT JOIN drivers d ON v.current_driver_id = d.id
            WHERE v.id = $1
        `, [id]);

        if (vehResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Vehicle not found' });
        const vehicle = vehResult.rows[0];

        // Fetch recent trips for this vehicle
        const tripsResult = await pool.query(
            `SELECT t.id, t.created_at, t.start_time, t.end_time, t.source, t.destination,
                    t.planned_distance, t.actual_distance, t.status, t.revenue,
                    COALESCE((SELECT SUM(amount) FROM expenses WHERE trip_id = t.id), 0)::float AS total_expenses,
                    d.name AS driver_name 
             FROM trips t 
             LEFT JOIN drivers d ON t.driver_id = d.id 
             WHERE t.vehicle_id = $1 
             ORDER BY t.created_at DESC LIMIT 20`,
            [id]
        );

        // Fetch maintenance records
        const maintResult = await pool.query(
            `SELECT * FROM maintenance WHERE vehicle_id = $1 ORDER BY service_date DESC, created_at DESC LIMIT 50`,
            [id]
        );

        // Fetch fuel logs
        const fuelResult = await pool.query(
            `SELECT * FROM fuel WHERE vehicle_id = $1 ORDER BY date DESC, created_at DESC LIMIT 50`,
            [id]
        );

        res.json({
            success: true,
            data: {
                ...vehicle,
                trips: tripsResult.rows,
                maintenance: maintResult.rows,
                fuel_logs: fuelResult.rows
            }
        });
    } catch (err) {
        console.error("Error in getVehicleById:", err);
        res.status(500).json({ success: false, message: 'Failed to fetch vehicle details' });
    }
};

exports.getAvailableVehicles = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT v.*, d.name AS current_driver_name 
             FROM vehicles v 
             LEFT JOIN drivers d ON v.current_driver_id = d.id 
             WHERE v.status = 'Available' 
             ORDER BY v.vehicle_name ASC`
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error("Error in getAvailableVehicles:", err);
        res.status(500).json({ success: false, message: 'Failed to fetch available vehicles' });
    }
};

exports.createVehicle = async (req, res) => {
    try {
        const {
            registration_no, vehicle_name, vehicle_type, max_load_capacity,
            odometer, acquisition_cost, status,
            fuel_type, fuel_efficiency_kmpl, fuel_tank_capacity_liters, current_fuel_level_liters,
            current_driver_id, photo_url, axle_count, toll_category
        } = req.body;

        if (!registration_no || !vehicle_name) {
            return res.status(400).json({ success: false, message: 'Registration number and Vehicle name are required' });
        }

        const cleanDriverId = sanitizeUuid(current_driver_id);

        const dupCheck = await pool.query('SELECT id FROM vehicles WHERE registration_no = $1', [registration_no]);
        if (dupCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Registration number must be unique' });
        }

        const fuelLevel = current_fuel_level_liters !== undefined && current_fuel_level_liters !== null && current_fuel_level_liters !== '' ? Number(current_fuel_level_liters) : 0;
        const tankCap = fuel_tank_capacity_liters !== undefined && fuel_tank_capacity_liters !== null && fuel_tank_capacity_liters !== '' ? Number(fuel_tank_capacity_liters) : null;
        if (tankCap !== null && fuelLevel > tankCap) {
            return res.status(400).json({ success: false, message: 'Current fuel level cannot exceed tank capacity.' });
        }

        if (cleanDriverId) {
            await pool.query('UPDATE vehicles SET current_driver_id = NULL WHERE current_driver_id = $1', [cleanDriverId]);
        }

        const result = await pool.query(
            `INSERT INTO vehicles (
                registration_no, vehicle_name, vehicle_type, max_load_capacity, odometer,
                acquisition_cost, status, created_by,
                fuel_type, fuel_efficiency_kmpl, fuel_tank_capacity_liters, current_fuel_level_liters,
                current_driver_id, photo_url, axle_count, toll_category
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
            [
                registration_no,
                vehicle_name,
                vehicle_type || 'Van',
                max_load_capacity ? Number(max_load_capacity) : null,
                odometer ? Number(odometer) : 0,
                acquisition_cost ? Number(acquisition_cost) : null,
                status || 'Available',
                req.user?.id || null,
                fuel_type || 'Diesel',
                fuel_efficiency_kmpl ? Number(fuel_efficiency_kmpl) : null,
                tankCap,
                fuelLevel,
                cleanDriverId,
                photo_url || null,
                axle_count ? parseInt(axle_count) : null,
                toll_category || null
            ]
        );
        res.status(201).json({ success: true, message: 'Vehicle created successfully', data: result.rows[0] });
    } catch (err) {
        console.error("Error in createVehicle:", err);
        if (err.code === '23505') {
            return res.status(400).json({ success: false, message: 'Registration number must be unique' });
        }
        res.status(500).json({ success: false, message: err.message || 'Failed to create vehicle' });
    }
};

exports.updateVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            registration_no, vehicle_name, vehicle_type, max_load_capacity,
            odometer, acquisition_cost, status,
            fuel_type, fuel_efficiency_kmpl, fuel_tank_capacity_liters, current_fuel_level_liters,
            current_driver_id, photo_url, axle_count, toll_category
        } = req.body;

        if (!registration_no || !vehicle_name) {
            return res.status(400).json({ success: false, message: 'Registration number and Vehicle name are required' });
        }

        const cleanDriverId = sanitizeUuid(current_driver_id);

        const dupCheck = await pool.query('SELECT id FROM vehicles WHERE registration_no = $1 AND id != $2', [registration_no, id]);
        if (dupCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Registration number must be unique' });
        }

        const fuelLevel = current_fuel_level_liters !== undefined && current_fuel_level_liters !== null && current_fuel_level_liters !== '' ? Number(current_fuel_level_liters) : null;
        const tankCap = fuel_tank_capacity_liters !== undefined && fuel_tank_capacity_liters !== null && fuel_tank_capacity_liters !== '' ? Number(fuel_tank_capacity_liters) : null;
        if (tankCap !== null && fuelLevel !== null && fuelLevel > tankCap) {
            return res.status(400).json({ success: false, message: 'Current fuel level cannot exceed tank capacity.' });
        }

        if (cleanDriverId) {
            await pool.query('UPDATE vehicles SET current_driver_id = NULL WHERE current_driver_id = $1 AND id != $2', [cleanDriverId, id]);
        }

        const result = await pool.query(
            `UPDATE vehicles
             SET registration_no = $1, vehicle_name = $2, vehicle_type = $3, max_load_capacity = $4,
                 odometer = $5, acquisition_cost = $6, status = $7, updated_at = CURRENT_TIMESTAMP, updated_by = $8,
                 fuel_type = $9, fuel_efficiency_kmpl = $10, fuel_tank_capacity_liters = $11, current_fuel_level_liters = $12,
                 current_driver_id = $13, photo_url = COALESCE($14, photo_url), axle_count = COALESCE($15, axle_count), toll_category = COALESCE($16, toll_category)
             WHERE id = $17 RETURNING *`,
            [
                registration_no,
                vehicle_name,
                vehicle_type || 'Van',
                max_load_capacity ? Number(max_load_capacity) : null,
                odometer ? Number(odometer) : 0,
                acquisition_cost ? Number(acquisition_cost) : null,
                status || 'Available',
                req.user?.id || null,
                fuel_type || 'Diesel',
                fuel_efficiency_kmpl ? Number(fuel_efficiency_kmpl) : null,
                tankCap,
                fuelLevel,
                cleanDriverId,
                photo_url || null,
                axle_count ? parseInt(axle_count) : null,
                toll_category || null,
                id
            ]
        );

        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Vehicle not found' });
        res.json({ success: true, message: 'Vehicle updated successfully', data: result.rows[0] });
    } catch (err) {
        console.error("Error in updateVehicle:", err);
        if (err.code === '23505') {
            return res.status(400).json({ success: false, message: 'Registration number must be unique' });
        }
        res.status(500).json({ success: false, message: err.message || 'Failed to update vehicle' });
    }
};

// Soft Deactivation: Update status to 'Retired'
exports.deleteVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "UPDATE vehicles SET status = 'Retired', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Vehicle not found' });
        res.json({ success: true, message: 'Vehicle retired successfully', vehicle: result.rows[0] });
    } catch (err) {
        console.error("Error in deleteVehicle:", err);
        res.status(500).json({ success: false, message: 'Failed to retire vehicle' });
    }
};

// Soft Bulk Deactivation
exports.bulkDelete = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, message: 'No vehicle IDs provided' });

        const result = await pool.query(
            "UPDATE vehicles SET status = 'Retired', updated_at = CURRENT_TIMESTAMP WHERE id = ANY($1::uuid[]) RETURNING *",
            [ids]
        );
        res.json({ success: true, message: `${result.rowCount} vehicles retired` });
    } catch (err) {
        console.error("Error in bulkDelete:", err);
        res.status(500).json({ success: false, message: 'Failed to retire vehicles' });
    }
};

exports.bulkUpdateStatus = async (req, res) => {
    try {
        const { ids, status } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, message: 'No vehicle IDs provided' });
        if (!status) return res.status(400).json({ success: false, message: 'No status provided' });

        const result = await pool.query(
            'UPDATE vehicles SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2::uuid[]) RETURNING *',
            [status, ids]
        );
        res.json({ success: true, message: `${result.rowCount} vehicles updated` });
    } catch (err) {
        console.error("Error in bulkUpdateStatus:", err);
        res.status(500).json({ success: false, message: 'Failed to update vehicle statuses' });
    }
};

// Toggle or explicit status update
exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) return res.status(400).json({ success: false, message: 'Status is required' });

        const VALID_STATUSES = ['Available', 'On Trip', 'In Shop', 'Retired', 'Inactive'];
        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
        }

        const result = await pool.query(
            'UPDATE vehicles SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [status, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Vehicle not found' });
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error("Error in updateStatus:", err);
        res.status(500).json({ success: false, message: 'Failed to update vehicle status' });
    }
};

// Assign driver to vehicle
exports.assignDriver = async (req, res) => {
    try {
        const { id } = req.params;
        const { driver_id } = req.body; // can be null to unassign

        const cleanDriverId = sanitizeUuid(driver_id);

        if (cleanDriverId) {
            // Verify driver exists and check status & license expiry
            const drvCheck = await pool.query('SELECT name, status, license_expiry FROM drivers WHERE id = $1', [cleanDriverId]);
            if (drvCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'Driver not found' });

            const drv = drvCheck.rows[0];
            if (drv.status === 'Inactive' || drv.status === 'Suspended') {
                return res.status(400).json({ success: false, message: `Cannot assign driver ${drv.name} because status is ${drv.status}` });
            }

            if (drv.license_expiry) {
                const expDate = new Date(drv.license_expiry);
                expDate.setHours(23, 59, 59, 999);
                if (expDate < new Date()) {
                    return res.status(400).json({ success: false, message: `Cannot assign driver ${drv.name}: License expired on ${new Date(drv.license_expiry).toLocaleDateString()}` });
                }
            }

            // Unassign this driver from any other vehicle first for 1:1 mapping
            await pool.query('UPDATE vehicles SET current_driver_id = NULL WHERE current_driver_id = $1 AND id != $2', [cleanDriverId, id]);
        }

        const result = await pool.query(
            'UPDATE vehicles SET current_driver_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [cleanDriverId, id]
        );

        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Vehicle not found' });

        // Fetch populated vehicle with driver info
        const populated = await pool.query(`
            SELECT v.*, 
                   d.name AS current_driver_name, 
                   d.license_number AS current_driver_license,
                   d.contact_number AS current_driver_phone,
                   d.status AS current_driver_status
            FROM vehicles v
            LEFT JOIN drivers d ON v.current_driver_id = d.id
            WHERE v.id = $1
        `, [id]);

        res.json({ success: true, message: 'Driver assigned successfully', data: populated.rows[0] });
    } catch (err) {
        console.error("Assign driver error:", err);
        res.status(500).json({ success: false, message: err.message || 'Failed to assign driver' });
    }
};

// Upload Vehicle Photo (Cloudinary / Fallback)
exports.uploadPhoto = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) return res.status(400).json({ success: false, message: 'No photo file provided' });

        const photoUrl = await cloudinaryService.uploadImage(req.file.buffer, 'transitops/vehicles');

        const result = await pool.query(
            'UPDATE vehicles SET photo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [photoUrl, id]
        );

        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Vehicle not found' });
        res.json({ success: true, message: 'Photo uploaded successfully', photo_url: photoUrl, vehicle: result.rows[0] });
    } catch (err) {
        console.error("Upload photo error:", err);
        res.status(500).json({ success: false, message: 'Failed to upload vehicle photo' });
    }
};
