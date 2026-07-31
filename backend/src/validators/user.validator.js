const Joi = require("joi");

const createUserSchema = Joi.object({
    username: Joi.string().min(3).max(100).required(),

    email: Joi.string().email().required(),

    password: Joi.string().min(6).required(),

    role: Joi.string()
        .valid(
            "Fleet Manager",
            "Dispatcher",
            "Driver",
            "Safety Officer",
            "Financial Analyst"
        )
        .required(),
});

module.exports = {
    createUserSchema,
};