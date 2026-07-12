const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");

const authenticate = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");

const { loginSchema } = require("../validators/auth.validator");

router.post(
    "/login",
    validate(loginSchema),
    authController.login
);


router.post(
    "/logout",
    authenticate,
    authController.logout
);
router.get(
    "/me",
    authenticate,
    authController.me
);

module.exports = router;