require('dotenv').config();
const http = require('http');
const pool = require('./src/config/db');
const { calculateTolls } = require('./src/controllers/toll_rate.controller');

const testRoutes = [
    { name: 'Delhi -> Mumbai', source: 'Delhi, India', destination: 'Mumbai, Maharashtra, India', category: 'TRUCK_2_AXLE' },
    { name: 'Chennai -> Bangalore', source: 'Chennai, Tamil Nadu, India', destination: 'Bengaluru, Karnataka, India', category: 'TRUCK_2_AXLE' },
    { name: 'Chennai -> Hyderabad', source: 'Chennai, Tamil Nadu, India', destination: 'Hyderabad, Telangana, India', category: 'TRUCK_2_AXLE' },
    { name: 'Mumbai -> Pune', source: 'Mumbai, Maharashtra, India', destination: 'Pune, Maharashtra, India', category: 'CAR' },
    { name: 'Delhi -> Jaipur', source: 'Delhi, India', destination: 'Jaipur, Rajasthan, India', category: 'CAR' },
    { name: 'Bangalore -> Hyderabad', source: 'Bengaluru, Karnataka, India', destination: 'Hyderabad, Telangana, India', category: 'TRUCK_3_AXLE' },
    { name: 'Coimbatore -> Bangalore', source: 'Coimbatore, Tamil Nadu, India', destination: 'Bengaluru, Karnataka, India', category: 'TRUCK_2_AXLE' },
    { name: 'Coimbatore -> Chennai', source: 'Coimbatore, Tamil Nadu, India', destination: 'Chennai, Tamil Nadu, India', category: 'TRUCK_2_AXLE' },
    { name: 'Perundurai -> Coimbatore', source: 'Perundurai, Tamil Nadu, India', destination: 'Coimbatore, Tamil Nadu, India', category: 'TRUCK_2_AXLE' }
];

async function runTests() {
    console.log('🧪 Starting Nationwide Toll Calculation Integration Verification...\n');

    for (const r of testRoutes) {
        const req = {
            body: {
                source: r.source,
                destination: r.destination,
                vehicle_class: r.category
            }
        };

        const res = {
            status: function(code) { this.statusCode = code; return this; },
            json: function(data) { this.data = data; return this; }
        };

        console.log(`🔍 Testing Route: ${r.name} (${r.category})...`);
        await calculateTolls(req, res);
        
        const data = res.data;
        if (data) {
            console.log(`   Status: ${data.status}`);
            console.log(`   Distance: ${data.distanceKm} km`);
            console.log(`   Plazas Detected: ${data.tolls_detected ? data.tolls_detected.length : 0}`);
            console.log(`   Total Toll: ₹${data.totalToll}`);
            if (data.tolls_detected && data.tolls_detected.length > 0) {
                console.log(`   Sample Plaza: ${data.tolls_detected[0].name} (₹${data.tolls_detected[0].amount})`);
            }
        } else {
            console.log(`   ❌ No response returned!`);
        }
        console.log('--------------------------------------------------');
    }

    process.exit(0);
}

runTests();
