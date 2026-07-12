const db = require("../config/db");
const { hashPassword } = require("../utils/hash");
const ApiError = require("../utils/error");

const createUser = async ({
    username,
    email,
    password,
    role,
}) => {

    const roleResult = await db.query(
        "SELECT id FROM roles WHERE name = $1",
        [role]
    );

    if (roleResult.rows.length === 0) {
        throw new ApiError(404, "Role not found");
    }

    const roleId = roleResult.rows[0].id;

    const hashedPassword = await hashPassword(password);

    const result = await db.query(
        `
        INSERT INTO users
        (
            username,
            email,
            password_hash,
            role_id
        )
        VALUES
        (
            $1,$2,$3,$4
        )
        RETURNING
        id,
        username,
        email
        `,
        [
            username,
            email,
            hashedPassword,
            roleId,
        ]
    );

    return result.rows[0];
};

module.exports = {
    createUser,
};