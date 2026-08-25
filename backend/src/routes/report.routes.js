const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const exportController = require('../controllers/export.controller');
const authenticate = require('../middlewares/auth.middleware');

router.use(authenticate);

router.get('/dashboard-stats', reportController.getDashboardAnalytics);
router.get('/charts', reportController.getCharts);
router.get('/insights', reportController.getInsights);

// Export endpoints
router.get('/export/csv', exportController.exportCSV);
router.get('/export/pdf', exportController.exportPDF);

module.exports = router;
