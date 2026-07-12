const express = require("express");

const router = express.Router();

const fuelRoutes = require("./fuel.routes");
const expenseRoutes = require("./expense.routes");

// Fuel Module
router.use("/fuel", fuelRoutes);

// Expense Module
router.use("/expenses", expenseRoutes);

module.exports = router;