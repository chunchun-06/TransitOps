const express = require('express');
const router = express.Router();
const controller = require('../controllers/toll_rate.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

router.use(authenticate);

// Publicly available to authenticated users for estimation & viewing
router.get('/', controller.getTollRates);
router.get('/estimate', controller.getTollEstimate);

// Protected actions for Admin and Fleet Manager
router.post('/', authorize('Admin', 'Fleet Manager'), controller.createTollRate);
router.put('/:id', authorize('Admin', 'Fleet Manager'), controller.updateTollRate);
router.delete('/:id', authorize('Admin', 'Fleet Manager'), controller.deleteTollRate);

module.exports = router;
