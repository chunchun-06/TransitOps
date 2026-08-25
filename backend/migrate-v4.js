/**
 * TransitOps Migration v4 - Vehicle/Driver Enhancements & Soft Deactivation
 * Run with: node migrate-v4.js
 */
require('dotenv').config();
const pool = require('./src/config/db');

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting TransitOps Migration v4...\n');

        // ── 1. Add current_driver_id and photo_url to vehicles table ───────────
        console.log('📋 Updating vehicles table structure...');
        await client.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL`);
        await client.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS photo_url TEXT`);
        console.log('  ✅ vehicles: current_driver_id, photo_url columns added.');

        // ── 2. Add photo_url to drivers table ──────────────────────────────────
        console.log('📋 Updating drivers table structure...');
        await client.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS photo_url TEXT`);
        console.log('  ✅ drivers: photo_url column added.');

        // ── 3. Update status CHECK constraints for vehicles and drivers ───────
        console.log('📋 Updating check constraints for vehicles & drivers status...');

        // Drop existing constraint if it exists on vehicles
        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_status_check'
                ) THEN
                    ALTER TABLE vehicles DROP CONSTRAINT vehicles_status_check;
                END IF;
            END $$;
        `);

        // Re-add status check constraint for vehicles allowing 'Inactive'
        await client.query(`
            ALTER TABLE vehicles ADD CONSTRAINT vehicles_status_check 
            CHECK (status IN ('Available', 'On Trip', 'In Shop', 'Retired', 'Inactive'));
        `);
        console.log('  ✅ vehicles: status CHECK constraint updated (Available, On Trip, In Shop, Retired, Inactive).');

        // Drop existing constraint if it exists on drivers
        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'drivers_status_check'
                ) THEN
                    ALTER TABLE drivers DROP CONSTRAINT drivers_status_check;
                END IF;
            END $$;
        `);

        // Re-add status check constraint for drivers allowing 'Inactive'
        await client.query(`
            ALTER TABLE drivers ADD CONSTRAINT drivers_status_check 
            CHECK (status IN ('Available', 'On Trip', 'Off Duty', 'Suspended', 'Inactive'));
        `);
        console.log('  ✅ drivers: status CHECK constraint updated (Available, On Trip, Off Duty, Suspended, Inactive).');

        console.log('\n🎉 Migration v4 completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
