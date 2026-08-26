const express = require('express');
const router = express.Router();
const fuelAnalyticsController = require('../controllers/fuel_analytics.controller');
const authenticate = require('../middlewares/auth.middleware');

router.use(authenticate);

router.get('/analytics', fuelAnalyticsController.getFuelAnalytics);

module.exports = router;
