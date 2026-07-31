const db = require("../config/db");
const { hashPassword } = require("../utils/hash");
const ApiError = require("../utils/error");

const getUsers = async () => {
    const result = await db.query(`
        SELECT users.id, users.username, users.email, roles.name AS role, users.created_at
        FROM users
        INNER JOIN roles ON users.role_id = roles.id
        ORDER BY users.created_at DESC
    `);
    return result.rows;
};

const createUser = async ({ username, email, password, role }) => {
    // Check role exists
    const roleResult = await db.query("SELECT id FROM roles WHERE name = $1", [role]);
    if (roleResult.rows.length === 0) {
        throw new ApiError(404, `Role "${role}" not found`);
    }
    const roleId = roleResult.rows[0].id;

    // Check email uniqueness
    const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
        throw new ApiError(409, "A user with this email already exists");
    }

    const hashedPassword = await hashPassword(password);

    const result = await db.query(
        `INSERT INTO users (username, email, password_hash, role_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, email`,
        [username, email, hashedPassword, roleId]
    );

    return result.rows[0];
};

const updateUserRole = async (id, role) => {
    const roleResult = await db.query("SELECT id FROM roles WHERE name = $1", [role]);
    if (roleResult.rows.length === 0) {
        throw new ApiError(404, `Role "${role}" not found`);
    }
    const roleId = roleResult.rows[0].id;

    const result = await db.query(
        `UPDATE users SET role_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, username, email`,
        [roleId, id]
    );

    if (result.rows.length === 0) {
        throw new ApiError(404, "User not found");
    }

    return result.rows[0];
};

const deleteUser = async (id) => {
    const result = await db.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) {
        throw new ApiError(404, "User not found");
    }
};

module.exports = {
    getUsers,
    createUser,
    updateUserRole,
    deleteUser,
};