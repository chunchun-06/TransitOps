const userService = require("../services/user.service");
const ApiResponse = require("../utils/response");

const createUser = async (req, res, next) => {
    try {

        const user = await userService.createUser(req.body);

        return res.status(201).json(
            new ApiResponse(
                "User created successfully",
                user
            )
        );

    } catch (err) {
        next(err);
    }
};

module.exports = {
    createUser,
};