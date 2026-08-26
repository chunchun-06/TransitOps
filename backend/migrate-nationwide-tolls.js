require('dotenv').config();
const pool = require('./src/config/db');

const nationwidePlazas = [
    // ── DELHI -> MUMBAI & DELHI -> JAIPUR (NH 48) ──
    { name: 'Kherki Daula Toll Plaza', highway: 'NH 48', state: 'Haryana', lat: 28.3694, lng: 76.9536 },
    { name: 'KMP Sohna Toll Plaza', highway: 'NH 148N', state: 'Haryana', lat: 28.3100, lng: 77.3400 },
    { name: 'Shahjahanpur Toll Plaza', highway: 'NH 48', state: 'Rajasthan', lat: 27.9942, lng: 76.4358 },
    { name: 'Manoharpur Toll Plaza', highway: 'NH 48', state: 'Rajasthan', lat: 27.3061, lng: 75.9525 },
    { name: 'Kishangarh Toll Plaza', highway: 'NH 48', state: 'Rajasthan', lat: 26.5818, lng: 74.8732 },
    { name: 'Rithola Toll Plaza', highway: 'NH 48', state: 'Rajasthan', lat: 24.9610, lng: 74.6542 },
    { name: 'Ratlam Toll Plaza', highway: 'NH 48', state: 'Madhya Pradesh', lat: 23.3323, lng: 75.0370 },
    { name: 'Vasad Toll Plaza', highway: 'NH 48', state: 'Gujarat', lat: 22.4497, lng: 73.0645 },
    { name: 'Choryasi Toll Plaza', highway: 'NH 48', state: 'Gujarat', lat: 21.7615, lng: 73.0135 },
    { name: 'Boriach Toll Plaza', highway: 'NH 48', state: 'Gujarat', lat: 20.9167, lng: 72.9333 },
    { name: 'Bhagwada Toll Plaza', highway: 'NH 48', state: 'Gujarat', lat: 20.4072, lng: 72.8981 },
    { name: 'Charoti Toll Plaza', highway: 'NH 48', state: 'Maharashtra', lat: 19.7420, lng: 72.8950 },
    { name: 'Khaniwade Toll Plaza', highway: 'NH 48', state: 'Maharashtra', lat: 19.4678, lng: 72.9056 },
    { name: 'Dahisar Toll Plaza', highway: 'NH 48', state: 'Maharashtra', lat: 19.2625, lng: 72.8682 },

    // ── MUMBAI -> PUNE (Expressway & NH 48) ──
    { name: 'Khalapur Toll Plaza', highway: 'Mumbai-Pune Expressway', state: 'Maharashtra', lat: 18.7905, lng: 73.2842 },
    { name: 'Talegaon Toll Plaza', highway: 'Mumbai-Pune Expressway', state: 'Maharashtra', lat: 18.7231, lng: 73.6678 },
    { name: 'Somatane Toll Plaza', highway: 'NH 48 Old Hwy', state: 'Maharashtra', lat: 18.7088, lng: 73.6425 },

    // ── BANGALORE -> HYDERABAD (NH 44) ──
    { name: 'Sadahalli Toll Plaza', highway: 'NH 44', state: 'Karnataka', lat: 13.2162, lng: 77.7126 },
    { name: 'Bagepalli Toll Plaza', highway: 'NH 44', state: 'Karnataka', lat: 13.7852, lng: 77.7944 },
    { name: 'Amakathadu Toll Plaza', highway: 'NH 44', state: 'Andhra Pradesh', lat: 15.0125, lng: 77.6250 },
    { name: 'Kasepalli Toll Plaza', highway: 'NH 44', state: 'Andhra Pradesh', lat: 14.9360, lng: 77.5810 },
    { name: 'Pullur Toll Plaza', highway: 'NH 44', state: 'Telangana', lat: 15.9083, lng: 78.0333 },
    { name: 'Raakal Toll Plaza', highway: 'NH 44', state: 'Telangana', lat: 16.7642, lng: 78.1472 },
    { name: 'Tondupally Toll Plaza', highway: 'NH 44', state: 'Telangana', lat: 17.2345, lng: 78.3912 },

    // ── CHENNAI -> HYDERABAD (NH 16 & NH 65) ──
    { name: 'Nallur Toll Plaza', highway: 'NH 16', state: 'Tamil Nadu', lat: 13.2575, lng: 80.1650 },
    { name: 'Elavur Tada Toll Plaza', highway: 'NH 16', state: 'Andhra Pradesh', lat: 13.5185, lng: 80.0125 },
    { name: 'Nellore Gudur Toll Plaza', highway: 'NH 16', state: 'Andhra Pradesh', lat: 14.2833, lng: 79.9167 },
    { name: 'Tanguturu Toll Plaza', highway: 'NH 16', state: 'Andhra Pradesh', lat: 15.3412, lng: 80.0385 },
    { name: 'Kaza Toll Plaza', highway: 'NH 16', state: 'Andhra Pradesh', lat: 16.4180, lng: 80.5520 },
    { name: 'Chillakallu Toll Plaza', highway: 'NH 65', state: 'Andhra Pradesh', lat: 16.8920, lng: 80.0890 },
    { name: 'Panthangi Toll Plaza', highway: 'NH 65', state: 'Telangana', lat: 17.2140, lng: 78.8950 },
    { name: 'Korlapahad Toll Plaza', highway: 'NH 65', state: 'Telangana', lat: 17.1350, lng: 79.6210 },

    // ── CHENNAI -> BANGALORE (NH 48) ──
    { name: 'Sriperumbudur Nemili Toll Plaza', highway: 'NH 48', state: 'Tamil Nadu', lat: 12.9650, lng: 79.8820 },
    { name: 'Chennasamudram Toll Plaza', highway: 'NH 48', state: 'Tamil Nadu', lat: 12.9230, lng: 79.3780 },
    { name: 'Pallikonda Toll Plaza', highway: 'NH 48', state: 'Tamil Nadu', lat: 12.9150, lng: 78.9610 },
    { name: 'Vinnamangalam Toll Plaza', highway: 'NH 48', state: 'Tamil Nadu', lat: 12.7120, lng: 78.6850 },
    { name: 'Krishnagiri Toll Plaza', highway: 'NH 48', state: 'Tamil Nadu', lat: 12.5650, lng: 78.2150 },
    { name: 'Attibele Toll Plaza', highway: 'NH 48', state: 'Karnataka', lat: 12.7780, lng: 77.7710 },

    // ── COIMBATORE -> BANGALORE & PERUNDURAI -> COIMBATORE (NH 544 & NH 44) ──
    { name: 'Kaniyur Toll Plaza', highway: 'NH 544', state: 'Tamil Nadu', lat: 11.0825, lng: 77.1415 },
    { name: 'Vijayamangalam Toll Plaza', highway: 'NH 544', state: 'Tamil Nadu', lat: 11.2385, lng: 77.4628 },
    { name: 'Vaiguntham Toll Plaza', highway: 'NH 544', state: 'Tamil Nadu', lat: 11.6420, lng: 77.9250 },
    { name: 'Omalur Toll Plaza', highway: 'NH 44', state: 'Tamil Nadu', lat: 11.7580, lng: 78.0410 },
    { name: 'Thoppur Toll Plaza', highway: 'NH 44', state: 'Tamil Nadu', lat: 12.0120, lng: 78.0750 },

    // ── COIMBATORE -> CHENNAI (NH 79 & NH 45) ──
    { name: 'Mettupatti Toll Plaza', highway: 'NH 79', state: 'Tamil Nadu', lat: 11.6350, lng: 78.3410 },
    { name: 'Sengurichi Toll Plaza', highway: 'NH 79', state: 'Tamil Nadu', lat: 11.6680, lng: 79.1820 },
    { name: 'Vikravandi Toll Plaza', highway: 'NH 45', state: 'Tamil Nadu', lat: 12.0450, lng: 79.5250 },
    { name: 'Paranur Toll Plaza', highway: 'NH 45', state: 'Tamil Nadu', lat: 12.7210, lng: 79.9920 }
];

