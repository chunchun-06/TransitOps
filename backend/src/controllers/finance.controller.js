const pool = require('../config/db');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const FuelPriceService = require('../services/fuel_price.service');

// Maintenance
exports.getMaintenanceLogs = async (req, res) => {
    try {
        const query = `
            SELECT m.id, m.vehicle_id, m.service_type, m.description, m.cost, m.status, m.service_date, v.registration_no, v.vehicle_name 
            FROM maintenance m
            LEFT JOIN vehicles v ON m.vehicle_id = v.id
            ORDER BY m.service_date DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createMaintenanceLog = async (req, res) => {
    const { vehicle_id, service_type, cost, status, service_date, description } = req.body;
    try {
        await pool.query('BEGIN');
        const result = await pool.query(
            `INSERT INTO maintenance (vehicle_id, service_type, cost, status, service_date, description, created_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [vehicle_id, service_type, cost, status || 'In Shop', service_date || new Date(), description || '', req.user?.id || null]
        );
        
        const maintId = result.rows[0].id;
        if (cost && parseFloat(cost) > 0) {
            await pool.query(
                `INSERT INTO expenses (vehicle_id, category, description, amount, source_type, source_id, date, created_by)
                 VALUES ($1, 'MAINTENANCE', $2, $3, 'MAINTENANCE', $4, $5, $6)
                 ON CONFLICT (source_type, source_id) DO UPDATE SET amount = EXCLUDED.amount, description = EXCLUDED.description`,
                [vehicle_id, service_type || 'Maintenance Log', cost, maintId, service_date || new Date(), req.user?.id || null]
            );
        }

        if (status === 'In Shop') {
            await pool.query("UPDATE vehicles SET status = 'In Shop' WHERE id = $1", [vehicle_id]);
        }
        await pool.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateMaintenanceLog = async (req, res) => {
    const { id } = req.params;
    const { service_type, cost, status, service_date, description } = req.body;
    try {
        await pool.query('BEGIN');
        
        const log = await pool.query('SELECT vehicle_id FROM maintenance WHERE id = $1', [id]);
        if (log.rows.length > 0) {
            const vehicle_id = log.rows[0].vehicle_id;
            const result = await pool.query(
                `UPDATE maintenance 
                 SET service_type = $1, cost = $2, status = $3, service_date = $4, description = $5 
                 WHERE id = $6 RETURNING *`,
                [service_type, cost, status, service_date, description || '', id]
            );
            
            if (cost && parseFloat(cost) > 0) {
                await pool.query(
                    `INSERT INTO expenses (vehicle_id, category, description, amount, source_type, source_id, date)
                     VALUES ($1, 'MAINTENANCE', $2, $3, 'MAINTENANCE', $4, $5)
                     ON CONFLICT (source_type, source_id) DO UPDATE SET amount = EXCLUDED.amount, description = EXCLUDED.description`,
                    [vehicle_id, service_type || 'Maintenance Log', cost, id, service_date || new Date()]
                );
            } else {
                await pool.query("DELETE FROM expenses WHERE source_type = 'MAINTENANCE' AND source_id = $1", [id]);
            }

            if (status === 'Completed') {
                await pool.query("UPDATE vehicles SET status = 'Available' WHERE id = $1", [vehicle_id]);
            } else if (status === 'In Shop') {
                await pool.query("UPDATE vehicles SET status = 'In Shop' WHERE id = $1", [vehicle_id]);
            }
            await pool.query('COMMIT');
            res.json(result.rows[0]);
        } else {
            await pool.query('ROLLBACK');
            res.status(404).json({ message: 'Not found' });
        }
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateMaintenanceStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await pool.query('BEGIN');
        const log = await pool.query('SELECT vehicle_id FROM maintenance WHERE id = $1', [id]);
        if (log.rows.length > 0) {
            const vehicle_id = log.rows[0].vehicle_id;
            const result = await pool.query(
                "UPDATE maintenance SET status = $1 WHERE id = $2 RETURNING *",
                [status, id]
            );
            if (status === 'Completed') {
                await pool.query("UPDATE vehicles SET status = 'Available' WHERE id = $1", [vehicle_id]);
            } else if (status === 'In Shop') {
                await pool.query("UPDATE vehicles SET status = 'In Shop' WHERE id = $1", [vehicle_id]);
            }
            await pool.query('COMMIT');
            res.json(result.rows[0]);
        } else {
            await pool.query('ROLLBACK');
            res.status(404).json({ message: 'Not found' });
        }
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteMaintenanceLog = async (req, res) => {
    try {
        await pool.query('BEGIN');
        await pool.query("DELETE FROM expenses WHERE source_type = 'MAINTENANCE' AND source_id = $1", [req.params.id]);
        await pool.query("DELETE FROM maintenance WHERE id = $1", [req.params.id]);
        await pool.query('COMMIT');
        res.json({ message: 'Deleted' });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Fuel
exports.getFuelLogs = async (req, res) => {
    try {
        const query = `
            SELECT 
                f.id, 
                f.trip_id, 
                f.vehicle_id, 
                f.fuel_amount, 
                f.cost, 
                f.price_per_liter, 
                f.fuel_type, 
                f.date, 
                f.invoice_number,
                f.receipt_vehicle_number,
                f.payment_mode,
                f.receipt_image,
                v.registration_no, 
                v.vehicle_name,
                t.driver_id,
                d.name AS driver_name
            FROM fuel f
            LEFT JOIN vehicles v ON f.vehicle_id = v.id
            LEFT JOIN trips t ON f.trip_id = t.id
            LEFT JOIN drivers d ON t.driver_id = d.id
            ORDER BY f.date DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

function parseAndNormalizeDate(dateStr) {
    if (!dateStr) return null;
    
    let clean = dateStr.replace(/^[^\w]+|[^\w]+$/g, '').trim();

    const months = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
        january: '01', february: '02', march: '03', april: '04', june: '06',
        july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
    };

    const dMonthY = clean.match(/^(\d{1,2})[-\s\/\.]?([a-z]{3,9})[-\s\/\.]?(\d{2,4})$/i);
    if (dMonthY) {
        const d = dMonthY[1].padStart(2, '0');
        const mStr = dMonthY[2].toLowerCase();
        let y = dMonthY[3];
        if (y.length === 2) y = '20' + y;
        
        const m = months[mStr];
        if (m) {
            return `${y}-${m}-${d}`;
        }
    }

    const standardDmy = clean.match(/^(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{2,4})$/);
    if (standardDmy) {
        const d = standardDmy[1].padStart(2, '0');
        const m = standardDmy[2].padStart(2, '0');
        let y = standardDmy[3];
        if (y.length === 2) y = '20' + y;
        const dNum = parseInt(d);
        const mNum = parseInt(m);
        if (dNum <= 31 && mNum <= 12) {
            return `${y}-${m}-${d}`;
        }
    }

    const standardYmd = clean.match(/^(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})$/);
    if (standardYmd) {
        const y = standardYmd[1];
        const m = standardYmd[2].padStart(2, '0');
        const d = standardYmd[3].padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    try {
        const dObj = new Date(clean);
        if (!isNaN(dObj.getTime())) {
            return dObj.toISOString().split('T')[0];
        }
    } catch (e) {
        // ignore
    }

    return null;
}

function parseReceiptText(text) {
    let fuelType = null;
    let pricePerLitre = null;
    let amount = null;
    let volume = null;
    let vehicleNumber = null;
    let invoiceNumber = null;
    let billDate = null;
    let billTime = null;
    let paymentMode = null;

    const cleanNumber = (val) => {
        if (!val) return null;
        const cleaned = val.replace(/[₹\s]|Rs\.?|INR/ig, '').trim();
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
    };

    const productRegexes = [
        /PRODUCT\s*:\s*([a-z0-9]+)/i,
        /FUEL\s*TYPE\s*:\s*([a-z0-9]+)/i,
        /PRODUCT\s+([a-z0-9]+)/i,
    ];
    for (const r of productRegexes) {
        const m = text.match(r);
        if (m) {
            fuelType = m[1].trim();
            break;
        }
    }
    if (fuelType) {
        const ftLower = fuelType.toLowerCase();
        if (ftLower.includes('diesel') || ftLower === 'hsd' || ftLower === 'h.s.d') {
            fuelType = 'Diesel';
        } else if (ftLower.includes('petrol') || ftLower === 'ms' || ftLower === 'm.s' || ftLower.includes('gasoline')) {
            fuelType = 'Petrol';
        } else if (ftLower.includes('cng')) {
            fuelType = 'CNG';
        } else if (ftLower.includes('electric')) {
            fuelType = 'Electric';
        } else {
            fuelType = null;
        }
    }
    if (!fuelType) {
        if (/\bdiesel\b/i.test(text) || /\bhsd\b/i.test(text)) {
            fuelType = 'Diesel';
        } else if (/\bpetrol\b/i.test(text) || /\bms\b/i.test(text) || /\bgasoline\b/i.test(text)) {
            fuelType = 'Petrol';
        } else if (/\bcng\b/i.test(text)) {
            fuelType = 'CNG';
        } else if (/\belectric\b/i.test(text)) {
            fuelType = 'Electric';
        }
    }

    const rateRegexes = [
        /RATE\s*[\/\s]?\s*LTR\s*:\s*([₹\s]*\d+(?:\.\d+)?)/i,
        /RATE\s*[\/\s]?\s*LTR\s+([₹\s]*\d+(?:\.\d+)?)/i,
        /RATE\s*:\s*([₹\s]*\d+(?:\.\d+)?)\s*\/L/i,
        /PRICE\s*[\/\s]?\s*LTR\s*:\s*([₹\s]*\d+(?:\.\d+)?)/i,
        /UNIT\s*PRICE\s*:\s*([₹\s]*\d+(?:\.\d+)?)/i,
    ];
    for (const r of rateRegexes) {
        const m = text.match(r);
        if (m) {
            pricePerLitre = cleanNumber(m[1]);
            break;
        }
    }

    const amountRegexes = [
        /AMOUNT\s*:\s*([₹\s]*\d+(?:\.\d+)?)/i,
        /AMOUNT\s+([₹\s]*\d+(?:\.\d+)?)/i,
        /TOTAL\s*AMOUNT\s*:\s*([₹\s]*\d+(?:\.\d+)?)/i,
        /NET\s*AMOUNT\s*:\s*([₹\s]*\d+(?:\.\d+)?)/i,
    ];
    for (const r of amountRegexes) {
        const m = text.match(r);
        if (m) {
            amount = cleanNumber(m[1]);
            break;
        }
    }

    const volumeRegexes = [
        /VOLUME\s*(?:\(\s*LTR\s*\)|\(\s*LT\s*\))?\s*:\s*(\d+(?:\.\d+)?)/i,
        /VOLUME\s*(?:\(\s*LTR\s*\)|\(\s*LT\s*\))?\s+(\d+(?:\.\d+)?)/i,
        /QTY\s*:\s*(\d+(?:\.\d+)?)/i,
        /QUANTITY\s*:\s*(\d+(?:\.\d+)?)/i,
    ];
    for (const r of volumeRegexes) {
        const m = text.match(r);
        if (m) {
            volume = cleanNumber(m[1]);
            break;
        }
    }

    const vehicleRegexes = [
        /VEH\s*NO\s*:\s*([a-z0-9\-\s]+)/i,
        /VEHICLE\s*NO\s*:\s*([a-z0-9\-\s]+)/i,
        /VEH\s+NO\s+([a-z0-9\-\s]+)/i,
    ];
    for (const r of vehicleRegexes) {
        const m = text.match(r);
        if (m) {
            const cleaned = m[1].replace(/[\-\s]/g, '').trim().toUpperCase();
            if (cleaned.length >= 6 && cleaned.length <= 12) {
                vehicleNumber = cleaned;
                break;
            }
        }
    }

    const receiptRegexes = [
        /Receipt\s*No\.?\s*:\s*([A-Z0-9\-]+)/i,
        /INVOICE\s*NO\.?\s*:\s*([A-Z0-9\-]+)/i,
        /BILL\s*NO\.?\s*:\s*([A-Z0-9\-]+)/i,
        /RECEIPT\s*:\s*([A-Z0-9\-]+)/i,
    ];
    for (const r of receiptRegexes) {
        const m = text.match(r);
        if (m) {
            invoiceNumber = m[1].trim();
            break;
        }
    }

    const dateRegexes = [
        /DATE\s*:\s*([a-z0-9\-\/\.\s]+)/i,
        /DATE\s+([a-z0-9\-\/\.\s]+)/i,
    ];
    let rawDate = null;
    for (const r of dateRegexes) {
        const m = text.match(r);
        if (m) {
            rawDate = m[1].trim();
            break;
        }
    }
    if (rawDate) {
        const datePart = rawDate.split(/\s{2,}/)[0].split(/time/i)[0].trim();
        billDate = parseAndNormalizeDate(datePart);
    }

    const timeRegexes = [
        /TIME\s*:\s*([0-9]{2}:[0-9]{2}(?::[0-9]{2})?)/i,
        /TIME\s+([0-9]{2}:[0-9]{2}(?::[0-9]{2})?)/i,
    ];
    for (const r of timeRegexes) {
        const m = text.match(r);
        if (m) {
            billTime = m[1].trim();
            break;
        }
    }

    const modeRegexes = [
        /MODE\s*:\s*([a-z]+)/i,
        /PAYMENT\s*MODE\s*:\s*([a-z]+)/i,
    ];
    for (const r of modeRegexes) {
        const m = text.match(r);
        if (m) {
            paymentMode = m[1].trim();
            paymentMode = paymentMode.charAt(0).toUpperCase() + paymentMode.slice(1).toLowerCase();
            break;
        }
    }

    return {
        fuelType,
        pricePerLitre,
        amount,
        volume,
        vehicleNumber,
        invoiceNumber,
        billDate,
        billTime,
        paymentMode
    };
}

exports.extractFuelReceipt = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        let extractedText = '';

        const isPdf = req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf');

        if (isPdf) {
            // For PDFs: try pdf-parse first, fall back to raw text
            try {
                const parsedPdf = await pdfParse(req.file.buffer);
                extractedText = parsedPdf.text;
            } catch (pdfErr) {
                console.warn('pdf-parse failed, using raw buffer text:', pdfErr.message);
                extractedText = req.file.buffer.toString('utf-8');
            }
        } else {
            // For images: convert buffer to base64 data URL (required for Tesseract.js v5+)
            const mimeType = req.file.mimetype || 'image/jpeg';
            const base64 = req.file.buffer.toString('base64');
            const dataUrl = `data:${mimeType};base64,${base64}`;

            console.log(`Running Tesseract OCR on ${req.file.originalname} (${Math.round(req.file.size / 1024)} KB)...`);
            const ocrResult = await Tesseract.recognize(dataUrl, 'eng');
            extractedText = ocrResult.data.text;
            console.log('OCR complete. Text length:', extractedText.length);
        }

        const data = parseReceiptText(extractedText);
        console.log('Parsed receipt data:', JSON.stringify(data));

        res.json({
            success: true,
            data,
            rawText: extractedText
        });
    } catch (err) {
        console.error('OCR/Extraction failed:', err);
        res.status(500).json({ message: 'Receipt extraction failed', error: err.message });
    }
};

exports.createFuelLog = async (req, res) => {
    const { 
        vehicle_id, 
        trip_id, 
        fuel_amount, 
        cost, 
        price_per_liter, 
        fuel_type, 
        date,
        invoice_number,
        receipt_vehicle_number,
        payment_mode,
        receipt_image
    } = req.body;
    try {
        let resolvedFuelType = fuel_type || 'Diesel';
        let resolvedPrice = price_per_liter ? parseFloat(price_per_liter) : null;

        if (vehicle_id) {
            const vehRes = await pool.query(
                'SELECT fuel_type, current_fuel_level_liters, fuel_tank_capacity_liters FROM vehicles WHERE id = $1', 
                [vehicle_id]
            );
            if (vehRes.rows.length > 0) {
                if (!fuel_type && vehRes.rows[0].fuel_type) {
                    resolvedFuelType = vehRes.rows[0].fuel_type;
                }
                
                if (!resolvedPrice) {
                    if (cost && fuel_amount && parseFloat(fuel_amount) > 0) {
                        resolvedPrice = Math.round((parseFloat(cost) / parseFloat(fuel_amount)) * 100) / 100;
                    } else {
                        // Try FuelPriceService for current market price
                        try {
                            const priceData = await FuelPriceService.getCurrentFuelPrice({ 
                                city: 'Chennai', state: 'Tamil Nadu', fuelType: resolvedFuelType 
                            });
                            resolvedPrice = priceData.pricePerLitre;
                        } catch (priceErr) {
                            console.warn('[Finance] Could not fetch fuel price for log:', priceErr.message);
                            resolvedPrice = null; // Don't fake a price
                        }
                    }
                }

                const currentLiters = parseFloat(vehRes.rows[0].current_fuel_level_liters || 0);
                const addedLiters = parseFloat(fuel_amount || 0);
                const maxCap = parseFloat(vehRes.rows[0].fuel_tank_capacity_liters || 999999);
                const newLevel = Math.min(currentLiters + addedLiters, maxCap);
                await pool.query('UPDATE vehicles SET current_fuel_level_liters = $1 WHERE id = $2', [newLevel, vehicle_id]);
            }
        }

        const result = await pool.query(
            `INSERT INTO fuel (vehicle_id, trip_id, fuel_amount, cost, price_per_liter, fuel_type, date, created_by, invoice_number, receipt_vehicle_number, payment_mode, receipt_image) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [
                vehicle_id || null, 
                trip_id || null, 
                fuel_amount, 
                cost, 
                resolvedPrice, 
                resolvedFuelType, 
                date || new Date(), 
                req.user?.id || null,
                invoice_number || null,
                receipt_vehicle_number || null,
                payment_mode || null,
                receipt_image || null
            ]
        );
        
        const fuelId = result.rows[0].id;
        if (cost && parseFloat(cost) > 0) {
            await pool.query(
                `INSERT INTO expenses (vehicle_id, trip_id, category, description, amount, source_type, source_id, date, created_by)
                 VALUES ($1, $2, 'FUEL', 'Fuel Bill Upload', $3, 'FUEL', $4, $5, $6)
                 ON CONFLICT (source_type, source_id) DO UPDATE SET amount = EXCLUDED.amount`,
                [vehicle_id || null, trip_id || null, cost, fuelId, date || new Date(), req.user?.id || null]
            );
        }

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteFuelLog = async (req, res) => {
    try {
        await pool.query('BEGIN');
        await pool.query("DELETE FROM expenses WHERE source_type = 'FUEL' AND source_id = $1", [req.params.id]);
        await pool.query("DELETE FROM fuel WHERE id = $1", [req.params.id]);
        await pool.query('COMMIT');
        res.json({ message: 'Deleted' });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Expenses
exports.getExpenses = async (req, res) => {
    try {
        const query = `
            SELECT e.id, e.trip_id, e.vehicle_id, e.category, e.description, e.amount, e.date, v.registration_no, v.vehicle_name 
            FROM expenses e
            LEFT JOIN vehicles v ON e.vehicle_id = v.id
            ORDER BY e.date DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createExpense = async (req, res) => {
    const { vehicle_id, trip_id, amount, category, date, description } = req.body;
    try {
        let resolvedVehicleId = vehicle_id || null;
        let resolvedAmount = amount ? parseFloat(amount) : null;
        let resolvedDescription = description || '';

        if (trip_id) {
            const tripResult = await pool.query("SELECT vehicle_id, toll_amount, source, destination FROM trips WHERE id = $1", [trip_id]);
            if (tripResult.rows.length > 0) {
                const t = tripResult.rows[0];
                if (!resolvedVehicleId) resolvedVehicleId = t.vehicle_id;
                
                // If amount is not provided or 0, fallback to trip's recorded toll_amount
                if ((!resolvedAmount || isNaN(resolvedAmount) || resolvedAmount <= 0) && t.toll_amount && parseFloat(t.toll_amount) > 0) {
                    resolvedAmount = parseFloat(t.toll_amount);
                }

                if (!resolvedDescription && category && category.toUpperCase() === 'TOLL') {
                    resolvedDescription = `Toll charges for TR-${String(trip_id).substring(0, 5).toUpperCase()} (${t.source} → ${t.destination})`;
                }
            }
        }

        if (!resolvedAmount || isNaN(resolvedAmount) || resolvedAmount <= 0) {
            return res.status(400).json({ message: 'Valid expense amount is required.' });
        }

        const result = await pool.query(
            `INSERT INTO expenses (vehicle_id, trip_id, amount, category, date, description, created_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [resolvedVehicleId, trip_id || null, resolvedAmount, category || 'Toll', date || new Date(), resolvedDescription, req.user?.id || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteExpense = async (req, res) => {
    try {
        await pool.query("DELETE FROM expenses WHERE id = $1", [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
