require("dotenv").config();

const pool = require("./src/config/db");

async function migrateProduction() {
    const client = await pool.connect();

    try {
        console.log("🚀 Starting final production schema migration...");

        // =========================
        // VEHICLES
        // =========================
        await client.query(`
            ALTER TABLE vehicles
            ADD COLUMN IF NOT EXISTS engine_cc INTEGER
        `);

        await client.query(`
            ALTER TABLE vehicles
            ADD COLUMN IF NOT EXISTS purchase_year INTEGER
        `);

        await client.query(`
            ALTER TABLE vehicles
            ADD COLUMN IF NOT EXISTS current_driver_id UUID
            REFERENCES drivers(id)
            ON DELETE SET NULL
        `);

        await client.query(`
            ALTER TABLE vehicles
            ADD COLUMN IF NOT EXISTS photo_url TEXT
        `);

        await client.query(`
            ALTER TABLE vehicles
            ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(20) DEFAULT 'Diesel'
        `);

        await client.query(`
            ALTER TABLE vehicles
            ADD COLUMN IF NOT EXISTS fuel_efficiency_kmpl DECIMAL(6,2)
        `);

        await client.query(`
            ALTER TABLE vehicles
            ADD COLUMN IF NOT EXISTS fuel_tank_capacity_liters DECIMAL(8,2)
        `);

        await client.query(`
            ALTER TABLE vehicles
            ADD COLUMN IF NOT EXISTS current_fuel_level_liters DECIMAL(8,2) DEFAULT 0
        `);

        await client.query(`
            ALTER TABLE vehicles
            ADD COLUMN IF NOT EXISTS axle_count INTEGER DEFAULT 2
        `);

        await client.query(`
            ALTER TABLE vehicles
            ADD COLUMN IF NOT EXISTS toll_category VARCHAR(40) DEFAULT 'TRUCK_2_AXLE'
        `);

        // =========================
        // DRIVERS
        // =========================
        await client.query(`
            ALTER TABLE drivers
            ADD COLUMN IF NOT EXISTS photo_url TEXT
        `);

        // =========================
        // TRIPS
        // =========================
        await client.query(`
            ALTER TABLE trips
            ADD COLUMN IF NOT EXISTS toll_amount DECIMAL(12,2) DEFAULT 0
        `);

        await client.query(`
            ALTER TABLE trips
            ADD COLUMN IF NOT EXISTS total_trip_cost DECIMAL(14,2)
        `);

        await client.query(`
            ALTER TABLE trips
            ADD COLUMN IF NOT EXISTS start_odometer DECIMAL(12,2)
        `);

        await client.query(`
            ALTER TABLE trips
            ADD COLUMN IF NOT EXISTS actual_fuel_cost DECIMAL(12,2)
        `);

        await client.query(`
            ALTER TABLE trips
            ADD COLUMN IF NOT EXISTS source_latitude DECIMAL(10,7)
        `);

        await client.query(`
            ALTER TABLE trips
            ADD COLUMN IF NOT EXISTS source_longitude DECIMAL(10,7)
        `);

        await client.query(`
            ALTER TABLE trips
            ADD COLUMN IF NOT EXISTS destination_latitude DECIMAL(10,7)
        `);

        await client.query(`
            ALTER TABLE trips
            ADD COLUMN IF NOT EXISTS destination_longitude DECIMAL(10,7)
        `);

        await client.query(`
            ALTER TABLE trips
            ADD COLUMN IF NOT EXISTS estimated_duration_min INTEGER
        `);

        await client.query(`
            ALTER TABLE trips
            ADD COLUMN IF NOT EXISTS estimated_fuel_liters DECIMAL(10,2)
        `);

        await client.query(`
            ALTER TABLE trips
            ADD COLUMN IF NOT EXISTS current_fuel_liters DECIMAL(10,2)
        `);

        await client.query(`
            ALTER TABLE trips
            ADD COLUMN IF NOT EXISTS additional_fuel_required_liters DECIMAL(10,2)
        `);

        await client.query(`
            ALTER TABLE trips
            ADD COLUMN IF NOT EXISTS estimated_fuel_cost DECIMAL(12,2)
        `);

        await client.query(`
            ALTER TABLE trips
            ADD COLUMN IF NOT EXISTS fuel_price_per_liter DECIMAL(8,2)
        `);

        // =========================
        // FUEL
        // =========================
        await client.query(`
            ALTER TABLE fuel
            ADD COLUMN IF NOT EXISTS price_per_liter DECIMAL(8,2)
        `);

        await client.query(`
            ALTER TABLE fuel
            ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(20) DEFAULT 'Diesel'
        `);

        await client.query(`
            ALTER TABLE fuel
            ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100)
        `);

        await client.query(`
            ALTER TABLE fuel
            ADD COLUMN IF NOT EXISTS receipt_vehicle_number VARCHAR(50)
        `);

        await client.query(`
            ALTER TABLE fuel
            ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50)
        `);

        await client.query(`
            ALTER TABLE fuel
            ADD COLUMN IF NOT EXISTS receipt_image TEXT
        `);

        // =========================
        // MAINTENANCE
        // =========================
        await client.query(`
            ALTER TABLE maintenance
            ADD COLUMN IF NOT EXISTS expected_completion DATE
        `);

        await client.query(`
            ALTER TABLE maintenance
            ADD COLUMN IF NOT EXISTS actual_completion DATE
        `);

        // =========================
        // FUEL PRICE
        // =========================
        await client.query(`
            CREATE TABLE IF NOT EXISTS fuel_price (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                fuel_type VARCHAR(20) NOT NULL DEFAULT 'Diesel',
                price_per_liter DECIMAL(8,2) NOT NULL,
                effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
                effective_to DATE,
                notes TEXT,
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // =========================
        // DRIVER SAFETY
        // =========================
        await client.query(`
            CREATE TABLE IF NOT EXISTS driver_safety (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                driver_id UUID NOT NULL UNIQUE
                    REFERENCES drivers(id)
                    ON DELETE CASCADE,
                license_expiry_date DATE,
                trip_failures INTEGER DEFAULT 0,
                total_accidents INTEGER DEFAULT 0,
                accident_records JSONB DEFAULT '[]'::jsonb,
                goods_damaged_incidents INTEGER DEFAULT 0,
                goods_damage_notes TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // =========================
        // INDEXES
        // =========================
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_trips_status
            ON trips(status)
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_trips_created_at
            ON trips(created_at DESC)
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_trips_start_time
            ON trips(start_time)
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_expenses_date
            ON expenses(date DESC)
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_fuel_date
            ON fuel(date DESC)
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_maintenance_service_date
            ON maintenance(service_date DESC)
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_vehicle_status
            ON vehicles(status)
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_driver_status
            ON drivers(status)
        `);

        console.log("✅ Final production schema migration completed!");
    } catch (error) {
        console.error("❌ Production migration failed:");
        console.error(error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

migrateProduction();