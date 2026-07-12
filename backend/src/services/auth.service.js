const { generateToken } = require("../utils/jwt");
const ApiError = require("../utils/error");
const { hashPassword, comparePassword } = require("../utils/hash");
const db = require("../config/db");

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
    accessToken: token,
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
const changePassword = async (
    userId,
    currentPassword,
    newPassword
) => {

    const { rows } = await db.query(
        `
        SELECT password_hash
        FROM users
        WHERE id = $1
        `,
        [userId]
    );

    if (!rows.length) {
        throw new ApiError(404, "User not found");
    }

    const valid = await comparePassword(
        currentPassword,
        rows[0].password_hash
    );

    if (!valid) {
        throw new ApiError(
            400,
            "Current password is incorrect"
        );
    }

    const hashed = await hashPassword(newPassword);

    await db.query(
        `
        UPDATE users
        SET password_hash = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        `,
        [hashed, userId]
    );

    return null;
};
module.exports = {
    login,
    getCurrentUser,
    changePassword,
};