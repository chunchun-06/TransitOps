const express = require("express");
const router = express.Router();
const userRoutes = require("./user.routes");

const authRoutes = require("./auth.routes");
const vehicleRoutes = require("./vehicle.routes");

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/vehicles", vehicleRoutes);
module.exports = router;