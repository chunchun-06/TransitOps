/**
 * Fuel Service — integrates with backend OCR extraction API.
 */
import { extractFuelReceipt } from "../api/fuel.api";

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
 * Sends fuel bill receipt (image/PDF) to backend for real OCR extraction.
 */
export const simulateOCRScanning = async (file, onProgressUpdate) => {
    const steps = [
        { label: "Scanning fuel bill...", delay: 200, progress: 20 },
        { label: "Reading bill details...", delay: 300, progress: 45 },
        { label: "Extracting fuel quantity...", delay: 300, progress: 70 },
        { label: "Extracting amount...", delay: 200, progress: 90 },
        { label: "Scan Complete", delay: 100, progress: 100 }
    ];

    // Start extraction in parallel
    const formData = new FormData();
    formData.append("file", file);

    const extractionPromise = extractFuelReceipt(formData)
        .then(res => res.data)
        .catch(err => {
            console.error("Extraction error inside service:", err);
            throw new Error(err.response?.data?.message || err.message || "Failed to extract receipt data.");
        });

    // Run progress steps animation
    for (const step of steps) {
        if (onProgressUpdate) {
            onProgressUpdate(step.label, step.progress);
        }
        await new Promise(resolve => setTimeout(resolve, step.delay));
    }

    const response = await extractionPromise;
    if (!response || !response.success) {
        throw new Error("Failed to extract data from receipt");
    }

    const { data } = response;

    return {
        fuelType: data.fuelType || "",
        volume: data.volume !== null && data.volume !== undefined ? String(data.volume) : "",
        amount: data.amount !== null && data.amount !== undefined ? String(data.amount) : "",
        pricePerLitre: data.pricePerLitre !== null && data.pricePerLitre !== undefined ? String(data.pricePerLitre) : "",
        billDate: data.billDate || "",
        billTime: data.billTime || "",
        billNumber: data.invoiceNumber || "",
        receiptVehicleNumber: data.vehicleNumber || "",
        paymentMode: data.paymentMode || "",
        receiptImage: data.receipt_image || ""
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
    fileName,
    receiptVehicleNumber,
    paymentMode,
    receiptImage
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
        bill_file_name: fileName || "bill_receipt.jpg",
        receipt_vehicle_number: receiptVehicleNumber || null,
        payment_mode: paymentMode || null,
        receipt_image: receiptImage || null
    };
};
