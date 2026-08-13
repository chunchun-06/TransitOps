const express = require('express');
const router = express.Router();
const fuelPriceController = require('../controllers/fuel_price.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

router.use(authenticate);

router.get('/current', fuelPriceController.getCurrentPrice);
router.get('/history', fuelPriceController.getPriceHistory);

// Admin / Fleet Manager only allowed to modify prices
router.post('/', authorize('Fleet Manager'), fuelPriceController.createPrice);
router.put('/:id', authorize('Fleet Manager'), fuelPriceController.updatePrice);
router.delete('/:id', authorize('Fleet Manager'), fuelPriceController.deletePrice);

module.exports = router;
