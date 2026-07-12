const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const authenticate = require('../middlewares/auth.middleware');

router.use(authenticate);

router.get('/dashboard-stats', reportController.getDashboardAnalytics);
router.get('/charts', reportController.getCharts);
router.get('/insights', reportController.getInsights);

module.exports = router;
