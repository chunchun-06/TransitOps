/**
 * TransitOps Migration v5 - Fuel Bill OCR Columns
 * Run with: node migrate-v5.js
 */
require('dotenv').config();
const pool = require('./src/config/db');

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting TransitOps Migration v5...\n');

        console.log('📋 Updating fuel table structure...');
        await client.query(`ALTER TABLE fuel ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100)`);
        await client.query(`ALTER TABLE fuel ADD COLUMN IF NOT EXISTS receipt_vehicle_number VARCHAR(50)`);
        await client.query(`ALTER TABLE fuel ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50)`);
        await client.query(`ALTER TABLE fuel ADD COLUMN IF NOT EXISTS receipt_image TEXT`);
        console.log('  ✅ fuel: invoice_number, receipt_vehicle_number, payment_mode, receipt_image columns added.');

        console.log('\n🎉 Migration v5 completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
