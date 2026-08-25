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
        
        // Normalize class to one of: 'Truck', 'Van', 'Car'
        let normalizedClass = 'Truck';
        if (vehicle_class) {
            const vc = vehicle_class.toLowerCase();
            if (vc.includes('car') || vc.includes('jeep') || vc.includes('suv')) {
                normalizedClass = 'Car';
            } else if (vc.includes('van') || vc.includes('mini') || vc.includes('tempo')) {
                normalizedClass = 'Van';
            } else if (vc.includes('bus') || vc.includes('truck') || vc.includes('lorry') || vc.includes('heavy')) {
                normalizedClass = 'Truck';
            } else {
                normalizedClass = 'Truck';
            }
        }

        // Expanded state & city keyword map for India
        const STATE_KEYWORDS = {
            'Tamil Nadu': ['chennai', 'coimbatore', 'madurai', 'tiruchirappalli', 'salem', 'vellore', 'tirunelveli', 'kanchipuram', 'hosur', 'tn', 'tamilnadu', 'tamil'],
            'Karnataka': ['bangalore', 'bengaluru', 'mysore', 'hubli', 'mangalore', 'belgaum', 'tumkur', 'karnataka', 'ka'],
            'Maharashtra': ['mumbai', 'pune', 'nagpur', 'nashik', 'aurangabad', 'solapur', 'thane', 'maharashtra', 'mh'],
            'Gujarat': ['ahmedabad', 'surat', 'vadodara', 'rajkot', 'gandhinagar', 'bhavnagar', 'gujarat', 'gj'],
            'Rajasthan': ['jaipur', 'jodhpur', 'udaipur', 'ajmer', 'bikaner', 'rajasthan', 'rj'],
            'Delhi': ['delhi', 'new delhi', 'dwarka', 'noida', 'gurgaon', 'gurugram', 'faridabad', 'ghaziabad'],
            'Uttar Pradesh': ['lucknow', 'kanpur', 'agra', 'varanasi', 'noida', 'mathura', 'aligarh', 'uttar pradesh', 'up'],
            'Telangana': ['hyderabad', 'warangal', 'nizamabad', 'karimnagar', 'telangana', 'ts'],
            'Andhra Pradesh': ['visakhapatnam', 'vijayawada', 'guntur', 'tirupati', 'andhra', 'ap'],
            'West Bengal': ['kolkata', 'howrah', 'durgapur', 'siliguri', 'west bengal', 'wb'],
            'Madhya Pradesh': ['bhopal', 'indore', 'gwalior', 'jabalpur', 'madhya pradesh', 'mp'],
            'Kerala': ['kochi', 'trivandrum', 'thiruvananthapuram', 'kozhikode', 'thrissur', 'kerala', 'kl'],
            'Haryana': ['gurgaon', 'gurugram', 'faridabad', 'panipat', 'ambala', 'haryana', 'hr'],
            'Punjab': ['ludhiana', 'amritsar', 'jalandhar', 'patiala', 'punjab', 'pb']
        };

        const combinedText = `${source || ''} ${destination || ''}`.toLowerCase();
        let matchedStates = [];
        for (const [state, keywords] of Object.entries(STATE_KEYWORDS)) {
            if (keywords.some(kw => combinedText.includes(kw))) {
                matchedStates.push(state);
            }
        }

        let dbTolls = [];
        if (matchedStates.length > 0) {
            const query = `
                SELECT * FROM toll_rate_master 
                WHERE vehicle_class ILIKE $1 
                  AND active = true 
                  AND (${matchedStates.map((_, i) => `state ILIKE $${i + 2}`).join(' OR ')})
                ORDER BY toll_amount DESC
            `;
            const params = [normalizedClass, ...matchedStates.map(s => `%${s}%`)];
            const result = await pool.query(query, params);
            dbTolls = result.rows;
        }

        if (dbTolls.length === 0) {
            // Fall back to general active tolls matching vehicle_class
            const result = await pool.query(
                `SELECT * FROM toll_rate_master WHERE vehicle_class ILIKE $1 AND active = true ORDER BY toll_amount DESC`,
                [normalizedClass]
            );
            dbTolls = result.rows;
        }

        const distKm = planned_distance ? parseFloat(planned_distance) : 120;
        // Determine number of toll plazas based on distance (1 toll per 45 km, minimum 1 if distance > 0)
        let estimatedTollCount = 0;
        if (distKm > 0) {
            estimatedTollCount = Math.max(1, Math.ceil(distKm / 45));
        }

        let tolls = [];
        if (dbTolls.length >= estimatedTollCount && estimatedTollCount > 0) {
            tolls = dbTolls.slice(0, estimatedTollCount);
        } else if (estimatedTollCount > 0) {
            tolls = [...dbTolls];
            const baseRateMap = { 'Truck': 160, 'Van': 85, 'Mini': 60, 'Car': 50 };
            const baseFee = baseRateMap[normalizedClass] || 85;

            const remaining = estimatedTollCount - tolls.length;
            const srcName = source ? source.split(',')[0].trim() : 'Source';
            const destName = destination ? destination.split(',')[0].trim() : 'Destination';

            for (let i = 1; i <= remaining; i++) {
                const tollFee = Math.round(baseFee * (0.9 + (i % 3) * 0.15));
                tolls.push({
                    id: `dyn-toll-${i}`,
                    toll_name: `${srcName} to ${destName} Toll Plaza #${tolls.length + 1}`,
                    location: `${srcName} Corridor`,
                    highway: `NH-${44 + i * 4}`,
                    state: matchedStates[0] || 'State Highway',
                    vehicle_class: normalizedClass,
                    toll_amount: tollFee.toFixed(2)
                });
            }
        }

        const total = Math.round(tolls.reduce((acc, t) => acc + parseFloat(t.toll_amount), 0) * 100) / 100;

        res.json({
            tolls_detected: tolls,
            total_toll_amount: total,
            message: tolls.length > 0 
                ? `${tolls.length} Toll Plaza${tolls.length > 1 ? 's' : ''} Detected (Total: ₹${total})`
                : 'No toll plazas detected on this route.',
            source: 'Toll Master & Route Estimator'
        });
    } catch (err) {
        console.error("Toll estimate error:", err);
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
