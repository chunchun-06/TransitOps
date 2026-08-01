const express = require('express');
const router = express.Router();
const safetyController = require('../controllers/safety.controller');
const authenticate = require('../middlewares/auth.middleware');

router.use(authenticate);

// Get all safety records (optionally filtered by ?driver_id=xxx)
router.get('/', safetyController.getDriverSafety);

// Get safety record for a specific driver
router.get('/driver/:id', safetyController.getDriverSafetyByDriverId);

// Create or update safety record (upsert)
router.post('/', safetyController.upsertDriverSafety);

// Delete a safety record by its own id
router.delete('/:id', safetyController.deleteDriverSafety);

module.exports = router;
