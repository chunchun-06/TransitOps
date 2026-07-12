const pool = require('../config/db');

// Maintenance
exports.getMaintenanceLogs = async (req, res) => {
    try {
        const query = `
            SELECT m.*, v.registration_no, v.vehicle_name 
            FROM maintenance m
            LEFT JOIN vehicles v ON m.vehicle_id = v.id
            ORDER BY m.date DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
};
exports.createMaintenanceLog = async (req, res) => {
    const { vehicle_id, cost, status } = req.body;
    try {
        await pool.query('BEGIN');
        const result = await pool.query(
            "INSERT INTO maintenance (vehicle_id, cost, status) VALUES ($1, $2, $3) RETURNING *",
            [vehicle_id, cost, status || 'In Shop']
        );
        if (status === 'In Shop') {
            await pool.query("UPDATE vehicles SET status = 'In Shop' WHERE id = $1", [vehicle_id]);
        }
        await pool.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) { await pool.query('ROLLBACK'); res.status(500).json({ message: 'Server error' }); }
};
exports.updateMaintenanceLog = async (req, res) => {
    const { id } = req.params;
    const { cost, status } = req.body;
    try {
        await pool.query('BEGIN');
        
        const log = await pool.query('SELECT vehicle_id FROM maintenance WHERE id = $1', [id]);
        if (log.rows.length > 0) {
            const vehicle_id = log.rows[0].vehicle_id;
            const result = await pool.query(
                "UPDATE maintenance SET cost = $1, status = $2 WHERE id = $3 RETURNING *",
                [cost, status, id]
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
    } catch (err) { await pool.query('ROLLBACK'); res.status(500).json({ message: 'Server error' }); }
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
    } catch (err) { await pool.query('ROLLBACK'); res.status(500).json({ message: 'Server error' }); }
};
exports.deleteMaintenanceLog = async (req, res) => {
    try {
        await pool.query("DELETE FROM maintenance WHERE id = $1", [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// Fuel
exports.getFuelLogs = async (req, res) => {
    try {
        const query = `
            SELECT f.*, v.registration_no, v.vehicle_name 
            FROM fuel f
            LEFT JOIN vehicles v ON f.vehicle_id = v.id
            ORDER BY f.date DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
};
exports.createFuelLog = async (req, res) => {
    const { vehicle_id, amount, quantity } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO fuel (vehicle_id, amount, quantity) VALUES ($1, $2, $3) RETURNING *",
            [vehicle_id, amount, quantity]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
};
exports.deleteFuelLog = async (req, res) => {
    try {
        await pool.query("DELETE FROM fuel WHERE id = $1", [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// Expenses
exports.getExpenses = async (req, res) => {
    try {
        const query = `
            SELECT e.*, v.registration_no, v.vehicle_name 
            FROM expenses e
            LEFT JOIN vehicles v ON e.vehicle_id = v.id
            ORDER BY e.date DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
};
exports.createExpense = async (req, res) => {
    const { vehicle_id, amount, type } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO expenses (vehicle_id, amount, type) VALUES ($1, $2, $3) RETURNING *",
            [vehicle_id, amount, type]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
};
exports.deleteExpense = async (req, res) => {
    try {
        await pool.query("DELETE FROM expenses WHERE id = $1", [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
};
