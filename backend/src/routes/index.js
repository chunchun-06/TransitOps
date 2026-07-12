const express = require("express");
const router = express.Router();
const userRoutes = require("./user.routes");

const authRoutes = require("./auth.routes");
const vehicleRoutes = require("./vehicle.routes");
const driverRoutes = require("./driver.routes");

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/vehicles", vehicleRoutes);
router.use("/drivers", driverRoutes);

module.exports = router;