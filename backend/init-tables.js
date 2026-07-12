const { Pool } = require('pg');
require('dotenv').config({ path: 'e:/transist/TransitOps/backend/.env' });
const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME,
});

const run = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS trips (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                vehicle_id UUID REFERENCES vehicles(id),
                driver_id UUID REFERENCES drivers(id),
                status VARCHAR(50) DEFAULT 'Draft',
                distance DECIMAL(10,2) DEFAULT 0,
                duration VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS fuel (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                vehicle_id UUID REFERENCES vehicles(id),
                amount DECIMAL(10,2) DEFAULT 0,
                quantity DECIMAL(10,2) DEFAULT 0,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS expenses (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                vehicle_id UUID REFERENCES vehicles(id),
                amount DECIMAL(10,2) DEFAULT 0,
                type VARCHAR(100),
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS maintenance (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                vehicle_id UUID REFERENCES vehicles(id),
                cost DECIMAL(10,2) DEFAULT 0,
                status VARCHAR(50) DEFAULT 'Pending',
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Tables ensured");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
run();
