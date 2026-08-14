/**
 * TransitOps Migration v3
 * Adds engine_cc, purchase_year to vehicles.
 * Creates toll_rate_master table.
 * Adds toll/cost columns to trips table.
 * Safe to re-run (all IF NOT EXISTS).
 * Run with: node migrate-v3.js
 */
require('dotenv').config();
const pool = require('./src/config/db');

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting TransitOps v3 migration...\n');

        // ── 1. vehicles – engine & year fields ────────────────────────────────
        console.log('📋 Altering vehicles table...');
        await client.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS engine_cc INTEGER`);
        await client.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS purchase_year INTEGER`);
        console.log('  ✅ vehicles: engine_cc, purchase_year');

        // ── 2. trips – toll & total cost fields ───────────────────────────────
        console.log('📋 Altering trips table...');
        await client.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS toll_amount DECIMAL(12,2) DEFAULT 0`);
        await client.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS total_trip_cost DECIMAL(14,2)`);
        await client.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS start_odometer DECIMAL(12,2)`);
        await client.query(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS actual_fuel_cost DECIMAL(12,2)`);
        console.log('  ✅ trips: toll_amount, total_trip_cost, start_odometer, actual_fuel_cost');

        // ── 3. toll_rate_master table ─────────────────────────────────────────
        console.log('📋 Creating toll_rate_master table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS toll_rate_master (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                toll_name VARCHAR(100) NOT NULL,
                location VARCHAR(200),
                highway VARCHAR(100),
                state VARCHAR(100),
                vehicle_class VARCHAR(50) NOT NULL,
                toll_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                active BOOLEAN DEFAULT TRUE,
                notes TEXT,
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✅ toll_rate_master table created');

        // ── 4. Seed toll data ─────────────────────────────────────────────────
        const tollCheck = await client.query(`SELECT COUNT(*) FROM toll_rate_master`);
        if (parseInt(tollCheck.rows[0].count) === 0) {
            console.log('📋 Seeding toll rate master data...');
            const tollData = [
                // Tamil Nadu
                ['Vandalur Toll', 'Vandalur, Chennai', 'NH 48', 'Tamil Nadu', 'Van',    110, true],
                ['Vandalur Toll', 'Vandalur, Chennai', 'NH 48', 'Tamil Nadu', 'Truck',  190, true],
                ['Vandalur Toll', 'Vandalur, Chennai', 'NH 48', 'Tamil Nadu', 'Mini',    80, true],
                ['Sriperumbudur Toll', 'Sriperumbudur', 'NH 48', 'Tamil Nadu', 'Van',   130, true],
                ['Sriperumbudur Toll', 'Sriperumbudur', 'NH 48', 'Tamil Nadu', 'Truck', 220, true],
                ['Sriperumbudur Toll', 'Sriperumbudur', 'NH 48', 'Tamil Nadu', 'Mini',  90, true],
                ['Tada Toll', 'Tada', 'NH 16', 'Tamil Nadu', 'Van',    115, true],
                ['Tada Toll', 'Tada', 'NH 16', 'Tamil Nadu', 'Truck',  200, true],
                // Karnataka
                ['Hoskote Toll', 'Hoskote', 'NH 648', 'Karnataka', 'Van',    120, true],
                ['Hoskote Toll', 'Hoskote', 'NH 648', 'Karnataka', 'Truck',  210, true],
                ['Hoskote Toll', 'Hoskote', 'NH 648', 'Karnataka', 'Mini',    85, true],
                ['Tumkur Road Toll', 'Tumkur', 'NH 48', 'Karnataka', 'Van',   135, true],
                ['Tumkur Road Toll', 'Tumkur', 'NH 48', 'Karnataka', 'Truck', 230, true],
                // Maharashtra
                ['Khopoli Toll', 'Khopoli', 'Mumbai-Pune Expressway', 'Maharashtra', 'Van',    155, true],
                ['Khopoli Toll', 'Khopoli', 'Mumbai-Pune Expressway', 'Maharashtra', 'Truck',  265, true],
                ['Khopoli Toll', 'Khopoli', 'Mumbai-Pune Expressway', 'Maharashtra', 'Mini',   110, true],
                ['Sion Panvel Toll', 'Sion', 'NH 4', 'Maharashtra', 'Van',   140, true],
                ['Sion Panvel Toll', 'Sion', 'NH 4', 'Maharashtra', 'Truck', 240, true],
                // Gujarat
                ['Ahmedabad Ring Toll', 'Ahmedabad', 'NH 48', 'Gujarat', 'Van',    100, true],
                ['Ahmedabad Ring Toll', 'Ahmedabad', 'NH 48', 'Gujarat', 'Truck',  175, true],
                ['Ahmedabad Ring Toll', 'Ahmedabad', 'NH 48', 'Gujarat', 'Mini',    70, true],
                // Delhi / NCR
                ['Kundli Toll', 'Kundli', 'NH 44', 'Delhi', 'Van',    125, true],
                ['Kundli Toll', 'Kundli', 'NH 44', 'Delhi', 'Truck',  215, true],
                ['DND Flyway Toll', 'Noida', 'DND', 'Delhi', 'Van',    95, true],
                ['DND Flyway Toll', 'Noida', 'DND', 'Delhi', 'Truck', 170, true],
                // Uttar Pradesh
                ['Yamuna Expressway Toll 1', 'Greater Noida', 'Yamuna Expressway', 'Uttar Pradesh', 'Van',    165, true],
                ['Yamuna Expressway Toll 1', 'Greater Noida', 'Yamuna Expressway', 'Uttar Pradesh', 'Truck',  280, true],
                // Rajasthan
                ['Jaipur-Agra Toll', 'Dausa', 'NH 21', 'Rajasthan', 'Van',    130, true],
                ['Jaipur-Agra Toll', 'Dausa', 'NH 21', 'Rajasthan', 'Truck',  225, true],
                // Telangana
                ['Outer Ring Road Toll', 'Hyderabad', 'ORR', 'Telangana', 'Van',   120, true],
                ['Outer Ring Road Toll', 'Hyderabad', 'ORR', 'Telangana', 'Truck', 205, true],
                ['Outer Ring Road Toll', 'Hyderabad', 'ORR', 'Telangana', 'Mini',   80, true],
            ];

            for (const [toll_name, location, highway, state, vehicle_class, toll_amount, active] of tollData) {
                await client.query(
                    `INSERT INTO toll_rate_master (toll_name, location, highway, state, vehicle_class, toll_amount, active)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     ON CONFLICT DO NOTHING`,
                    [toll_name, location, highway, state, vehicle_class, toll_amount, active]
                );
            }
            console.log(`  ✅ Seeded ${tollData.length} toll rate entries`);
        } else {
            console.log('  ℹ️  Toll rates already exist, skipping seed');
        }

        // ── 5. Indexes for toll_rate_master ───────────────────────────────────
        await client.query(`CREATE INDEX IF NOT EXISTS idx_toll_state ON toll_rate_master(state)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_toll_class ON toll_rate_master(vehicle_class)`);
        console.log('  ✅ toll_rate_master indexes created');

        console.log('\n🎉 Migration v3 completed successfully!\n');
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
