/**
 * TransitOps v2 Migration
 * Adds: engine_cc, purchase_year to vehicles
 *       toll_amount, total_trip_cost to trips
 *       toll_rate_master table
 * Safe to run on existing data — uses ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS
 */
require('dotenv').config();
const pool = require('./src/config/db');

async function migrateV2() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting TransitOps v2 migration...\n');

        // ── 1. vehicles: engine_cc, purchase_year ──────────────────────────────
        console.log('📋 Altering vehicles table...');
        await client.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS engine_cc INTEGER`);
        await client.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS purchase_year INTEGER`);
        console.log('  ✅ vehicles: engine_cc, purchase_year');

        // ── 2. trips: toll_amount, total_trip_cost ────────────────────────────
        console.log('📋 Altering trips table...');
        await client.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS toll_amount DECIMAL(12,2) DEFAULT 0`);
        await client.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS total_trip_cost DECIMAL(12,2)`);
        console.log('  ✅ trips: toll_amount, total_trip_cost');

        // ── 3. toll_rate_master table ─────────────────────────────────────────
        console.log('📋 Creating toll_rate_master table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS toll_rate_master (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                toll_name VARCHAR(200) NOT NULL,
                location VARCHAR(200),
                highway VARCHAR(100),
                state VARCHAR(100),
                vehicle_class VARCHAR(50) NOT NULL DEFAULT 'Truck',
                toll_amount DECIMAL(8,2) NOT NULL,
                active BOOLEAN DEFAULT true,
                effective_from DATE DEFAULT CURRENT_DATE,
                notes TEXT,
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_toll_rate_vehicle_class ON toll_rate_master(vehicle_class, active)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_toll_rate_state ON toll_rate_master(state)`);
        console.log('  ✅ toll_rate_master table created');

        // ── 4. Seed sample toll rates ─────────────────────────────────────────
        const tollCheck = await client.query(`SELECT COUNT(*) FROM toll_rate_master`);
        if (parseInt(tollCheck.rows[0].count) === 0) {
            const sampleTolls = [
                ['Chennai Outer Ring Road Toll', 'Chennai, TN', 'ORR', 'Tamil Nadu', 'Truck', 130],
                ['Chennai Outer Ring Road Toll', 'Chennai, TN', 'ORR', 'Tamil Nadu', 'Van', 75],
                ['Chennai Outer Ring Road Toll', 'Chennai, TN', 'ORR', 'Tamil Nadu', 'Car', 45],
                ['Walajapet Toll Plaza', 'Walajapet, TN', 'NH44', 'Tamil Nadu', 'Truck', 155],
                ['Walajapet Toll Plaza', 'Walajapet, TN', 'NH44', 'Tamil Nadu', 'Van', 85],
                ['Walajapet Toll Plaza', 'Walajapet, TN', 'NH44', 'Tamil Nadu', 'Car', 55],
                ['Sriperumbudur Toll', 'Sriperumbudur, TN', 'NH48', 'Tamil Nadu', 'Truck', 110],
                ['Sriperumbudur Toll', 'Sriperumbudur, TN', 'NH48', 'Tamil Nadu', 'Van', 65],
                ['Kanchipuram Bypass Toll', 'Kanchipuram, TN', 'NH32', 'Tamil Nadu', 'Truck', 95],
                ['Coimbatore Bypass Toll', 'Coimbatore, TN', 'NH544', 'Tamil Nadu', 'Truck', 120],
                ['Coimbatore Bypass Toll', 'Coimbatore, TN', 'NH544', 'Tamil Nadu', 'Van', 70],
            ];
            for (const [name, loc, highway, state, vClass, amount] of sampleTolls) {
                await client.query(
                    `INSERT INTO toll_rate_master (toll_name, location, highway, state, vehicle_class, toll_amount) VALUES ($1,$2,$3,$4,$5,$6)`,
                    [name, loc, highway, state, vClass, amount]
                );
            }
            console.log('  ✅ Sample Tamil Nadu toll rates seeded');
        } else {
            console.log('  ℹ️  Toll rates already exist, skipping seed');
        }

        console.log('\n🎉 v2 Migration completed successfully!\n');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        console.error(err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrateV2();
