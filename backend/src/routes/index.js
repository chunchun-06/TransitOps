const express = require("express");
const router = express.Router();
const userRoutes = require("./user.routes");

const authRoutes = require("./auth.routes");
const vehicleRoutes = require("./vehicle.routes");
const driverRoutes = require("./driver.routes");
const reportRoutes = require("./report.routes");
const tripRoutes = require("./trip.routes");
const financeRoutes = require("./finance.routes");
const safetyRoutes = require("./safety.routes");

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/vehicles", vehicleRoutes);
router.use("/drivers", driverRoutes);
router.use("/reports", reportRoutes);
router.use("/trips", tripRoutes);
router.use("/safety", safetyRoutes);
router.use("/", financeRoutes);

module.exports = router;