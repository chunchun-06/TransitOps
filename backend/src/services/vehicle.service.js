const pool = require("../config/db");
const { validateVehicle } = require("../validators/vehicle.validator");

// Get all vehicles
const getAllVehicles = async () => {
    const result = await pool.query(
        "SELECT * FROM vehicles ORDER BY id"
    );

    return result.rows;
};

// Get vehicle by ID
const getVehicleById = async (id) => {
    const result = await pool.query(
        "SELECT * FROM vehicles WHERE id = $1",
        [id]
    );

    return result.rows[0];
};

// Create vehicle
const createVehicle = async (vehicle) => {

    validateVehicle(vehicle);

    const {
        registration_no,
        vehicle_name,
        vehicle_type,
        max_load_capacity,
        odometer,
        acquisition_cost
    } = vehicle;

    // Check duplicate registration number
    const check = await pool.query(
        "SELECT id FROM vehicles WHERE registration_no = $1",
        [registration_no]
    );

    if (check.rows.length > 0) {
        throw new Error("Registration number already exists.");
    }

    const result = await pool.query(
        `INSERT INTO vehicles
        (
            registration_no,
            vehicle_name,
            vehicle_type,
            max_load_capacity,
            odometer,
            acquisition_cost,
            status
        )
        VALUES
        ($1,$2,$3,$4,$5,$6,'Available')
        RETURNING *`,
        [
            registration_no,
            vehicle_name,
            vehicle_type,
            max_load_capacity,
            odometer,
            acquisition_cost
        ]
    );

    return result.rows[0];
};

// Update vehicle
const updateVehicle = async (id, vehicle) => {

    validateVehicle(vehicle);

    // Check vehicle exists
    const existing = await pool.query(
        "SELECT id FROM vehicles WHERE id = $1",
        [id]
    );

    if (existing.rows.length === 0) {
        throw new Error("Vehicle not found.");
    }

    const {
        registration_no,
        vehicle_name,
        vehicle_type,
        max_load_capacity,
        odometer,
        acquisition_cost,
        status
    } = vehicle;

    // Check duplicate registration number
    const duplicate = await pool.query(
        `SELECT id
         FROM vehicles
         WHERE registration_no = $1
         AND id <> $2`,
        [registration_no, id]
    );

    if (duplicate.rows.length > 0) {
        throw new Error("Registration number already exists.");
    }

    const result = await pool.query(
        `UPDATE vehicles
        SET
            registration_no = $1,
            vehicle_name = $2,
            vehicle_type = $3,
            max_load_capacity = $4,
            odometer = $5,
            acquisition_cost = $6,
            status = $7
        WHERE id = $8
        RETURNING *`,
        [
            registration_no,
            vehicle_name,
            vehicle_type,
            max_load_capacity,
            odometer,
            acquisition_cost,
            status,
            id
        ]
    );

    return result.rows[0];
};

// Delete vehicle
const deleteVehicle = async (id) => {

    // Check vehicle exists
    const existing = await pool.query(
        "SELECT id FROM vehicles WHERE id = $1",
        [id]
    );

    if (existing.rows.length === 0) {
        throw new Error("Vehicle not found.");
    }

    await pool.query(
        "DELETE FROM vehicles WHERE id = $1",
        [id]
    );

    return {
        message: "Vehicle deleted successfully."
    };
};

// Get available vehicles
const getAvailableVehicles = async () => {

    const result = await pool.query(
        `SELECT *
         FROM vehicles
         WHERE status = 'Available'
         ORDER BY vehicle_name`
    );

    return result.rows;
};

module.exports = {
    getAllVehicles,
    getVehicleById,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    getAvailableVehicles
};