const express = require("express");
const router = express.Router();
const userRoutes = require("./user.routes");

const authRoutes = require("./auth.routes");

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
module.exports = router;