const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicle.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

router.use(authenticate);

router.route('/')
    .get(vehicleController.getVehicles)
    .post(authorize('Admin', 'Fleet Manager', 'Dispatcher'), vehicleController.createVehicle);

router.get('/available', vehicleController.getAvailableVehicles);

router.post('/bulk-delete', authorize('Admin', 'Fleet Manager'), vehicleController.bulkDelete);
router.patch('/bulk-status', authorize('Admin', 'Fleet Manager'), vehicleController.bulkUpdateStatus);

router.route('/:id')
    .get(vehicleController.getVehicleById)
    .put(authorize('Admin', 'Fleet Manager'), vehicleController.updateVehicle)
    .delete(authorize('Admin', 'Fleet Manager'), vehicleController.deleteVehicle);

module.exports = router;
