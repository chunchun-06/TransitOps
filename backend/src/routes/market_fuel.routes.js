const express = require('express');
const router = express.Router();
const { getMarketRates } = require('../controllers/market_fuel.controller');
const authenticate = require('../middlewares/auth.middleware');

router.use(authenticate);

// GET /api/market-fuel/rates
router.get('/rates', getMarketRates);

module.exports = router;
