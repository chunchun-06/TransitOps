const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driver.controller');
const authenticate = require('../middlewares/auth.middleware');

router.use(authenticate);

router.route('/')
    .get(driverController.getDrivers)
    .post(driverController.createDriver);

router.get('/available', driverController.getAvailableDrivers);

router.post('/bulk-delete', driverController.bulkDelete);
router.patch('/bulk-status', driverController.bulkUpdateStatus);

router.route('/:id')
    .get(driverController.getDriverById)
    .put(driverController.updateDriver)
    .delete(driverController.deleteDriver);

router.patch('/:id/status', driverController.updateStatus);

module.exports = router;
