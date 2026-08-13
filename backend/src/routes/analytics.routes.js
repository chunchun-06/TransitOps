const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

router.use(authenticate);

// Financial Analyst and Fleet Manager are authorized to view financials
router.get('/financial', authorize('Fleet Manager', 'Financial Analyst'), analyticsController.getFinancialAnalytics);
router.get('/vehicle/:id', authorize('Fleet Manager', 'Financial Analyst'), analyticsController.getVehicleFinancials);

module.exports = router;
