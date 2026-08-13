const express = require('express');
const router = express.Router();
const tripController = require('../controllers/trip.controller');
const authenticate = require('../middlewares/auth.middleware');

router.use(authenticate);

router.get('/', tripController.getTrips);
router.get('/active', tripController.getActiveTrips);
router.post('/', tripController.createTrip);
router.put('/:id', tripController.updateTrip);
router.delete('/:id', tripController.deleteTrip);

module.exports = router;
