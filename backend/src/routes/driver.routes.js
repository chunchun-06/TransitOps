const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driver.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

router.use(authenticate);

router.route('/')
    .get(driverController.getDrivers)
    .post(authorize('Admin', 'Fleet Manager', 'Dispatcher'), driverController.createDriver);

router.get('/available', driverController.getAvailableDrivers);

router.post('/bulk-delete', authorize('Admin', 'Fleet Manager'), driverController.bulkDelete);
router.patch('/bulk-status', authorize('Admin', 'Fleet Manager'), driverController.bulkUpdateStatus);

router.route('/:id')
    .get(driverController.getDriverById)
    .put(authorize('Admin', 'Fleet Manager'), driverController.updateDriver)
    .delete(authorize('Admin', 'Fleet Manager'), driverController.deleteDriver);

router.patch('/:id/status', authorize('Admin', 'Fleet Manager'), driverController.updateStatus);

module.exports = router;
