const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

/*
    Get All Expenses
*/
const getAllExpenses = async () => {

    const query = `
        SELECT *
        FROM expenses
        ORDER BY created_at DESC
    `;

    const result = await pool.query(query);

    return result.rows;
};

/*
    Get Expense By Id
*/
const getExpenseById = async (id) => {

    const query = `
        SELECT *
        FROM expenses
        WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    return result.rows[0];
};

/*
    Create Expense
*/
const createExpense = async (expenseData) => {

    const {
        vehicle_id,
        expense_type,
        description,
        amount,
        expense_date
    } = expenseData;

    const id = uuidv4();

    const query = `
        INSERT INTO expenses
        (
            id,
            vehicle_id,
            expense_type,
            description,
            amount,
            expense_date,
            created_by,
            created_at
        )
        VALUES
        (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            NULL,
            NOW()
        )
        RETURNING *
    `;

    const values = [
        id,
        vehicle_id,
        expense_type,
        description,
        amount,
        expense_date
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
};

/*
    Update Expense
*/
const updateExpense = async (id, expenseData) => {

    const {
        vehicle_id,
        expense_type,
        description,
        amount,
        expense_date
    } = expenseData;

    const query = `
        UPDATE expenses
        SET
            vehicle_id = $1,
            expense_type = $2,
            description = $3,
            amount = $4,
            expense_date = $5
        WHERE id = $6
        RETURNING *
    `;

    const values = [
        vehicle_id,
        expense_type,
        description,
        amount,
        expense_date,
        id
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
};

/*
    Delete Expense
*/
const deleteExpense = async (id) => {

    const query = `
        DELETE FROM expenses
        WHERE id = $1
        RETURNING *
    `;

    const result = await pool.query(query, [id]);

    return result.rows[0];
};

module.exports = {
    getAllExpenses,
    getExpenseById,
    createExpense,
    updateExpense,
    deleteExpense
};