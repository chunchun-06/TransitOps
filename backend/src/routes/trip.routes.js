const express = require('express');
const router = express.Router();
const tripController = require('../controllers/trip.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

router.use(authenticate);

router.get('/', tripController.getTrips);
router.get('/active', tripController.getActiveTrips);
router.post('/', authorize('Admin', 'Fleet Manager', 'Dispatcher'), tripController.createTrip);
router.put('/:id', authorize('Admin', 'Fleet Manager', 'Dispatcher', 'Driver'), tripController.updateTrip);
router.delete('/:id', authorize('Admin', 'Fleet Manager'), tripController.deleteTrip);

module.exports = router;
