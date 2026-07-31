const userService = require("../services/user.service");
const ApiResponse = require("../utils/response");

const getUsers = async (req, res, next) => {
    try {
        const users = await userService.getUsers();
        return res.status(200).json(new ApiResponse("Users fetched", users));
    } catch (err) {
        next(err);
    }
};

const createUser = async (req, res, next) => {
    try {
        const user = await userService.createUser(req.body);
        return res.status(201).json(new ApiResponse("User created successfully", user));
    } catch (err) {
        next(err);
    }
};

const updateUserRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const user = await userService.updateUserRole(id, role);
        return res.status(200).json(new ApiResponse("Role updated", user));
    } catch (err) {
        next(err);
    }
};

const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        await userService.deleteUser(id);
        return res.status(200).json(new ApiResponse("User deleted"));
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getUsers,
    createUser,
    updateUserRole,
    deleteUser,
};