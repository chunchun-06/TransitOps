const authService = require("../services/auth.service");
const ApiResponse = require("../utils/response");

const login = async (req, res, next) => {
    try {

        const data = await authService.login(
            req.body.email,
            req.body.password
        );

        return res.status(200).json(
            new ApiResponse(
                true,
                "Login successful",
                data
            )
        );

    } catch (error) {
        next(error);
    }
};

const me = async (req, res, next) => {
    try {

        const user = await authService.getCurrentUser(req.user.id);

        return res.status(200).json(
            new ApiResponse(
                true,
                "User fetched successfully",
                user
            )
        );

    } catch (error) {
        next(error);
    }
};


const logout = async (req, res, next) => {
    try {

        return res.status(200).json(
            new ApiResponse(
                "Logged out successfully"
            )
        );

    } catch (error) {
        next(error);
    }
};
module.exports = {
    login,
    me,
    logout,
};