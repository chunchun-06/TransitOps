/**
 * TransitOps Enhancement Migration
 * Non-destructive ALTER TABLE migrations – safe to run on existing data.
 * Run with: node migrate-enhance.js
 */
require('dotenv').config();
const pool = require('./src/config/db');

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting TransitOps enhancement migration...\n');

        // ── 1. vehicles – fuel fields ──────────────────────────────────────────
        console.log('📋 Altering vehicles table...');
        await client.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(20) DEFAULT 'Diesel'`);
        await client.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_efficiency_kmpl DECIMAL(6,2)`);
        await client.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_tank_capacity_liters DECIMAL(8,2)`);
        await client.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_fuel_level_liters DECIMAL(8,2) DEFAULT 0`);
        console.log('  ✅ vehicles: fuel_type, fuel_efficiency_kmpl, fuel_tank_capacity_liters, current_fuel_level_liters');

        // ── 2. trips – geo + fuel fields ──────────────────────────────────────
        console.log('📋 Altering trips table...');
        await client.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS source_latitude DECIMAL(10,7)`);
        await client.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS source_longitude DECIMAL(10,7)`);
        await client.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS destination_latitude DECIMAL(10,7)`);
        await client.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS destination_longitude DECIMAL(10,7)`);
        await client.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS estimated_duration_min INTEGER`);
        await client.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS estimated_fuel_liters DECIMAL(10,2)`);
        await client.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS current_fuel_liters DECIMAL(10,2)`);
        await client.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS additional_fuel_required_liters DECIMAL(10,2)`);
        await client.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS estimated_fuel_cost DECIMAL(12,2)`);
        await client.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS actual_fuel_cost DECIMAL(12,2)`);
        await client.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS fuel_price_per_liter DECIMAL(8,2)`);
        console.log('  ✅ trips: lat/lng, duration, fuel calc fields');

        // ── 3. fuel – price per liter ─────────────────────────────────────────
        console.log('📋 Altering fuel table...');
        await client.query(`ALTER TABLE fuel ADD COLUMN IF NOT EXISTS price_per_liter DECIMAL(8,2)`);
        await client.query(`ALTER TABLE fuel ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(20) DEFAULT 'Diesel'`);
        console.log('  ✅ fuel: price_per_liter, fuel_type');

        // ── 4. maintenance – completion dates ─────────────────────────────────
        console.log('📋 Altering maintenance table...');
        await client.query(`ALTER TABLE maintenance ADD COLUMN IF NOT EXISTS expected_completion DATE`);
        await client.query(`ALTER TABLE maintenance ADD COLUMN IF NOT EXISTS actual_completion DATE`);
        console.log('  ✅ maintenance: expected_completion, actual_completion');

        // ── 5. fuel_price table ───────────────────────────────────────────────
        console.log('📋 Creating fuel_price table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS fuel_price (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                fuel_type VARCHAR(20) NOT NULL DEFAULT 'Diesel',
                price_per_liter DECIMAL(8,2) NOT NULL,
                effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
                effective_to DATE,
                notes TEXT,
                created_by UUID,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_fuel_price_user
                    FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('  ✅ fuel_price table created');

        // ── 6. Seed default fuel price if none exists ─────────────────────────
        const priceCheck = await client.query(`SELECT COUNT(*) FROM fuel_price`);
        if (parseInt(priceCheck.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO fuel_price (fuel_type, price_per_liter, effective_from, notes)
                VALUES ('Diesel', 100.00, CURRENT_DATE, 'Initial default price')
            `);
            console.log('  ✅ Default diesel price seeded: ₹100/L');
        } else {
            console.log('  ℹ️  Fuel price already exists, skipping seed');
        }

        // ── 7. Seed Dispatcher role ───────────────────────────────────────────
        console.log('📋 Seeding Dispatcher role...');
        await client.query(`
            INSERT INTO roles (name, description)
            VALUES ('Dispatcher', 'Manages trip dispatching and route assignment')
            ON CONFLICT (name) DO NOTHING
        `);
        console.log('  ✅ Dispatcher role seeded');

        // ── 8. Performance indexes ────────────────────────────────────────────
        console.log('📋 Creating performance indexes...');
        await client.query(`CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at DESC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_trips_start_time ON trips(start_time)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_fuel_date ON fuel(date DESC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_maintenance_service_date ON maintenance(service_date DESC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_vehicle_status ON vehicles(status)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_driver_status ON drivers(status)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_fuel_price_type ON fuel_price(fuel_type, effective_from DESC)`);
        console.log('  ✅ Indexes created');

        console.log('\n🎉 Migration completed successfully!\n');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        console.error(err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
