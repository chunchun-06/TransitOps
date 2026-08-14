const pool = require('../config/db');

// List all active toll rates
exports.getTollRates = async (req, res) => {
    try {
        const { vehicle_class, active, state } = req.query;
        let query = 'SELECT * FROM toll_rate_master WHERE 1=1';
        const params = [];
        let index = 1;

        if (vehicle_class) {
            query += ` AND vehicle_class = $${index}`;
            params.push(vehicle_class);
            index++;
        }
        if (active !== undefined) {
            query += ` AND active = $${index}`;
            params.push(active === 'true');
            index++;
        }
        if (state) {
            query += ` AND state ILIKE $${index}`;
            params.push(`%${state}%`);
            index++;
        }

        query += ' ORDER BY toll_name, vehicle_class';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error fetching toll rates' });
    }
};

// Toll estimation based on source/destination state and vehicle class
exports.getTollEstimate = async (req, res) => {
    try {
        const { source, destination, vehicle_class, planned_distance } = req.query;
        if (!vehicle_class) {
            return res.status(400).json({ message: 'vehicle_class parameter is required.' });
        }

        // Map of known city/region keywords → state
        const STATE_KEYWORDS = {
            'Tamil Nadu': ['chennai', 'coimbatore', 'madurai', 'tiruchirappalli', 'salem', 'vellore', 'tirunelveli', 'tamilnadu', 'tamil'],
            'Karnataka': ['bangalore', 'bengaluru', 'mysore', 'hubli', 'mangalore', 'karnataka'],
            'Maharashtra': ['mumbai', 'pune', 'nagpur', 'nashik', 'aurangabad', 'maharashtra'],
            'Gujarat': ['ahmedabad', 'surat', 'vadodara', 'rajkot', 'gujarat'],
            'Rajasthan': ['jaipur', 'jodhpur', 'udaipur', 'ajmer', 'rajasthan'],
            'Delhi': ['delhi', 'new delhi', 'dwarka', 'noida', 'gurgaon'],
            'Uttar Pradesh': ['lucknow', 'kanpur', 'agra', 'varanasi', 'uttar pradesh'],
            'Telangana': ['hyderabad', 'warangal', 'telangana'],
            'West Bengal': ['kolkata', 'howrah', 'west bengal'],
            'Madhya Pradesh': ['bhopal', 'indore', 'madhya pradesh'],
        };

        const combinedText = `${source || ''} ${destination || ''}`.toLowerCase();
        let targetState = null;
        for (const [state, keywords] of Object.entries(STATE_KEYWORDS)) {
            if (keywords.some(kw => combinedText.includes(kw))) {
                targetState = state;
                break;
            }
        }

        let query;
        let params;
        if (targetState) {
            query = `SELECT * FROM toll_rate_master WHERE vehicle_class = $1 AND active = true AND state ILIKE $2 ORDER BY toll_amount DESC`;
            params = [vehicle_class, `%${targetState}%`];
        } else {
            // No known state — fall back to any active toll for vehicle class
            query = `SELECT * FROM toll_rate_master WHERE vehicle_class = $1 AND active = true ORDER BY toll_amount DESC`;
            params = [vehicle_class];
        }

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.json({
                tolls_detected: [],
                total_toll_amount: 0,
                message: 'No toll booths found for this route.',
                source: 'Toll Master'
            });
        }

        // Scale number of toll plazas proportionally to distance (1 per ~80 km, min 1, max rows available)
        const distKm = planned_distance ? parseFloat(planned_distance) : 150;
        const estimatedTollCount = Math.max(1, Math.min(result.rows.length, Math.floor(distKm / 80)));
        const tolls = result.rows.slice(0, estimatedTollCount);
        const total = Math.round(tolls.reduce((acc, t) => acc + parseFloat(t.toll_amount), 0) * 100) / 100;

        res.json({
            tolls_detected: tolls,
            total_toll_amount: total,
            message: `${tolls.length} toll plaza${tolls.length > 1 ? 's' : ''} estimated for this route (₹${total})`,
            source: 'Toll Master'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error estimating tolls' });
    }
};

// Create a new toll rate (Admin/Fleet Manager)
exports.createTollRate = async (req, res) => {
    try {
        const { toll_name, location, highway, state, vehicle_class, toll_amount, active, notes } = req.body;
        if (!toll_name || !vehicle_class || toll_amount === undefined) {
            return res.status(400).json({ message: 'toll_name, vehicle_class, and toll_amount are required.' });
        }

        const query = `
            INSERT INTO toll_rate_master (toll_name, location, highway, state, vehicle_class, toll_amount, active, notes, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
        `;
        const result = await pool.query(query, [
            toll_name, location, highway, state, vehicle_class, parseFloat(toll_amount),
            active !== undefined ? active : true, notes, req.user?.id || null
        ]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error creating toll rate' });
    }
};

// Update a toll rate
exports.updateTollRate = async (req, res) => {
    try {
        const { id } = req.params;
        const { toll_name, location, highway, state, vehicle_class, toll_amount, active, notes } = req.body;

        const query = `
            UPDATE toll_rate_master
            SET toll_name = COALESCE($1, toll_name),
                location = COALESCE($2, location),
                highway = COALESCE($3, highway),
                state = COALESCE($4, state),
                vehicle_class = COALESCE($5, vehicle_class),
                toll_amount = COALESCE($6, toll_amount),
                active = COALESCE($7, active),
                notes = COALESCE($8, notes)
            WHERE id = $9 RETURNING *
        `;
        const result = await pool.query(query, [
            toll_name, location, highway, state, vehicle_class, 
            toll_amount !== undefined ? parseFloat(toll_amount) : null,
            active, notes, id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Toll rate not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error updating toll rate' });
    }
};

// Delete a toll rate
exports.deleteTollRate = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM toll_rate_master WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Toll rate not found' });
        }
        res.json({ message: 'Toll rate deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error deleting toll rate' });
    }
};
