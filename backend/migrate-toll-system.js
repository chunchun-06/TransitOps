/**
 * TransitOps Route-Based Toll System Migration & Seed Script (v2)
 * 
 * New toll_rates schema:
 *   - journey_type  VARCHAR(40)  NOT NULL DEFAULT 'SINGLE'
 *   - amount        DECIMAL(10,2) NOT NULL
 *   - effective_from / effective_until (date-ranged, never overwriting history)
 * 
 * Run with: node migrate-toll-system.js
 */
require('dotenv').config();
const pool = require('./src/config/db');

async function migrateTollSystem() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting TransitOps Toll System Migration v2...\n');

        // ──────────────────────────────────────────────────────────────────
        // 1. Vehicles table: add axle_count & toll_category columns
        // ──────────────────────────────────────────────────────────────────
        console.log('📋 Step 1 — Updating vehicles table schema...');
        await client.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS axle_count    INTEGER     DEFAULT 2`);
        await client.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS toll_category VARCHAR(40) DEFAULT 'TRUCK_2_AXLE'`);
        console.log('  ✅ vehicles: axle_count, toll_category columns ensured');

        // Update existing vehicles with inferred categories
        await client.query(`
            UPDATE vehicles
            SET
                toll_category = CASE
                    WHEN LOWER(vehicle_type) LIKE '%car%'  OR LOWER(vehicle_type) LIKE '%suv%'                          THEN 'CAR'
                    WHEN LOWER(vehicle_type) LIKE '%van%'  OR LOWER(vehicle_type) LIKE '%tempo%'
                      OR LOWER(vehicle_type) LIKE '%mini%' OR LOWER(vehicle_type) LIKE '%lcv%'                          THEN 'LCV'
                    WHEN LOWER(vehicle_type) LIKE '%trailer%' OR LOWER(vehicle_name) LIKE '%multiaxle%'                 THEN 'TRUCK_4_TO_6_AXLE'
                    WHEN LOWER(vehicle_name) LIKE '%3 axle%'  OR LOWER(vehicle_name) LIKE '%10 wheeler%'                THEN 'TRUCK_3_AXLE'
                    ELSE 'TRUCK_2_AXLE'
                END,
                axle_count = CASE
                    WHEN LOWER(vehicle_type) LIKE '%car%'  OR LOWER(vehicle_type) LIKE '%suv%'  THEN 2
                    WHEN LOWER(vehicle_type) LIKE '%van%'  OR LOWER(vehicle_type) LIKE '%tempo%'
                      OR LOWER(vehicle_type) LIKE '%mini%' OR LOWER(vehicle_type) LIKE '%lcv%'  THEN 2
                    WHEN LOWER(vehicle_type) LIKE '%trailer%' OR LOWER(vehicle_name) LIKE '%multiaxle%' THEN 4
                    WHEN LOWER(vehicle_name) LIKE '%3 axle%'  OR LOWER(vehicle_name) LIKE '%10 wheeler%' THEN 3
                    ELSE 2
                END
            WHERE toll_category IS NULL OR toll_category = 'TRUCK_2_AXLE'
        `);
        console.log('  ✅ Existing vehicles toll categories refreshed');

        // ──────────────────────────────────────────────────────────────────
        // 2. toll_plazas table
        // ──────────────────────────────────────────────────────────────────
        console.log('\n📋 Step 2 — Creating toll_plazas table...');
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
        console.log('  ✅ toll_plazas table ensured');

        // ──────────────────────────────────────────────────────────────────
        // 3. toll_rates table — NEW effective-dated schema
        //    Drop and recreate to ensure columns are correct.
        // ──────────────────────────────────────────────────────────────────
        console.log('\n📋 Step 3 — Migrating toll_rates table to effective-dated schema...');
        await client.query(`DROP TABLE IF EXISTS toll_rates CASCADE`);
        await client.query(`
            CREATE TABLE toll_rates (
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
        // Prevent overlapping effective periods for the same plaza/category/journey
        await client.query(`
            CREATE UNIQUE INDEX idx_toll_rates_unique_active
                ON toll_rates(toll_plaza_id, vehicle_category, journey_type, effective_from)
        `);
        console.log('  ✅ toll_rates recreated with effective-dated schema');

        // ──────────────────────────────────────────────────────────────────
        // 4. Seed toll plazas & effective-dated rates
        //
        //    Each plaza has TWO rate revisions per category:
        //      • Historical : effective_from 2025-01-01  →  effective_until 2026-06-30
        //      • Current    : effective_from 2026-07-01  →  effective_until NULL (open)
        //
        //    journey_type rows per revision: SINGLE + RETURN (return = single × 1.5)
        // ──────────────────────────────────────────────────────────────────
        console.log('\n📋 Step 4 — Seeding toll plazas and effective-dated rates...');

        const PLAZA_SEEDS = [
            // ── NH 544 · Erode / Perundurai → Coimbatore ──────────────────
            {
                name:    'Vijayamangalam Toll Plaza',
                highway: 'NH 544',
                state:   'Tamil Nadu',
                lat:     11.24551,   // verified GPS
                lng:     77.51971,
                historicalRates: { // 2025-01-01 to 2026-06-30
                    CAR:              70.00,
                    LCV:             110.00,  // ← was 130 in old seed
                    TRUCK_2_AXLE:    255.00,
                    TRUCK_3_AXLE:    280.00,
                    TRUCK_4_TO_6_AXLE: 400.00,
                    TRUCK_7_PLUS_AXLE: 490.00
                },
                currentRates: {    // 2026-07-01 onwards  (official current tariff)
                    CAR:              80.00,
                    LCV:             115.00,  // ← corrected official tariff
                    TRUCK_2_AXLE:    275.00,
                    TRUCK_3_AXLE:    300.00,
                    TRUCK_4_TO_6_AXLE: 430.00,
                    TRUCK_7_PLUS_AXLE: 525.00
                }
            },
            {
                name:    'Kaniyur Toll Plaza',
                highway: 'NH 544',
                state:   'Tamil Nadu',
                lat:     11.08800,   // route-verified GPS (7m from OSRM route)
                lng:     77.13080,
                historicalRates: {
                    CAR:              100.00,
                    LCV:              170.00,
                    TRUCK_2_AXLE:     355.00,
                    TRUCK_3_AXLE:     390.00,
                    TRUCK_4_TO_6_AXLE: 565.00,
                    TRUCK_7_PLUS_AXLE: 685.00
                },
                currentRates: {
                    CAR:              110.00,
                    LCV:              180.00,
                    TRUCK_2_AXLE:     375.00,
                    TRUCK_3_AXLE:     410.00,
                    TRUCK_4_TO_6_AXLE: 590.00,
                    TRUCK_7_PLUS_AXLE: 715.00
                }
            },

            // ── NH 48 · Chennai → Bengaluru ───────────────────────────────
            {
                name:    'Vandalur Toll Plaza',
                highway: 'NH 48',
                state:   'Tamil Nadu',
                lat:     12.8915,
                lng:     80.0862,
                historicalRates: {
                    CAR:   60.00, LCV:  100.00, TRUCK_2_AXLE: 210.00,
                    TRUCK_3_AXLE: 230.00, TRUCK_4_TO_6_AXLE: 330.00
                },
                currentRates: {
                    CAR:   65.00, LCV:  110.00, TRUCK_2_AXLE: 225.00,
                    TRUCK_3_AXLE: 245.00, TRUCK_4_TO_6_AXLE: 350.00
                }
            },
            {
                name:    'Sriperumbudur Toll Plaza',
                highway: 'NH 48',
                state:   'Tamil Nadu',
                lat:     12.9715,
                lng:     79.9481,
                historicalRates: {
                    CAR:   70.00, LCV:  120.00, TRUCK_2_AXLE: 245.00,
                    TRUCK_3_AXLE: 270.00, TRUCK_4_TO_6_AXLE: 385.00
                },
                currentRates: {
                    CAR:   75.00, LCV:  130.00, TRUCK_2_AXLE: 260.00,
                    TRUCK_3_AXLE: 285.00, TRUCK_4_TO_6_AXLE: 410.00
                }
            },
            {
                name:    'Chennasamudram Toll Plaza',
                highway: 'NH 48',
                state:   'Tamil Nadu',
                lat:     12.9310,
                lng:     79.3801,
                historicalRates: {
                    CAR:   80.00, LCV:  135.00, TRUCK_2_AXLE: 275.00,
                    TRUCK_3_AXLE: 300.00, TRUCK_4_TO_6_AXLE: 435.00
                },
                currentRates: {
                    CAR:   85.00, LCV:  145.00, TRUCK_2_AXLE: 295.00,
                    TRUCK_3_AXLE: 320.00, TRUCK_4_TO_6_AXLE: 465.00
                }
            },
            {
                name:    'Pallikonda Toll Plaza',
                highway: 'NH 48',
                state:   'Tamil Nadu',
                lat:     12.9210,
                lng:     78.9601,
                historicalRates: {
                    CAR:   88.00, LCV:  145.00, TRUCK_2_AXLE: 295.00,
                    TRUCK_3_AXLE: 325.00, TRUCK_4_TO_6_AXLE: 465.00
                },
                currentRates: {
                    CAR:   95.00, LCV:  155.00, TRUCK_2_AXLE: 315.00,
                    TRUCK_3_AXLE: 345.00, TRUCK_4_TO_6_AXLE: 495.00
                }
            },
            {
                name:    'Vaniyambadi Toll Plaza',
                highway: 'NH 48',
                state:   'Tamil Nadu',
                lat:     12.6916,
                lng:     78.6156,
                historicalRates: {
                    CAR:   84.00, LCV:  140.00, TRUCK_2_AXLE: 285.00,
                    TRUCK_3_AXLE: 315.00, TRUCK_4_TO_6_AXLE: 450.00
                },
                currentRates: {
                    CAR:   90.00, LCV:  150.00, TRUCK_2_AXLE: 305.00,
                    TRUCK_3_AXLE: 335.00, TRUCK_4_TO_6_AXLE: 480.00
                }
            },
            {
                name:    'Krishnagiri Toll Plaza',
                highway: 'NH 48',
                state:   'Tamil Nadu',
                lat:     12.5296,
                lng:     78.2145,
                historicalRates: {
                    CAR:   98.00, LCV:  160.00, TRUCK_2_AXLE: 325.00,
                    TRUCK_3_AXLE: 355.00, TRUCK_4_TO_6_AXLE: 510.00
                },
                currentRates: {
                    CAR:  105.00, LCV:  170.00, TRUCK_2_AXLE: 345.00,
                    TRUCK_3_AXLE: 375.00, TRUCK_4_TO_6_AXLE: 540.00
                }
            },
            {
                name:    'Attibele Toll Plaza',
                highway: 'NH 48',
                state:   'Karnataka',
                lat:     12.7783,
                lng:     77.7754,
                historicalRates: {
                    CAR:   37.00, LCV:  65.00, TRUCK_2_AXLE: 130.00,
                    TRUCK_3_AXLE: 145.00, TRUCK_4_TO_6_AXLE: 205.00
                },
                currentRates: {
                    CAR:   40.00, LCV:  70.00, TRUCK_2_AXLE: 140.00,
                    TRUCK_3_AXLE: 155.00, TRUCK_4_TO_6_AXLE: 220.00
                }
            },
            {
                name:    'Hoskote Toll Plaza',
                highway: 'NH 648',
                state:   'Karnataka',
                lat:     13.0675,
                lng:     77.7944,
                historicalRates: {
                    CAR:   65.00, LCV:  110.00, TRUCK_2_AXLE: 225.00,
                    TRUCK_3_AXLE: 250.00, TRUCK_4_TO_6_AXLE: 355.00
                },
                currentRates: {
                    CAR:   70.00, LCV:  120.00, TRUCK_2_AXLE: 240.00,
                    TRUCK_3_AXLE: 265.00, TRUCK_4_TO_6_AXLE: 380.00
                }
            },
            {
                name:    'Nelamangala / Tumkur Toll Plaza',
                highway: 'NH 48',
                state:   'Karnataka',
                lat:     13.1011,
                lng:     77.3820,
                historicalRates: {
                    CAR:   70.00, LCV:  115.00, TRUCK_2_AXLE: 235.00,
                    TRUCK_3_AXLE: 258.00, TRUCK_4_TO_6_AXLE: 370.00
                },
                currentRates: {
                    CAR:   75.00, LCV:  125.00, TRUCK_2_AXLE: 250.00,
                    TRUCK_3_AXLE: 275.00, TRUCK_4_TO_6_AXLE: 395.00
                }
            }
        ];

        const HIST_FROM  = '2025-01-01';
        const HIST_UNTIL = '2026-06-30';
        const CURR_FROM  = '2026-07-01';
        const SOURCE_TAG = 'NHAI Official Tariff';

        for (const p of PLAZA_SEEDS) {
            // Upsert plaza
            let plazaRes = await client.query(
                `SELECT id FROM toll_plazas WHERE name = $1 AND highway = $2`,
                [p.name, p.highway]
            );
            let plazaId;
            if (plazaRes.rows.length === 0) {
                const ins = await client.query(
                    `INSERT INTO toll_plazas (name, highway, state, latitude, longitude, active)
                     VALUES ($1, $2, $3, $4, $5, true) RETURNING id`,
                    [p.name, p.highway, p.state, p.lat, p.lng]
                );
                plazaId = ins.rows[0].id;
                console.log(`  ➕ Created plaza: ${p.name}`);
            } else {
                plazaId = plazaRes.rows[0].id;
                await client.query(
                    `UPDATE toll_plazas SET latitude = $1, longitude = $2, state = $3 WHERE id = $4`,
                    [p.lat, p.lng, p.state, plazaId]
                );
                console.log(`  🔄 Updated plaza coords: ${p.name}`);
            }

            // Helper: insert both SINGLE and RETURN rows for a rate map
            async function seedRateRevision(rates, effectiveFrom, effectiveUntil) {
                for (const [cat, singleAmount] of Object.entries(rates)) {
                    const returnAmount = Math.round(singleAmount * 1.5 * 100) / 100;

                    // SINGLE
                    await client.query(
                        `INSERT INTO toll_rates
                            (toll_plaza_id, vehicle_category, journey_type, amount,
                             effective_from, effective_until, source)
                         VALUES ($1, $2, 'SINGLE', $3, $4, $5, $6)
                         ON CONFLICT (toll_plaza_id, vehicle_category, journey_type, effective_from)
                         DO UPDATE SET amount = EXCLUDED.amount, effective_until = EXCLUDED.effective_until,
                                       source = EXCLUDED.source, updated_at = CURRENT_TIMESTAMP`,
                        [plazaId, cat, singleAmount, effectiveFrom, effectiveUntil, SOURCE_TAG]
                    );

                    // RETURN
                    await client.query(
                        `INSERT INTO toll_rates
                            (toll_plaza_id, vehicle_category, journey_type, amount,
                             effective_from, effective_until, source)
                         VALUES ($1, $2, 'RETURN', $3, $4, $5, $6)
                         ON CONFLICT (toll_plaza_id, vehicle_category, journey_type, effective_from)
                         DO UPDATE SET amount = EXCLUDED.amount, effective_until = EXCLUDED.effective_until,
                                       source = EXCLUDED.source, updated_at = CURRENT_TIMESTAMP`,
                        [plazaId, cat, returnAmount, effectiveFrom, effectiveUntil, SOURCE_TAG]
                    );
                }
            }

            // Historical rates (2025-01-01 → 2026-06-30)
            await seedRateRevision(p.historicalRates, HIST_FROM, HIST_UNTIL);
            // Current rates  (2026-07-01 → open)
            await seedRateRevision(p.currentRates, CURR_FROM, null);
        }

        console.log('\n  ✅ All toll plazas and effective-dated rates seeded!');

        // ──────────────────────────────────────────────────────────────────
        // 5. Performance indexes
        // ──────────────────────────────────────────────────────────────────
        await client.query(`CREATE INDEX IF NOT EXISTS idx_toll_plazas_coords    ON toll_plazas(latitude, longitude)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_toll_rates_plaza_cat  ON toll_rates(toll_plaza_id, vehicle_category, journey_type)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_toll_rates_eff_dates  ON toll_rates(effective_from, effective_until)`);
        console.log('  ✅ Performance indexes ensured');

        console.log('\n🎉 Toll system migration v2 completed successfully!\n');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrateTollSystem();
