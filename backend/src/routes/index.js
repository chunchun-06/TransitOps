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
const fuelPriceRoutes = require("./fuel_price.routes");
const analyticsRoutes = require("./analytics.routes");
const marketFuelRoutes = require("./market_fuel.routes");
const dashboardRoutes = require("./dashboard.routes");
const tollRateRoutes = require("./toll_rate.routes");

const fuelRoutes = require("./fuel.routes");

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/vehicles", vehicleRoutes);
router.use("/drivers", driverRoutes);
router.use("/reports", reportRoutes);
router.use("/trips", tripRoutes);
router.use("/safety", safetyRoutes);
router.use("/fuel-price", fuelPriceRoutes);
router.use("/fuel", fuelRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/market-fuel", marketFuelRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/toll-rates", tollRateRoutes);
router.use("/", financeRoutes);

module.exports = router;