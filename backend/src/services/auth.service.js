const db = require("../config/db");
const { comparePassword } = require("../utils/hash");
const { generateToken } = require("../utils/jwt");
const ApiError = require("../utils/error");

const login = async (email, password) => {
    const query = `
        SELECT
            users.id,
            users.username,
            users.email,
            users.password_hash,
            roles.name AS role
        FROM users
        INNER JOIN roles
            ON users.role_id = roles.id
        WHERE users.email = $1
    `;

    const { rows } = await db.query(query, [email]);

    if (rows.length === 0) {
        throw new Error("Invalid email or password");
    }

    const user = rows[0];

    const isMatch = await comparePassword(
        password,
        user.password_hash
    );

    if (!isMatch) {
        throw new ApiError(
            401,
            "Invalid email or password"
        );
    }

    const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
    });

    delete user.password_hash;

    return {
        token,
        user,
    };
};

const getCurrentUser = async (id) => {

    const query = `
        SELECT
            users.id,
            users.username,
            users.email,
            roles.name AS role
        FROM users
        INNER JOIN roles
            ON users.role_id = roles.id
        WHERE users.id = $1
    `;

    const { rows } = await db.query(query, [id]);

    if (rows.length === 0) {
        throw new ApiError(
            404,
            "User not found"
        );
    }

    return rows[0];
};

module.exports = {
    login,
    getCurrentUser,
};