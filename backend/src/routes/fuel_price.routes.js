const express = require('express');
const router = express.Router();
const fuelPriceController = require('../controllers/fuel_price.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

router.use(authenticate);

router.get('/current', fuelPriceController.getCurrentPrice);
router.get('/history', fuelPriceController.getPriceHistory);

// Fleet Manager / Admin allowed to publish & modify fuel prices
router.post('/', authorize('Fleet Manager', 'Admin'), fuelPriceController.createPrice);
router.put('/:id', authorize('Fleet Manager', 'Admin'), fuelPriceController.updatePrice);
router.delete('/:id', authorize('Fleet Manager', 'Admin'), fuelPriceController.deletePrice);

module.exports = router;
