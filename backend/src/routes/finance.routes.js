const express = require('express');
const router = express.Router();
const financeController = require('../controllers/finance.controller');
const authenticate = require('../middlewares/auth.middleware');

router.use(authenticate);

// Maintenance
router.get('/maintenance', financeController.getMaintenanceLogs);
router.post('/maintenance', financeController.createMaintenanceLog);
router.put('/maintenance/:id', financeController.updateMaintenanceLog);
router.patch('/maintenance/:id/status', financeController.updateMaintenanceStatus);
router.delete('/maintenance/:id', financeController.deleteMaintenanceLog);

// Fuel
router.get('/fuel', financeController.getFuelLogs);
router.post('/fuel', financeController.createFuelLog);
router.delete('/fuel/:id', financeController.deleteFuelLog);

// Expenses
router.get('/expenses', financeController.getExpenses);
router.post('/expenses', financeController.createExpense);
router.delete('/expenses/:id', financeController.deleteExpense);

module.exports = router;
