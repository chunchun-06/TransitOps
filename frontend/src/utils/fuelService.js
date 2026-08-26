/**
 * Fuel Service Interface (Frontend / Simulation Only)
 * Prepared for future OCR API and backend service integration.
 */

// Supported MIME types and extensions
export const ALLOWED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Validates uploaded fuel bill file size and type.
 */
export const validateFuelBillFile = (file) => {
    if (!file) {
        return { valid: false, error: "No file selected." };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
        return { valid: false, error: "File size exceeds maximum limit of 10 MB." };
    }

    const isValidType = ALLOWED_FILE_TYPES.includes(file.type) || 
        /\.(jpg|jpeg|png|pdf)$/i.test(file.name);

    if (!isValidType) {
        return { valid: false, error: "Unsupported file type. Please upload JPG, JPEG, PNG, or PDF." };
    }

    return { valid: true, error: null };
};

/**
 * Creates file preview details.
 */
export const createBillPreview = (file) => {
    const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png)$/i.test(file.name);
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);

    return {
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        type: file.type || (isPdf ? "PDF Document" : "Image"),
        isImage,
        isPdf,
        previewUrl: isImage ? URL.createObjectURL(file) : null
    };
};

/**
 * Simulates OCR bill scanning with step-by-step progress callbacks.
 * Returns structured OCR response format ready for backend replacement.
 */
export const simulateOCRScanning = async (file, onProgressUpdate) => {
    const steps = [
        { label: "Scanning fuel bill...", delay: 600, progress: 20 },
        { label: "Reading bill details...", delay: 700, progress: 45 },
        { label: "Extracting fuel quantity...", delay: 700, progress: 70 },
        { label: "Extracting amount...", delay: 600, progress: 90 },
        { label: "Scan Complete", delay: 400, progress: 100 }
    ];

    for (const step of steps) {
        if (onProgressUpdate) {
            onProgressUpdate(step.label, step.progress);
        }
        await new Promise(resolve => setTimeout(resolve, step.delay));
    }

    const fileName = file.name || "";
    
    // 1. Extract Fuel Type
    let fuelType = "Diesel";
    if (/petrol/i.test(fileName)) {
        fuelType = "Petrol";
    } else if (/cng/i.test(fileName)) {
        fuelType = "CNG";
    } else if (/electric/i.test(fileName)) {
        fuelType = "Electric";
    }

    // 2. Extract Date if available
    let billDate = new Date().toISOString().split("T")[0];
    let cleanedName = fileName;
    
    // Match YYYY-MM-DD or YYYY_MM_DD or YYYY/MM/DD
    const dateMatchYMD = fileName.match(/\b(\d{4})[-/_](\d{1,2})[-/_](\d{1,2})\b/);
    // Match DD-MM-YYYY or DD_MM_YYYY or DD/MM/YYYY
    const dateMatchDMY = fileName.match(/\b(\d{1,2})[-/_](\d{1,2})[-/_](\d{4})\b/);
    
    if (dateMatchYMD) {
        const y = dateMatchYMD[1];
        const m = dateMatchYMD[2].padStart(2, '0');
        const d = dateMatchYMD[3].padStart(2, '0');
        billDate = `${y}-${m}-${d}`;
        cleanedName = cleanedName.replace(dateMatchYMD[0], "");
    } else if (dateMatchDMY) {
        const d = dateMatchDMY[1].padStart(2, '0');
        const m = dateMatchDMY[2].padStart(2, '0');
        const y = dateMatchDMY[3];
        billDate = `${y}-${m}-${d}`;
        cleanedName = cleanedName.replace(dateMatchDMY[0], "");
    } else if (file && file.lastModified) {
        try {
            const fileD = new Date(file.lastModified);
            if (!isNaN(fileD.getTime())) {
                billDate = fileD.toISOString().split("T")[0];
            }
        } catch (e) {
            billDate = new Date().toISOString().split("T")[0];
        }
    }

    // 3. Extract Bill Number if available (e.g. FB-12345, INV-2026-902, etc.)
    let billNumber = "";
    const billNumMatch = cleanedName.match(/\b(FB-\d+|INV-\d+|BILL-\d+|[A-Z]{2,}-\d+|\d{5,})\b/i);
    if (billNumMatch) {
        billNumber = billNumMatch[0].toUpperCase();
        cleanedName = cleanedName.replace(billNumMatch[0], "");
    } else {
        const randomSuffix = Math.floor(10000 + Math.random() * 90000);
        billNumber = `FB-${randomSuffix}`;
    }

    // 4. Extract Volume and Amount
    let volume = null;
    let amount = null;

    // Search for volume explicitly (e.g. 50L, 50liters, 50.5 Litres)
    const volumeMatch = cleanedName.match(/\b(\d+(?:\.\d+)?)\s*(?:l|liters|liter|litres|ltrs|ltr)\b/i);
    if (volumeMatch) {
        volume = parseFloat(volumeMatch[1]);
        cleanedName = cleanedName.replace(volumeMatch[0], "");
    }

    // Search for amount explicitly (e.g. 5000INR, 5000 rs, ₹5000)
    const amountMatch = cleanedName.match(/\b(?:rs|inr|₹|amount|cost)\.?\s*(\d+(?:\.\d+)?)\b/i) || 
                        cleanedName.match(/\b(\d+(?:\.\d+)?)\s*(?:rs|inr|rupees)\b/i);
    if (amountMatch) {
        amount = parseFloat(amountMatch[1]);
        cleanedName = cleanedName.replace(amountMatch[0], "");
    }

    // If still missing volume or amount, search for raw numbers in cleanedName
    const rawNumbers = cleanedName.match(/\b\d+(?:\.\d+)?\b/g);
    if (rawNumbers) {
        const numbers = rawNumbers.map(parseFloat).filter(n => !isNaN(n));
        
        if (volume === null && amount === null) {
            if (numbers.length >= 2) {
                // Assign smaller to volume, larger to amount
                const sorted = [...numbers].sort((a, b) => a - b);
                volume = sorted[0];
                amount = sorted[sorted.length - 1];
            } else if (numbers.length === 1) {
                const num = numbers[0];
                if (num > 300) {
                    amount = num;
                } else {
                    volume = num;
                }
            }
        } else if (volume === null && amount !== null) {
            if (numbers.length >= 1) {
                volume = numbers[0];
            }
        } else if (volume !== null && amount === null) {
            if (numbers.length >= 1) {
                amount = numbers[0];
            }
        }
    }

    // Fallbacks and alignment:
    if (volume !== null && amount === null) {
        amount = Math.round(volume * 100);
    } else if (amount !== null && volume === null) {
        volume = Math.round((amount / 100) * 10) / 10;
    } else if (volume === null && amount === null) {
        volume = Math.round((35 + Math.random() * 45) * 10) / 10;
        const price = Math.round((95 + Math.random() * 10) * 100) / 100;
        amount = Math.round(volume * price);
    }

    const pricePerLitre = volume > 0 ? Math.round((amount / volume) * 100) / 100 : 100;

    return {
        fuelType,
        volume,
        amount,
        pricePerLitre,
        billDate,
        billNumber
    };
};