const categoryRates = {
    CAR: { base: 85, current: 95 },
    LCV: { base: 140, current: 155 },
    TRUCK_2_AXLE: { base: 290, current: 325 },
    TRUCK_3_AXLE: { base: 320, current: 355 },
    TRUCK_4_TO_6_AXLE: { base: 460, current: 510 },
    TRUCK_7_PLUS_AXLE: { base: 560, current: 620 }
};

async function runNationwideMigration() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('🚀 Migrating Nationwide Indian Toll Plazas & Tariff Master...');

        // Ensure tables exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS toll_plazas (
                id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
                name        VARCHAR(150)  NOT NULL,
                highway     VARCHAR(100),
                state       VARCHAR(100),
                latitude    DECIMAL(10,7) NOT NULL,
                longitude   DECIMAL(10,7) NOT NULL,
                active      BOOLEAN       DEFAULT TRUE,
                created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS toll_rates (
                id              UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
                toll_plaza_id   UUID           NOT NULL REFERENCES toll_plazas(id) ON DELETE CASCADE,
                vehicle_category VARCHAR(40)   NOT NULL,
                journey_type    VARCHAR(40)    NOT NULL DEFAULT 'SINGLE',
                amount          DECIMAL(10,2)  NOT NULL,
                effective_from  DATE           NOT NULL DEFAULT CURRENT_DATE,
                effective_until DATE,
                source          VARCHAR(255),
                created_at      TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
                updated_at      TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_toll_rates_unique_active
                ON toll_rates(toll_plaza_id, vehicle_category, journey_type, effective_from)
        `);

        // Insert or update nationwide plazas
        for (const p of nationwidePlazas) {
            let pRes = await client.query(
                `SELECT id FROM toll_plazas WHERE name = $1`, [p.name]
            );

            let plazaId;
            if (pRes.rows.length === 0) {
                const ins = await client.query(
                    `INSERT INTO toll_plazas (name, highway, state, latitude, longitude)
                     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                    [p.name, p.highway, p.state, p.lat, p.lng]
                );
                plazaId = ins.rows[0].id;
            } else {
                plazaId = pRes.rows[0].id;
                await client.query(
                    `UPDATE toll_plazas SET highway = $1, state = $2, latitude = $3, longitude = $4, active = true WHERE id = $5`,
                    [p.highway, p.state, p.lat, p.lng, plazaId]
                );
            }

            // Insert rates for all categories (Historical & Effective Current)
            for (const [cat, rates] of Object.entries(categoryRates)) {
                // Historical rate (2025-01-01 -> 2026-06-30)
                await client.query(`
                    INSERT INTO toll_rates (toll_plaza_id, vehicle_category, journey_type, amount, effective_from, effective_until, source)
                    VALUES ($1, $2, 'SINGLE', $3, '2025-01-01', '2026-06-30', 'NHAI Tariff 2025')
                    ON CONFLICT (toll_plaza_id, vehicle_category, journey_type, effective_from)
                    DO UPDATE SET amount = EXCLUDED.amount, effective_until = EXCLUDED.effective_until
                `, [plazaId, cat, rates.base]);

                // Current active rate (2026-07-01 -> NULL)
                await client.query(`
                    INSERT INTO toll_rates (toll_plaza_id, vehicle_category, journey_type, amount, effective_from, effective_until, source)
                    VALUES ($1, $2, 'SINGLE', $3, '2026-07-01', NULL, 'NHAI Tariff 2026 Active')
                    ON CONFLICT (toll_plaza_id, vehicle_category, journey_type, effective_from)
                    DO UPDATE SET amount = EXCLUDED.amount, effective_until = EXCLUDED.effective_until
                `, [plazaId, cat, rates.current]);
            }
        }

        // Ensure unique_expense_source on expenses
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'unique_expense_source'
                ) THEN
                    ALTER TABLE expenses ADD CONSTRAINT unique_expense_source UNIQUE (source_type, source_id);
                END IF;
            END $$;
        `);

        // Ensure unique_fuel_price_city_date on fuel_prices
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'unique_fuel_price_city_date'
                ) THEN
                    ALTER TABLE fuel_prices ADD CONSTRAINT unique_fuel_price_city_date UNIQUE (city, fuel_type, effective_date);
                END IF;
            END $$;
        `);

        await client.query('COMMIT');
        console.log(`✅ Successfully seeded ${nationwidePlazas.length} nationwide Indian toll plazas and effective tariffs!`);
        console.log('✅ Ensured unique constraints on expenses and fuel_prices tables.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

runNationwideMigration();
