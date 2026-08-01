/**
 * Migration: Create driver_safety table
 * Run once with: node migrate-safety.js
 */
const pool = require('./src/config/db');

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Running driver_safety migration...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS driver_safety (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

                driver_id UUID NOT NULL UNIQUE,

                -- License tracking (can differ from admin's original)
                license_expiry_date DATE,

                -- Trip safety metrics
                trip_failures INTEGER DEFAULT 0,
                total_accidents INTEGER DEFAULT 0,

                -- Accident records stored as JSONB array
                -- Each item: { date, description, driver_survived, goods_damaged, goods_details }
                accident_records JSONB DEFAULT '[]'::jsonb,

                -- Goods safety
                goods_damaged_incidents INTEGER DEFAULT 0,
                goods_damage_notes TEXT,

                -- General safety officer notes
                notes TEXT,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                CONSTRAINT fk_safety_driver
                    FOREIGN KEY(driver_id)
                    REFERENCES drivers(id)
                    ON DELETE CASCADE
            );
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_driver_safety_driver
            ON driver_safety(driver_id);
        `);

        console.log('✅ driver_safety table created (or already exists).');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
