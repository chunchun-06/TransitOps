const express = require("express");
const router = express.Router();
const {
    changePasswordSchema
} = require("../validators/auth.validator");
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

router.put(
    "/change-password",
    authenticate,
    validate(changePasswordSchema),
    authController.changePassword
);
router.get(
    "/me",
    authenticate,
    authController.me
);

module.exports = router;