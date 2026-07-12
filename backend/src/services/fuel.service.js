const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

/*
    Get All Fuel Logs
*/
const getAllFuelLogs = async () => {
    const query = `
        SELECT *
        FROM fuel_logs
        ORDER BY created_at DESC
    `;

    const result = await pool.query(query);

    return result.rows;
};

/*
    Get Fuel Log By Id
*/
const getFuelLogById = async (id) => {

    const query = `
        SELECT *
        FROM fuel_logs
        WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    return result.rows[0];
};

/*
    Create Fuel Log
*/
const createFuelLog = async (fuelData) => {

    const {
        vehicle_id,
        liters,
        cost,
        fuel_date
    } = fuelData;

    const id = uuidv4();

    const query = `
        INSERT INTO fuel_logs
        (
            id,
            trip_id,
            vehicle_id,
            liters,
            cost,
            fuel_date,
            created_by,
            created_at
        )
        VALUES
        (
            $1,
            NULL,
            $2,
            $3,
            $4,
            $5,
            NULL,
            NOW()
        )
        RETURNING *
    `;

    const values = [
        id,
        vehicle_id,
        liters,
        cost,
        fuel_date
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
};

/*
    Update Fuel Log
*/
const updateFuelLog = async (id, fuelData) => {

    const {
        vehicle_id,
        liters,
        cost,
        fuel_date
    } = fuelData;

    const query = `
        UPDATE fuel_logs
        SET
            vehicle_id = $1,
            liters = $2,
            cost = $3,
            fuel_date = $4
        WHERE id = $5
        RETURNING *
    `;

    const values = [
        vehicle_id,
        liters,
        cost,
        fuel_date,
        id
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
};

/*
    Delete Fuel Log
*/
const deleteFuelLog = async (id) => {

    const query = `
        DELETE FROM fuel_logs
        WHERE id = $1
        RETURNING *
    `;

    const result = await pool.query(query, [id]);

    return result.rows[0];
};

module.exports = {

    getAllFuelLogs,

    getFuelLogById,

    createFuelLog,

    updateFuelLog,

    deleteFuelLog
};