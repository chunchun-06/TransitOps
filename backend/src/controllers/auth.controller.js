const authService = require("../services/auth.service");
const ApiResponse = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const login = asyncHandler(async (req, res) => {    
        const data = await authService.login(
            req.body.email,
            req.body.password
        );
        return res.status(200).json(
            new ApiResponse(
                "Login successful",
                {
                    accessToken: data.accessToken,
                    user: data.user,
                }
            )
        );
     
});

const me =asyncHandler(async (req, res, next) => {
        const user = await authService.getCurrentUser(req.user.id);

        return res.status(200).json(
            new ApiResponse(
                "User fetched successfully",
                user
            )
        );

    
});


const logout = asyncHandler(async (req, res ) => {
        return res.status(200).json(
            new ApiResponse(
                "Logged out successfully"
            )
        );

    
});

const changePassword = asyncHandler(async (
    req,
    res,
    next
) => {


        await authService.changePassword(
            req.user.id,
            req.body.currentPassword,
            req.body.newPassword
        );

        return res.status(200).json(
            new ApiResponse(
                "Password changed successfully"
            )
        );

    

});
module.exports = {
    login,
    me,
    logout,
    changePassword,
};