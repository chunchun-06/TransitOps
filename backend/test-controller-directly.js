const { calculateTolls } = require('./src/controllers/toll_rate.controller');

// Mock req and res
const req = {
    body: {
        source: "Perundurai, Tamil Nadu",
        destination: "Coimbatore, Tamil Nadu",
        source_latitude: 11.2740,
        source_longitude: 77.5830,
        destination_latitude: 11.0168,
        destination_longitude: 76.9558,
        vehicle_id: "99f054d3-248b-425e-8ad9-f4086f5f6af5" // Truck in our database
    }
};

const res = {
    statusCode: 200,
    headers: {},
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(data) {
        console.log("RESPONSE CODE:", this.statusCode);
        console.log("RESPONSE DATA:", JSON.stringify(data, null, 2));
    }
};

async function run() {
    try {
        console.log("Running controller direct test...");
        await calculateTolls(req, res);
    } catch (e) {
        console.error("CRITICAL ERROR running controller:", e);
    }
}

run();
