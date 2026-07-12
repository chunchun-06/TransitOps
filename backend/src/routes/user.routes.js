const express = require("express");

const router = express.Router();

const controller = require("../controllers/user.controller");

const validate = require("../middlewares/validate.middleware");

const authenticate = require("../middlewares/auth.middleware");

const authorize = require("../middlewares/role.middleware");

const {
    createUserSchema,
} = require("../validators/user.validator");

router.post(
    "/",
    authenticate,
    authorize("Fleet Manager"),
    validate(createUserSchema),
    controller.createUser
);

module.exports = router;