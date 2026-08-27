const express = require('express');
const router = express.Router();
const fuelPriceController = require('../controllers/fuel_price.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

router.use(authenticate);

router.get('/current', fuelPriceController.getCurrentPrice);
router.get('/history', fuelPriceController.getPriceHistory);

// Admin / Fleet Manager allowed to modify base fuel prices
router.post('/', authorize('Admin', 'Fleet Manager'), fuelPriceController.createPrice);
router.put('/:id', authorize('Admin', 'Fleet Manager'), fuelPriceController.updatePrice);
router.delete('/:id', authorize('Admin', 'Fleet Manager'), fuelPriceController.deletePrice);

module.exports = router;