/**
 * Formats a fuel record for state management.
 */
export const buildFuelRecordPayload = ({
    billNumber,
    billDate,
    vehicleId,
    vehicleReg,
    driverId,
    driverName,
    tripId,
    tripCode,
    fuelType,
    volume,
    amount,
    pricePerLitre,
    fileName
}) => {
    const volNum = parseFloat(volume) || 0;
    const amtNum = parseFloat(amount) || 0;
    const calcPrice = volNum > 0 ? Math.round((amtNum / volNum) * 100) / 100 : (parseFloat(pricePerLitre) || 100);
    let cleanDate = billDate || new Date().toISOString().split("T")[0];
    if (cleanDate && cleanDate.includes("T")) cleanDate = cleanDate.split("T")[0];

    return {
        id: `fb-${Date.now()}`,
        bill_number: billNumber || `FB-${Math.floor(10000 + Math.random() * 90000)}`,
        date: cleanDate,
        vehicle_id: vehicleId || "",
        vehicle_reg: vehicleReg || "—",
        driver_id: driverId || "",
        driver_name: driverName || "—",
        trip_id: tripId || "",
        trip_code: tripCode || "—",
        fuel_type: fuelType || "Diesel",
        volume: volNum,
        amount: amtNum,
        price_per_litre: calcPrice,
        bill_file_name: fileName || "bill_receipt.jpg"
    };
};
