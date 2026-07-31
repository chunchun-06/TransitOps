const express = require("express");

const router = express.Router();

const controller = require("../controllers/user.controller");

const validate = require("../middlewares/validate.middleware");

const authenticate = require("../middlewares/auth.middleware");

const authorize = require("../middlewares/role.middleware");

const {
    createUserSchema,
} = require("../validators/user.validator");

// GET all users
router.get(
    "/",
    authenticate,
    authorize("Fleet Manager"),
    controller.getUsers
);

// POST create user
router.post(
    "/",
    authenticate,
    authorize("Fleet Manager"),
    validate(createUserSchema),
    controller.createUser
);

// PATCH update role
router.patch(
    "/:id/role",
    authenticate,
    authorize("Fleet Manager"),
    controller.updateUserRole
);

// DELETE user
router.delete(
    "/:id",
    authenticate,
    authorize("Fleet Manager"),
    controller.deleteUser
);

module.exports = router;