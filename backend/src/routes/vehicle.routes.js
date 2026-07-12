const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicle.controller');
const authenticate = require('../middlewares/auth.middleware');

router.use(authenticate);

router.route('/')
    .get(vehicleController.getVehicles)
    .post(vehicleController.createVehicle);

router.get('/available', vehicleController.getAvailableVehicles);

router.post('/bulk-delete', vehicleController.bulkDelete);
router.patch('/bulk-status', vehicleController.bulkUpdateStatus);

router.route('/:id')
    .get(vehicleController.getVehicleById)
    .put(vehicleController.updateVehicle)
    .delete(vehicleController.deleteVehicle);

module.exports = router;
