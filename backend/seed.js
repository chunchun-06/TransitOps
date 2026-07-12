const { hashPassword } = require("./src/utils/hash");
const db = require("./src/config/db");
require("dotenv").config();

const seed = async () => {
    try {
        console.log("Seeding database...");

        // Define roles
        const roles = [
            "Fleet Manager",
            "Dispatcher",
            "Safety Officer",
            "Financial Analyst"
        ];

        // Insert roles if not exist
        for (const role of roles) {
            await db.query(
                `INSERT INTO roles (name)
                 VALUES ($1)
                 ON CONFLICT (name) DO NOTHING`,
                [role]
            );
        }
        console.log("Roles seeded.");

        // Create an admin user (Fleet Manager)
        const adminEmail = "admin@transitops.com";
        const adminPassword = await hashPassword("admin123");

        // Get Fleet Manager role ID
        const roleRes = await db.query(`SELECT id FROM roles WHERE name = $1`, ["Fleet Manager"]);
        
        if (roleRes.rows.length > 0) {
            const roleId = roleRes.rows[0].id;
            
            await db.query(
                `INSERT INTO users (username, email, password_hash, role_id)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (email) DO NOTHING`,
                ["Admin", adminEmail, adminPassword, roleId]
            );
            console.log("Admin user seeded: admin@transitops.com / admin123");
        }

        console.log("Seeding complete.");
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
};

seed();
