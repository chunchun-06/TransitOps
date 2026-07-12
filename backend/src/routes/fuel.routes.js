const express = require("express");

const router = express.Router();

const fuelController = require("../controllers/fuel.controller");

// GET ALL
router.get("/", fuelController.getAllFuelLogs);

// GET BY ID
router.get("/:id", fuelController.getFuelLogById);

// CREATE
router.post("/", fuelController.createFuelLog);

// UPDATE
router.put("/:id", fuelController.updateFuelLog);

// DELETE
router.delete("/:id", fuelController.deleteFuelLog);

module.exports = router;