const expenseService = require("../services/expense.service");

const getAllExpenses = async (req, res) => {
    try {
        const expenses = await expenseService.getAllExpenses();

        res.status(200).json({
            success: true,
            message: "Expenses fetched successfully",
            data: expenses
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const getExpenseById = async (req, res) => {
    try {

        const { id } = req.params;

        const expense = await expenseService.getExpenseById(id);

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Expense fetched successfully",
            data: expense
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const createExpense = async (req, res) => {

    try {

        const expense = await expenseService.createExpense(req.body);

        res.status(201).json({
            success: true,
            message: "Expense created successfully",
            data: expense
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

const updateExpense = async (req, res) => {

    try {

        const { id } = req.params;

        const expense = await expenseService.updateExpense(id, req.body);

        if (!expense) {

            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });

        }

        res.status(200).json({
            success: true,
            message: "Expense updated successfully",
            data: expense
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

const deleteExpense = async (req, res) => {

    try {

        const { id } = req.params;

        const expense = await expenseService.deleteExpense(id);

        if (!expense) {

            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });

        }

        res.status(200).json({
            success: true,
            message: "Expense deleted successfully",
            data: expense
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

module.exports = {
    getAllExpenses,
    getExpenseById,
    createExpense,
    updateExpense,
    deleteExpense
};