const pool = require('../config/db');

// Maintenance
exports.getMaintenanceLogs = async (req, res) => {
    try {
        const query = `
            SELECT m.id, m.vehicle_id, m.service_type, m.description, m.cost, m.status, m.service_date, v.registration_no, v.vehicle_name 
            FROM maintenance m
            LEFT JOIN vehicles v ON m.vehicle_id = v.id
            ORDER BY m.service_date DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createMaintenanceLog = async (req, res) => {
    const { vehicle_id, service_type, cost, status, service_date, description } = req.body;
    try {
        await pool.query('BEGIN');
        const result = await pool.query(
            `INSERT INTO maintenance (vehicle_id, service_type, cost, status, service_date, description, created_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [vehicle_id, service_type, cost, status || 'In Shop', service_date || new Date(), description || '', req.user?.id || null]
        );
        if (status === 'In Shop') {
            await pool.query("UPDATE vehicles SET status = 'In Shop' WHERE id = $1", [vehicle_id]);
        }
        await pool.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateMaintenanceLog = async (req, res) => {
    const { id } = req.params;
    const { service_type, cost, status, service_date, description } = req.body;
    try {
        await pool.query('BEGIN');
        
        const log = await pool.query('SELECT vehicle_id FROM maintenance WHERE id = $1', [id]);
        if (log.rows.length > 0) {
            const vehicle_id = log.rows[0].vehicle_id;
            const result = await pool.query(
                `UPDATE maintenance 
                 SET service_type = $1, cost = $2, status = $3, service_date = $4, description = $5 
                 WHERE id = $6 RETURNING *`,
                [service_type, cost, status, service_date, description || '', id]
            );
            if (status === 'Completed') {
                await pool.query("UPDATE vehicles SET status = 'Available' WHERE id = $1", [vehicle_id]);
            } else if (status === 'In Shop') {
                await pool.query("UPDATE vehicles SET status = 'In Shop' WHERE id = $1", [vehicle_id]);
            }
            await pool.query('COMMIT');
            res.json(result.rows[0]);
        } else {
            await pool.query('ROLLBACK');
            res.status(404).json({ message: 'Not found' });
        }
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateMaintenanceStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await pool.query('BEGIN');
        const log = await pool.query('SELECT vehicle_id FROM maintenance WHERE id = $1', [id]);
        if (log.rows.length > 0) {
            const vehicle_id = log.rows[0].vehicle_id;
            const result = await pool.query(
                "UPDATE maintenance SET status = $1 WHERE id = $2 RETURNING *",
                [status, id]
            );
            if (status === 'Completed') {
                await pool.query("UPDATE vehicles SET status = 'Available' WHERE id = $1", [vehicle_id]);
            } else if (status === 'In Shop') {
                await pool.query("UPDATE vehicles SET status = 'In Shop' WHERE id = $1", [vehicle_id]);
            }
            await pool.query('COMMIT');
            res.json(result.rows[0]);
        } else {
            await pool.query('ROLLBACK');
            res.status(404).json({ message: 'Not found' });
        }
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteMaintenanceLog = async (req, res) => {
    try {
        await pool.query("DELETE FROM maintenance WHERE id = $1", [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Fuel
exports.getFuelLogs = async (req, res) => {
    try {
        const query = `
            SELECT 
                f.id, 
                f.trip_id, 
                f.vehicle_id, 
                f.fuel_amount, 
                f.cost, 
                f.price_per_liter, 
                f.fuel_type, 
                f.date, 
                v.registration_no, 
                v.vehicle_name,
                t.driver_id,
                d.name AS driver_name
            FROM fuel f
            LEFT JOIN vehicles v ON f.vehicle_id = v.id
            LEFT JOIN trips t ON f.trip_id = t.id
            LEFT JOIN drivers d ON t.driver_id = d.id
            ORDER BY f.date DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createFuelLog = async (req, res) => {
    const { vehicle_id, trip_id, fuel_amount, cost, price_per_liter, fuel_type, date } = req.body;
    try {
        // Resolve fuel type and price if not provided
        let resolvedFuelType = fuel_type || 'Diesel';
        let resolvedPrice = price_per_liter ? parseFloat(price_per_liter) : null;

        if (vehicle_id) {
            const vehRes = await pool.query(
                'SELECT fuel_type, current_fuel_level_liters, fuel_tank_capacity_liters FROM vehicles WHERE id = $1', 
                [vehicle_id]
            );
            if (vehRes.rows.length > 0) {
                if (!fuel_type && vehRes.rows[0].fuel_type) {
                    resolvedFuelType = vehRes.rows[0].fuel_type;
                }
                
                // If price is not provided, fetch current price or compute from cost/fuel_amount
                if (!resolvedPrice) {
                    if (cost && fuel_amount && parseFloat(fuel_amount) > 0) {
                        resolvedPrice = Math.round((parseFloat(cost) / parseFloat(fuel_amount)) * 100) / 100;
                    } else {
                        const priceRes = await pool.query(
                            `SELECT price_per_liter FROM fuel_price
                             WHERE fuel_type = $1 AND effective_from <= CURRENT_DATE
                             AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
                             ORDER BY effective_from DESC LIMIT 1`,
                            [resolvedFuelType]
                        );
                        resolvedPrice = priceRes.rows.length > 0 ? parseFloat(priceRes.rows[0].price_per_liter) : 100.0;
                    }
                }

                // Increase vehicle's current fuel level
                const currentLiters = parseFloat(vehRes.rows[0].current_fuel_level_liters || 0);
                const addedLiters = parseFloat(fuel_amount || 0);
                const maxCap = parseFloat(vehRes.rows[0].fuel_tank_capacity_liters || 999999);
                const newLevel = Math.min(currentLiters + addedLiters, maxCap);
                await pool.query('UPDATE vehicles SET current_fuel_level_liters = $1 WHERE id = $2', [newLevel, vehicle_id]);
            }
        }

        const result = await pool.query(
            `INSERT INTO fuel (vehicle_id, trip_id, fuel_amount, cost, price_per_liter, fuel_type, date, created_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
                vehicle_id || null, 
                trip_id || null, 
                fuel_amount, 
                cost, 
                resolvedPrice, 
                resolvedFuelType, 
                date || new Date(), 
                req.user?.id || null
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteFuelLog = async (req, res) => {
    try {
        await pool.query("DELETE FROM fuel WHERE id = $1", [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Expenses
exports.getExpenses = async (req, res) => {
    try {
        const query = `
            SELECT e.id, e.trip_id, e.vehicle_id, e.category, e.description, e.amount, e.date, v.registration_no, v.vehicle_name 
            FROM expenses e
            LEFT JOIN vehicles v ON e.vehicle_id = v.id
            ORDER BY e.date DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createExpense = async (req, res) => {
    const { vehicle_id, trip_id, amount, category, date, description } = req.body;
    try {
        let resolvedVehicleId = vehicle_id || null;
        if (trip_id && !resolvedVehicleId) {
            const tripResult = await pool.query("SELECT vehicle_id FROM trips WHERE id = $1", [trip_id]);
            if (tripResult.rows.length > 0) {
                resolvedVehicleId = tripResult.rows[0].vehicle_id;
            }
        }
        const result = await pool.query(
            `INSERT INTO expenses (vehicle_id, trip_id, amount, category, date, description, created_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [resolvedVehicleId, trip_id || null, amount, category, date || new Date(), description || '', req.user?.id || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteExpense = async (req, res) => {
    try {
        await pool.query("DELETE FROM expenses WHERE id = $1", [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
