require("dotenv").config();

const db = require("../config/db");
const { hashPassword } = require("../utils/hash");

async function seed() {
    try {

        const roles = [
            {
                name: "Fleet Manager",
                description: "Manages fleet operations"
            },
            {
                name: "Driver",
                description: "Vehicle driver"
            },
            {
                name: "Safety Officer",
                description: "Monitors safety compliance"
            },
            {
                name: "Financial Analyst",
                description: "Handles operational finance"
            }
        ];

        for (const role of roles) {

            await db.query(
                `
                INSERT INTO roles(name, description)
                VALUES($1,$2)
                ON CONFLICT(name) DO NOTHING
                `,
                [role.name, role.description]
            );

        }

        const role = await db.query(
            `
            SELECT id
            FROM roles
            WHERE name = 'Fleet Manager'
            `
        );

        const roleId = role.rows[0].id;

        const password = await hashPassword(process.env.ADMIN_PASSWORD);
        await db.query(
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
                $1,
                $2,
                $3,
                $4
            )
            ON CONFLICT(email)
            DO NOTHING
            `,
            [
                process.env.ADMIN_USERNAME,
                process.env.ADMIN_EMAIL,
                password,
                roleId
            ]
        );

        console.log("Seed completed");

    } catch (err) {

        console.error(err);

    } finally {

        process.exit();

    }
}

seed();