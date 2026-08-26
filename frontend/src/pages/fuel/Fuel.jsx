import { useState, useRef, useEffect } from "react";
import { 
    HiOutlineUpload, 
    HiOutlineDocumentText, 
    HiOutlinePhotograph, 
    HiOutlineTrash, 
    HiOutlineRefresh, 
    HiOutlineCheckCircle, 
    HiOutlineBeaker, 
    HiOutlineCurrencyRupee, 
    HiOutlineFilter,
    HiOutlineTruck,
    HiOutlineUser,
    HiOutlineMap,
    HiOutlineExclamationCircle,
    HiOutlinePencilAlt,
    HiOutlineSearch,
    HiOutlineChartBar
} from "react-icons/hi";
import { useFleet } from "../../context/FleetContext";
import { 
    validateFuelBillFile, 
    createBillPreview, 
    simulateOCRScanning, 
    buildFuelRecordPayload 
} from "../../utils/fuelService";
import { Button, Input, Select } from "../../components/common";
import { getFuelAnalytics } from "../../api/fuel.api";
import { getFuelVarianceStatus } from "../../utils/fuelVariance";

const Fuel = () => {
    const fleet = useFleet();
    const { fuelRecords, vehicles, drivers, trips, addFuelBillRecord, deleteFuelBillRecord } = fleet;

    // View state: 'upload' | 'review' | 'confirmed'
    const [viewMode, setViewMode] = useState("upload");

    // File Upload State
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploadError, setUploadError] = useState("");
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);

    // Scanning Simulation State
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanStatusText, setScanStatusText] = useState("");

    // History Table Filtering
    const [historySearch, setHistorySearch] = useState("");
    const [historyVehicleFilter, setHistoryVehicleFilter] = useState("All");

    // Extracted / Editable OCR Form State
    const [ocrData, setOcrData] = useState({
        fuelType: "",
        volume: "",
        amount: "",
        pricePerLitre: "",
        billDate: "",
        billNumber: "",
        vehicleId: "",
        driverId: "",
        tripId: "",
        receiptVehicleNumber: "",
        paymentMode: "",
        receiptImage: ""
    });

    const [extractedFields, setExtractedFields] = useState({
        fuelType: false,
        volume: false,
        amount: false,
        pricePerLitre: false,
        billDate: false,
        billNumber: false,
        vehicleNumber: false,
        paymentMode: false
    });

    const renderConfidenceBadge = (fieldName) => {
        if (viewMode === "upload") return null;
        const isExtracted = extractedFields[fieldName];
        if (isExtracted) {
            return (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 font-bold px-1.5 py-0.5 rounded border border-emerald-500/20 ml-2 inline-flex items-center">
                    ✓ Auto-extracted
                </span>
            );
        } else {
            return (
                <span className="text-[10px] bg-amber-500/10 text-amber-500 font-bold px-1.5 py-0.5 rounded border border-amber-500/20 ml-2 inline-flex items-center animate-pulse">
                    ⚠ Needs Review
                </span>
            );
        }
    };

    const [isManualPriceEdit, setIsManualPriceEdit] = useState(false);
    const [activeTab, setActiveTab] = useState("scanner"); // 'scanner' | 'history' | 'analytics'

    // Analytics State
    const [analyticsRange, setAnalyticsRange] = useState("all_time");
    const [analyticsCustomStart, setAnalyticsCustomStart] = useState("");
    const [analyticsCustomEnd, setAnalyticsCustomEnd] = useState("");
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);

    const fetchAnalytics = async () => {
        setLoadingAnalytics(true);
        try {
            const params = { range: analyticsRange };
            if (analyticsRange === "custom" && analyticsCustomStart && analyticsCustomEnd) {
                params.startDate = analyticsCustomStart;
                params.endDate = analyticsCustomEnd;
            }
            const res = await getFuelAnalytics(params);
            setAnalyticsData(res.data);
        } catch (err) {
            console.error("Failed to fetch fuel analytics:", err);
        } finally {
            setLoadingAnalytics(false);
        }
    };

    useEffect(() => {
        if (activeTab === "analytics") {
            fetchAnalytics();
        }
    }, [activeTab, analyticsRange, analyticsCustomStart, analyticsCustomEnd]);

    // Automatically recalculate Price per Litre when Volume or Amount changes
    useEffect(() => {
        if (isManualPriceEdit) return;
        const vol = parseFloat(ocrData.volume);
        const amt = parseFloat(ocrData.amount);
        if (vol > 0 && amt >= 0) {
            const calculatedPrice = (amt / vol).toFixed(2);
            setOcrData(prev => ({ ...prev, pricePerLitre: calculatedPrice }));
        }
    }, [ocrData.volume, ocrData.amount, isManualPriceEdit]);

    // Handle Vehicle Selection upfront
    const handleVehicleSelect = (vehId) => {
        setUploadError("");
        const selectedVeh = vehicles.find(v => String(v.id) === String(vehId));
        
        // Find active trip for this vehicle if available
        const activeTrip = trips.find(t => String(t.vehicle_id) === String(vehId) && t.status === "Dispatched");
        let autoDriverId = "";
        let autoTripId = "";
        
        if (activeTrip) {
            autoTripId = activeTrip.id;
            autoDriverId = activeTrip.driver_id;
        }

        setOcrData(prev => ({
            ...prev,
            vehicleId: vehId,
            fuelType: selectedVeh?.fuel_type || prev.fuelType || "Diesel",
            driverId: autoDriverId || prev.driverId,
            tripId: autoTripId || prev.tripId
        }));
    };

    // Handle File Selection
    const handleFileSelect = (file) => {
        setUploadError("");
        if (!file) return;

        const validation = validateFuelBillFile(file);
        if (!validation.valid) {
            setUploadError(validation.error);
            return;
        }

        setSelectedFile(file);
        const prevInfo = createBillPreview(file);
        setPreview(prevInfo);
        setViewMode("upload");
    };

    const handleFileInputChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        setPreview(null);
        setUploadError("");
        setScanProgress(0);
        setScanStatusText("");
        setIsScanning(false);
        setViewMode("upload");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Execute OCR Scan
    const handleStartScan = async () => {
        if (!selectedFile) return;
        if (!ocrData.vehicleId) {
            setUploadError("⚠️ Please select a vehicle first before scanning the fuel bill.");
            return;
        }
        setIsScanning(true);
        setUploadError("");

        try {
            const extracted = await simulateOCRScanning(selectedFile, (statusText, progress) => {
                setScanStatusText(statusText);
                setScanProgress(progress);
            });

            const selectedVeh = vehicles.find(v => String(v.id) === String(ocrData.vehicleId));

            setOcrData(prev => ({
                ...prev,
                fuelType: extracted.fuelType || selectedVeh?.fuel_type || "Diesel",
                volume: String(extracted.volume),
                amount: String(extracted.amount),
                pricePerLitre: String(extracted.pricePerLitre),
                billDate: extracted.billDate || prev.billDate,
                billNumber: extracted.billNumber,
                receiptVehicleNumber: extracted.receiptVehicleNumber,
                paymentMode: extracted.paymentMode,
                receiptImage: extracted.receiptImage
            }));

            setExtractedFields({
                fuelType: !!extracted.fuelType,
                volume: !!extracted.volume,
                amount: !!extracted.amount,
                pricePerLitre: !!extracted.pricePerLitre,
                billDate: !!extracted.billDate,
                billNumber: !!extracted.billNumber,
                vehicleNumber: !!extracted.receiptVehicleNumber,
                paymentMode: !!extracted.paymentMode
            });

            setIsManualPriceEdit(false);
            setViewMode("review");
        } catch (err) {
            console.error("Scanner failed:", err);
            setUploadError(err.message || "Scanning failed. Please try again.");
        } finally {
            setIsScanning(false);
        }
    };

    // Form inputs handling
    const handleOcrChange = (field, value) => {
        if (field === "pricePerLitre") {
            setIsManualPriceEdit(true);
        }
        if (field === "vehicleId") {
            handleVehicleSelect(value);
            return;
        }
        setOcrData(prev => ({ ...prev, [field]: value }));
    };

    // Confirm Fuel Entry (Updates Persistent Database & State)
    const handleConfirmEntry = (e) => {
        e.preventDefault();
        setUploadError("");

        if (!ocrData.vehicleId) {
            setUploadError("⚠️ Please select a vehicle to apply this fuel bill to.");
            return;
        }

        const selectedVeh = vehicles.find(v => String(v.id) === String(ocrData.vehicleId));
        const selectedDrv = drivers.find(d => String(d.id) === String(ocrData.driverId));
        const selectedTrp = trips.find(t => String(t.id) === String(ocrData.tripId));

        const newRecord = buildFuelRecordPayload({
            billNumber: ocrData.billNumber,
            billDate: ocrData.billDate,
            vehicleId: ocrData.vehicleId,
            vehicleReg: selectedVeh ? `${selectedVeh.registration_no} (${selectedVeh.vehicle_name})` : "—",
            driverId: ocrData.driverId,
            driverName: selectedDrv ? selectedDrv.name : "—",
            tripId: ocrData.tripId,
            tripCode: selectedTrp ? `TR-${String(selectedTrp.id).substring(0, 5).toUpperCase()}` : (ocrData.tripId ? "TR-102" : "—"),
            fuelType: ocrData.fuelType,
            volume: ocrData.volume,
            amount: ocrData.amount,
            pricePerLitre: ocrData.pricePerLitre,
            fileName: preview?.name || "fuel_bill.jpg",
            receiptVehicleNumber: ocrData.receiptVehicleNumber,
            paymentMode: ocrData.paymentMode,
            receiptImage: ocrData.receiptImage
        });

        addFuelBillRecord(newRecord);
        setViewMode("confirmed");
    };

    const handleResetScanner = () => {
        handleRemoveFile();
        setOcrData({
            fuelType: "",
            volume: "",
            amount: "",
            pricePerLitre: "",
            billDate: "",
            billNumber: "",
            vehicleId: "",
            driverId: "",
            tripId: "",
            receiptVehicleNumber: "",
            paymentMode: "",
            receiptImage: ""
        });
        setExtractedFields({
            fuelType: false,
            volume: false,
            amount: false,
            pricePerLitre: false,
            billDate: false,
            billNumber: false,
            vehicleNumber: false,
            paymentMode: false
        });
        setViewMode("upload");
    };

    // Dashboard Cards Dynamic Calculations
    const totalVolume = fuelRecords.reduce((acc, r) => acc + (parseFloat(r.volume) || 0), 0);
    const totalExpense = fuelRecords.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);
    const avgPrice = totalVolume > 0 ? (totalExpense / totalVolume).toFixed(2) : "100.00";

    // Selected items for display
    const selectedVehObj = vehicles.find(v => String(v.id) === String(ocrData.vehicleId));
    const selectedTrpObj = trips.find(t => String(t.id) === String(ocrData.tripId));

    const targetReg = selectedVehObj?.registration_no ? selectedVehObj.registration_no.replace(/[\s-]/g, '').toLowerCase() : "";
    const receiptReg = ocrData.receiptVehicleNumber ? ocrData.receiptVehicleNumber.replace(/[\s-]/g, '').toLowerCase() : "";
    const hasRegMismatch = !!(targetReg && receiptReg && targetReg !== receiptReg);

    const volumeVal = parseFloat(ocrData.volume) || 0;
    const priceVal = parseFloat(ocrData.pricePerLitre) || 0;
    const amountVal = parseFloat(ocrData.amount) || 0;
    const hasMathAnomaly = volumeVal > 0 && priceVal > 0 && amountVal > 0 && Math.abs((volumeVal * priceVal) - amountVal) > 1.0;

    // Processed Fuel History Logs
    const filteredHistoryRecords = fuelRecords.filter((rec) => {
        const matchesSearch = 
            (rec.bill_number && rec.bill_number.toLowerCase().includes(historySearch.toLowerCase())) ||
            (rec.vehicle_reg && rec.vehicle_reg.toLowerCase().includes(historySearch.toLowerCase())) ||
            (rec.driver_name && rec.driver_name.toLowerCase().includes(historySearch.toLowerCase()));
        const matchesVehicle = historyVehicleFilter === "All" || String(rec.vehicle_id) === String(historyVehicleFilter);
        return matchesSearch && matchesVehicle;
    });

    return (
        <div className="animate-fade-in-up space-y-6 max-w-[1600px] mx-auto text-primary pb-12">
            
            {/* Header & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-accent/10 text-accent rounded-xl">
                        <HiOutlineBeaker className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Fleet Fuel Management & OCR Scanner</h1>
                        <p className="text-xs text-secondary">Upload fuel receipts, extract invoice metrics, associate with vehicles & dispatches</p>
                    </div>
                </div>

                <div className="flex gap-2 bg-sidebar p-1 rounded-xl border border-border">
                    <button
                        onClick={() => setActiveTab("scanner")}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "scanner" ? "bg-accent text-card shadow" : "text-secondary hover:text-primary"}`}
                    >
                        Bill Upload & Scanner
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "history" ? "bg-accent text-card shadow" : "text-secondary hover:text-primary"}`}
                    >
                        Fuel Log History ({fuelRecords.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("analytics")}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === "analytics" ? "bg-accent text-card shadow" : "text-secondary hover:text-primary"}`}
                    >
                        <HiOutlineChartBar className="w-4 h-4" /> Fuel Analytics
                    </button>
                </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-accent/40 transition-all">
                    <p className="text-[10px] text-secondary uppercase tracking-widest font-bold mb-2">Total Fuel Consumed</p>
                    <p className="text-2xl font-extrabold text-primary">
                        {(Math.round(totalVolume * 10) / 10).toLocaleString()} <span className="text-sm font-normal text-muted">L</span>
                    </p>
                </div>
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-accent/40 transition-all">
                    <p className="text-[10px] text-secondary uppercase tracking-widest font-bold mb-2">Total Fuel Expense</p>
                    <p className="text-2xl font-extrabold text-accent">
                        ₹{(Math.round(totalExpense)).toLocaleString()}
                    </p>
                </div>
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-accent/40 transition-all">
                    <p className="text-[10px] text-secondary uppercase tracking-widest font-bold mb-2">Average Fuel Price</p>
                    <p className="text-2xl font-extrabold text-primary">
                        ₹{avgPrice} <span className="text-sm font-normal text-muted">/L</span>
                    </p>
                </div>
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-accent/40 transition-all">
                    <p className="text-[10px] text-secondary uppercase tracking-widest font-bold mb-2">Fuel Bills Logged</p>
                    <p className="text-2xl font-extrabold text-primary">
                        {fuelRecords.length} <span className="text-sm font-normal text-muted">bills</span>
                    </p>
                </div>
            </div>

            {/* TAB 1: BILL SCANNER & ENTRY MODULE */}
            {activeTab === "scanner" && (
                <div className="space-y-6">
                    
                    {/* Upfront Vehicle Selection Banner */}
                    <div className="bg-card border border-accent/30 rounded-2xl p-5 shadow-sm bg-gradient-to-r from-accent/5 via-card to-card">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-accent text-card rounded-xl">
                                    <HiOutlineTruck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                                        Step 1: Select Target Vehicle for Fuel Bill <span className="text-danger font-extrabold">*</span>
                                    </h2>
                                    <p className="text-xs text-secondary">
                                        Choose which vehicle this fuel bill is being applied to before scanning or entering fuel data
                                    </p>
                                </div>
                            </div>

                            <div className="min-w-[280px]">
                                <Select
                                    label="Choose Vehicle *"
                                    value={ocrData.vehicleId}
                                    onChange={(e) => handleVehicleSelect(e.target.value)}
                                    options={[
                                        { label: "Select Vehicle...", value: "" },
                                        ...vehicles.map(v => ({
                                            label: `${v.registration_no} - ${v.vehicle_name} (${v.fuel_type || 'Diesel'})`,
                                            value: v.id
                                        }))
                                    ]}
                                    required
                                />
                            </div>
                        </div>

                        {/* Selected Vehicle Info Details Banner */}
                        {selectedVehObj ? (
                            <div className="mt-4 pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div className="bg-sidebar p-2.5 rounded-lg border border-border">
                                    <span className="text-muted block text-[10px]">Registration</span>
                                    <span className="font-bold text-primary">{selectedVehObj.registration_no}</span>
                                </div>
                                <div className="bg-sidebar p-2.5 rounded-lg border border-border">
                                    <span className="text-muted block text-[10px]">Vehicle Name</span>
                                    <span className="font-bold text-primary">{selectedVehObj.vehicle_name}</span>
                                </div>
                                <div className="bg-sidebar p-2.5 rounded-lg border border-border">
                                    <span className="text-muted block text-[10px]">Fuel Type</span>
                                    <span className="font-bold text-accent">{selectedVehObj.fuel_type || "Diesel"}</span>
                                </div>
                                <div className="bg-sidebar p-2.5 rounded-lg border border-border">
                                    <span className="text-muted block text-[10px]">Current Tank Level</span>
                                    <span className="font-bold text-primary">
                                        {selectedVehObj.current_fuel_level_liters || 0} / {selectedVehObj.fuel_tank_capacity_liters || '—'} L
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2 font-medium">
                                <HiOutlineExclamationCircle className="w-4 h-4 flex-shrink-0" />
                                <span>No vehicle selected. Please select a vehicle from the dropdown above to proceed with bill upload.</span>
                            </div>
                        )}
                    </div>

                    {/* Left & Right Scanner Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        
                        {/* LEFT COLUMN: Upload & Preview Panel */}
                        <div className="lg:col-span-5 space-y-6">
                            
                            {/* Upload Card */}
                            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xs font-bold text-secondary uppercase tracking-wider">Upload Fuel Bill Receipt</h2>
                                    <span className="text-[10px] bg-sidebar px-2.5 py-1 rounded-md text-muted border border-border font-semibold">Max 10 MB</span>
                                </div>

                                {/* Drag & Drop Area */}
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${isDragOver ? "border-accent bg-accent/5 scale-[0.99]" : "border-border hover:border-accent/60 hover:bg-sidebar/50"}`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".jpg,.jpeg,.png,.pdf"
                                        onChange={handleFileInputChange}
                                        className="hidden"
                                    />

                                    <div className="p-3 bg-accent/10 rounded-full text-accent mb-3">
                                        <HiOutlineUpload className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-bold text-primary">
                                        Drag & Drop Fuel Bill Receipt
                                    </p>
                                    <p className="text-xs text-muted mt-1">
                                        or <span className="text-accent underline font-semibold">Choose File</span> from your computer
                                    </p>
                                    <div className="flex items-center gap-2 mt-4 text-[10px] text-muted font-medium bg-sidebar px-3 py-1.5 rounded-lg border border-border">
                                        <span>Supported Formats: JPG, JPEG, PNG, PDF</span>
                                    </div>
                                </div>

                                {uploadError && (
                                    <div className="mt-4 p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-xs flex items-center gap-2 font-medium">
                                        <HiOutlineExclamationCircle className="w-4 h-4 flex-shrink-0" />
                                        <span>{uploadError}</span>
                                    </div>
                                )}

                                {/* File Preview Card */}
                                {preview && (
                                    <div className="mt-6 bg-sidebar border border-border rounded-xl p-4 space-y-4">
                                        <div className="flex items-center justify-between border-b border-border pb-3">
                                            <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">Selected Bill Preview</h3>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="text-xs text-accent hover:underline font-semibold flex items-center gap-1"
                                                >
                                                    <HiOutlineRefresh className="w-3.5 h-3.5" /> Replace
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveFile}
                                                    className="text-xs text-danger hover:underline font-semibold flex items-center gap-1"
                                                >
                                                    <HiOutlineTrash className="w-3.5 h-3.5" /> Remove
                                                </button>
                                            </div>
                                        </div>

                                        {/* Preview media or document card */}
                                        <div className="bg-card border border-border rounded-lg p-3 flex flex-col items-center justify-center min-h-[160px] overflow-hidden">
                                            {preview.isImage && preview.previewUrl ? (
                                                <img
                                                    src={preview.previewUrl}
                                                    alt="Fuel Bill Preview"
                                                    className="max-h-[220px] rounded object-contain"
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 py-6 text-center">
                                                    <div className="p-4 bg-accent/10 rounded-2xl text-accent">
                                                        <HiOutlineDocumentText className="w-10 h-10" />
                                                    </div>
                                                    <p className="text-sm font-bold text-primary">PDF Document Selected</p>
                                                    <p className="text-xs text-muted font-mono">{preview.name}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* File metadata */}
                                        <div className="grid grid-cols-3 gap-2 text-[11px] bg-card p-3 rounded-lg border border-border">
                                            <div>
                                                <span className="text-muted block">File Name</span>
                                                <span className="font-semibold text-primary truncate block">{preview.name}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted block">File Size</span>
                                                <span className="font-semibold text-primary block">{preview.size}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted block">File Type</span>
                                                <span className="font-semibold text-primary block">{preview.isPdf ? "PDF" : "Image"}</span>
                                            </div>
                                        </div>

                                        {/* Scan Trigger Button */}
                                        {viewMode === "upload" && (
                                            <Button
                                                type="button"
                                                onClick={handleStartScan}
                                                disabled={isScanning}
                                                className="w-full justify-center text-sm font-bold py-2.5"
                                            >
                                                {isScanning ? "Scanning Receipt..." : "Scan Bill (Extract Data)"}
                                            </Button>
                                        )}

                                        {/* Scanning Simulation Progress */}
                                        {isScanning && (
                                            <div className="space-y-2 pt-2 border-t border-border animate-fade-in">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-accent font-semibold flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-accent animate-ping"></span>
                                                        {scanStatusText}
                                                    </span>
                                                    <span className="font-mono text-muted">{scanProgress}%</span>
                                                </div>
                                                <div className="w-full bg-card rounded-full h-2 overflow-hidden border border-border">
                                                    <div
                                                        className="bg-accent h-full rounded-full transition-all duration-300 ease-out"
                                                        style={{ width: `${scanProgress}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                            </div>
                        </div>

                        {/* RIGHT COLUMN: Extracted Bill Review & Edit Form */}
                        <div className="lg:col-span-7 space-y-6">
                            
                            {viewMode === "upload" && !selectedFile && (
                                <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm min-h-[380px]">
                                    <div className="p-4 bg-sidebar rounded-full text-muted border border-border mb-4">
                                        <HiOutlinePhotograph className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-base font-bold text-primary mb-1">No Fuel Bill Uploaded Yet</h3>
                                    <p className="text-xs text-secondary max-w-md">
                                        Select a vehicle, then upload a fuel receipt image or PDF on the left panel to trigger OCR scanning and auto-extract fuel metrics.
                                    </p>
                                </div>
                            )}

                            {(viewMode === "review" || (viewMode === "upload" && selectedFile)) && (
                                <form onSubmit={handleConfirmEntry} className="space-y-6">
                                    
                                    {/* OCR Extracted & Editable Fields Card */}
                                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
                                        <div className="flex items-center justify-between border-b border-border pb-3">
                                            <div>
                                                <h2 className="text-xs font-bold text-secondary uppercase tracking-wider">Step 2: Review & Edit Extracted Fuel Details</h2>
                                                <p className="text-[11px] text-muted">Verify the extracted invoice metrics before confirming</p>
                                            </div>
                                            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 font-bold px-2.5 py-1 rounded-md border border-emerald-500/20">
                                                Data Extracted
                                            </span>
                                        </div>

                                        {/* Warning banners */}
                                        {hasRegMismatch && (
                                            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 font-medium">
                                                <HiOutlineExclamationCircle className="w-5 h-5 flex-shrink-0" />
                                                <div>
                                                    <span className="font-bold">Vehicle Registration Mismatch:</span> Receipt mentions vehicle <span className="font-mono bg-rose-500/20 px-1 py-0.5 rounded font-bold">{ocrData.receiptVehicleNumber}</span>, but target vehicle is <span className="font-mono bg-rose-500/20 px-1 py-0.5 rounded font-bold">{selectedVehObj?.registration_no}</span>. Please verify.
                                                </div>
                                            </div>
                                        )}

                                        {hasMathAnomaly && (
                                            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2 font-medium">
                                                <HiOutlineExclamationCircle className="w-5 h-5 flex-shrink-0" />
                                                <div>
                                                    <span className="font-bold">Mathematical Anomaly:</span> Calculated amount (Volume {volumeVal} L * Rate ₹{priceVal}/L = ₹{(volumeVal * priceVal).toFixed(2)}) does not match the entered amount (₹{amountVal}). Please verify.
                                                </div>
                                            </div>
                                        )}

                                        {/* Editable Inputs Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            
                                            <Select
                                                label="Target Vehicle *"
                                                value={ocrData.vehicleId}
                                                onChange={(e) => handleOcrChange("vehicleId", e.target.value)}
                                                options={[
                                                    { label: "Select Vehicle...", value: "" },
                                                    ...vehicles.map(v => ({
                                                        label: `${v.registration_no} - ${v.vehicle_name}`,
                                                        value: v.id
                                                    }))
                                                ]}
                                                required
                                            />

                                            <Select
                                                label={
                                                    <span className="flex items-center gap-1">
                                                        Fuel Type
                                                        {renderConfidenceBadge("fuelType")}
                                                    </span>
                                                }
                                                value={ocrData.fuelType}
                                                onChange={(e) => handleOcrChange("fuelType", e.target.value)}
                                                options={[
                                                    { label: "Diesel", value: "Diesel" },
                                                    { label: "Petrol", value: "Petrol" },
                                                    { label: "CNG", value: "CNG" },
                                                    { label: "Electric", value: "Electric" }
                                                ]}
                                                required
                                            />

                                            <Input
                                                label={
                                                    <span className="flex items-center gap-1">
                                                        Bill Date *
                                                        {renderConfidenceBadge("billDate")}
                                                    </span>
                                                }
                                                type="date"
                                                value={ocrData.billDate}
                                                onChange={(e) => handleOcrChange("billDate", e.target.value)}
                                                required
                                            />

                                            <Input
                                                label={
                                                    <span className="flex items-center gap-1">
                                                        Volume (Liters) *
                                                        {renderConfidenceBadge("volume")}
                                                    </span>
                                                }
                                                type="number"
                                                step="0.001"
                                                placeholder="e.g. 45.6"
                                                value={ocrData.volume}
                                                onChange={(e) => handleOcrChange("volume", e.target.value)}
                                                required
                                            />

                                            <Input
                                                label={
                                                    <span className="flex items-center gap-1">
                                                        Amount Spent (INR) *
                                                        {renderConfidenceBadge("amount")}
                                                    </span>
                                                }
                                                type="number"
                                                step="0.01"
                                                placeholder="e.g. 4560"
                                                value={ocrData.amount}
                                                onChange={(e) => handleOcrChange("amount", e.target.value)}
                                                required
                                            />

                                            <Input
                                                label={
                                                    <span className="flex items-center gap-1">
                                                        Price per Litre (INR/L)
                                                        {renderConfidenceBadge("pricePerLitre")}
                                                    </span>
                                                }
                                                type="number"
                                                step="0.01"
                                                placeholder="Calculated automatically"
                                                value={ocrData.pricePerLitre}
                                                onChange={(e) => handleOcrChange("pricePerLitre", e.target.value)}
                                                required
                                            />

                                            <Input
                                                label={
                                                    <span className="flex items-center gap-1">
                                                        Bill / Invoice Number
                                                        {renderConfidenceBadge("billNumber")}
                                                    </span>
                                                }
                                                type="text"
                                                placeholder="e.g. FB-10234"
                                                value={ocrData.billNumber}
                                                onChange={(e) => handleOcrChange("billNumber", e.target.value)}
                                                required
                                            />

                                            <Input
                                                label={
                                                    <span className="flex items-center gap-1">
                                                        Receipt Vehicle Number
                                                        {renderConfidenceBadge("vehicleNumber")}
                                                    </span>
                                                }
                                                type="text"
                                                placeholder="e.g. GJ03ES5116"
                                                value={ocrData.receiptVehicleNumber || ""}
                                                onChange={(e) => handleOcrChange("receiptVehicleNumber", e.target.value)}
                                            />

                                            <Select
                                                label={
                                                    <span className="flex items-center gap-1">
                                                        Payment Mode
                                                        {renderConfidenceBadge("paymentMode")}
                                                    </span>
                                                }
                                                value={ocrData.paymentMode || ""}
                                                onChange={(e) => handleOcrChange("paymentMode", e.target.value)}
                                                options={[
                                                    { label: "Select Mode...", value: "" },
                                                    { label: "Cash", value: "Cash" },
                                                    { label: "Card", value: "Card" },
                                                    { label: "UPI", value: "UPI" },
                                                    { label: "FuelCard", value: "FuelCard" },
                                                    { label: "NetBanking", value: "NetBanking" }
                                                ]}
                                            />
                                        </div>

                                        {/* Automatic Calculation Banner */}
                                        <div className="bg-sidebar p-3.5 rounded-xl border border-border flex items-center justify-between text-xs">
                                            <span className="text-secondary font-medium">Calculated Unit Rate (Amount / Volume):</span>
                                            <span className="text-accent font-bold text-sm">
                                                ₹{ocrData.pricePerLitre} / L
                                            </span>
                                        </div>

                                    </div>

                                    {/* Association Card: Driver & Trip */}
                                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
                                        <h2 className="text-xs font-bold text-secondary uppercase tracking-wider border-b border-border pb-3">
                                            Driver & Trip Linkage (Optional)
                                        </h2>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Driver Selector */}
                                            <Select
                                                label="Associate Driver"
                                                value={ocrData.driverId}
                                                onChange={(e) => handleOcrChange("driverId", e.target.value)}
                                                options={[
                                                    { label: "Select Driver...", value: "" },
                                                    ...drivers.map(d => ({
                                                        label: `${d.name} (${d.license_category || 'Commercial'})`,
                                                        value: d.id
                                                    }))
                                                ]}
                                            />

                                            {/* Trip Selector */}
                                            <Select
                                                label="Associate Trip / Dispatch"
                                                value={ocrData.tripId}
                                                onChange={(e) => handleOcrChange("tripId", e.target.value)}
                                                options={[
                                                    { label: "None (General Fill-up)", value: "" },
                                                    ...trips.map(t => ({
                                                        label: `TR-${String(t.id).substring(0, 5).toUpperCase()} (${t.source} → ${t.destination})`,
                                                        value: t.id
                                                    }))
                                                ]}
                                            />
                                        </div>
                                    </div>

                                    {/* Summary Review before Confirmation */}
                                    <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6 space-y-4">
                                        <div className="flex items-center justify-between border-b border-accent/15 pb-3">
                                            <h3 className="text-xs font-bold text-accent uppercase tracking-wider">Step 3: Confirm & Save to Database</h3>
                                            <span className="text-xs text-secondary font-medium">Ready for Submission</span>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                            <div>
                                                <span className="text-muted block">Bill File</span>
                                                <span className="font-semibold text-primary truncate block">{preview?.name || "fuel_bill.jpg"}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted block">Bill Number</span>
                                                <span className="font-semibold text-primary block">{ocrData.billNumber}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted block">Bill Date</span>
                                                <span className="font-semibold text-primary block">{ocrData.billDate}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted block">Fuel Type / Vol</span>
                                                <span className="font-semibold text-primary block">{ocrData.fuelType} ({ocrData.volume} L)</span>
                                            </div>
                                            <div>
                                                <span className="text-muted block">Total Amount</span>
                                                <span className="font-extrabold text-accent block">₹{ocrData.amount}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted block">Price per Litre</span>
                                                <span className="font-semibold text-primary block">₹{ocrData.pricePerLitre}/L</span>
                                            </div>
                                            <div>
                                                <span className="text-muted block">Vehicle</span>
                                                <span className="font-semibold text-primary block">{selectedVehObj?.registration_no || "—"}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted block">Trip Link</span>
                                                <span className="font-semibold text-primary block">{selectedTrpObj ? `TR-${String(selectedTrpObj.id).substring(0, 5).toUpperCase()}` : "General Fill-up"}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <Button type="submit" className="flex-1 justify-center py-2.5 font-bold">
                                                Confirm & Save Fuel Bill
                                            </Button>
                                            <Button type="button" variant="secondary" onClick={handleResetScanner}>
                                                Reset / Cancel
                                            </Button>
                                        </div>
                                    </div>

                                </form>
                            )}

                            {viewMode === "confirmed" && (
                                <div className="bg-card border border-emerald-500/30 rounded-2xl p-8 text-center space-y-4 shadow-sm animate-fade-in">
                                    <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                                        <HiOutlineCheckCircle className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-primary">Fuel Entry Saved to Database!</h3>
                                        <p className="text-xs text-secondary mt-1 max-w-md mx-auto">
                                            The fuel bill record has been stored in PostgreSQL database and updated the target vehicle's current tank level.
                                        </p>
                                    </div>
                                    <div className="flex justify-center gap-3 pt-2">
                                        <Button onClick={handleResetScanner}>
                                            Upload Another Bill
                                        </Button>
                                        <Button variant="secondary" onClick={() => setActiveTab("history")}>
                                            View Fuel Log History
                                        </Button>
                                    </div>
                                </div>
                            )}

                        </div>

                    </div>
                </div>
            )}

            {/* TAB 2: FUEL HISTORY TABLE */}
            {activeTab === "history" && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm space-y-4 p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
                        <div>
                            <h2 className="text-sm font-bold text-secondary uppercase tracking-widest">Fuel Log History</h2>
                            <p className="text-xs text-muted">All confirmed fuel bills and refuel entries stored in database</p>
                        </div>

                        {/* Search & Filter Controls */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative min-w-[200px]">
                                <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search bill, vehicle, driver..."
                                    value={historySearch}
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                    className="form-input text-xs border rounded-xl pl-9 pr-3 py-2 outline-none w-full"
                                />
                            </div>

                            <Select
                                value={historyVehicleFilter}
                                onChange={(e) => setHistoryVehicleFilter(e.target.value)}
                                options={[
                                    { label: "All Vehicles", value: "All" },
                                    ...vehicles.map(v => ({ label: v.registration_no, value: String(v.id) }))
                                ]}
                                className="text-xs w-[160px]"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-border bg-sidebar text-muted text-[11px] font-bold uppercase tracking-wider">
                                    <th className="px-6 py-4">Bill Date</th>
                                    <th className="px-6 py-4">Bill Number</th>
                                    <th className="px-6 py-4">Vehicle</th>
                                    <th className="px-6 py-4">Driver</th>
                                    <th className="px-6 py-4">Trip</th>
                                    <th className="px-6 py-4">Fuel Type</th>
                                    <th className="px-6 py-4">Volume (L)</th>
                                    <th className="px-6 py-4">Amount Spent</th>
                                    <th className="px-6 py-4">Price / L</th>
                                    <th className="px-6 py-4">Payment</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredHistoryRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="px-6 py-12 text-center text-muted text-sm">
                                            No fuel bills found matching filters. <br />
                                            <button onClick={() => setActiveTab("scanner")} className="text-accent underline font-semibold mt-2">
                                                Upload Fuel Bill Now
                                            </button>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredHistoryRecords.map((rec) => (
                                        <tr key={rec.id} className="hover:bg-primary/[0.02] transition-colors group text-sm">
                                            <td className="px-6 py-4 text-secondary font-medium">{rec.date}</td>
                                            <td className="px-6 py-4 font-mono font-bold text-primary">{rec.bill_number}</td>
                                            <td className="px-6 py-4 font-semibold text-primary">{rec.vehicle_reg}</td>
                                            <td className="px-6 py-4 text-secondary">{rec.driver_name || "—"}</td>
                                            <td className="px-6 py-4 text-secondary font-mono">
                                                {rec.trip_id ? (
                                                    <div>
                                                        <span className="font-mono font-bold text-accent">TR-{String(rec.trip_id).substring(0, 6).toUpperCase()}</span>
                                                        {rec.trip_source && (
                                                            <span className="text-[10px] text-muted block">{rec.trip_source} → {rec.trip_destination}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] bg-slate-500/10 text-muted px-2 py-0.5 rounded border border-slate-500/20 font-medium">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-secondary">{rec.fuel_type}</td>
                                            <td className="px-6 py-4 font-semibold text-primary">{rec.volume} L</td>
                                            <td className="px-6 py-4 font-bold text-accent">₹{Number(rec.amount).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-secondary">₹{rec.price_per_litre}/L</td>
                                            <td className="px-6 py-4 text-secondary">
                                                {rec.payment_mode ? (
                                                    <span className="text-[10px] bg-sidebar border border-border px-2 py-0.5 rounded font-semibold text-primary">
                                                        {rec.payment_mode}
                                                    </span>
                                                ) : "—"}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => deleteFuelBillRecord(rec.id)}
                                                    className="p-1.5 text-secondary hover:text-danger hover:bg-red-400/10 rounded transition-colors"
                                                    title="Delete Entry"
                                                >
                                                    <HiOutlineTrash className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: FUEL PERFORMANCE ANALYTICS */}
            {activeTab === "analytics" && (
                <div className="space-y-6">
                    {/* Date Filter Header */}
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-sm font-bold text-secondary uppercase tracking-widest flex items-center gap-2">
                                <HiOutlineChartBar className="w-5 h-5 text-accent" /> Fleet Fuel Performance Analytics
                            </h2>
                            <p className="text-xs text-muted mt-0.5">Real-time comparison of estimated vs actual fuel consumption and cost metrics</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Select
                                value={analyticsRange}
                                onChange={(e) => setAnalyticsRange(e.target.value)}
                                options={[
                                    { label: "All Time", value: "all_time" },
                                    { label: "Today", value: "today" },
                                    { label: "This Week", value: "this_week" },
                                    { label: "This Month", value: "this_month" },
                                    { label: "Last Month", value: "last_month" },
                                    { label: "Custom Range", value: "custom" }
                                ]}
                                className="text-xs w-[160px]"
                            />
                            {analyticsRange === "custom" && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={analyticsCustomStart}
                                        onChange={(e) => setAnalyticsCustomStart(e.target.value)}
                                        className="form-input text-xs border rounded-xl px-2 py-1.5 outline-none"
                                    />
                                    <span className="text-muted text-xs">to</span>
                                    <input
                                        type="date"
                                        value={analyticsCustomEnd}
                                        onChange={(e) => setAnalyticsCustomEnd(e.target.value)}
                                        className="form-input text-xs border rounded-xl px-2 py-1.5 outline-none"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {loadingAnalytics ? (
                        <div className="py-16 text-center text-muted text-xs">Calculating fleet fuel analytics...</div>
                    ) : !analyticsData ? (
                        <div className="py-16 text-center text-muted text-xs">No analytics data found for selected period.</div>
                    ) : (
                        <>
                            {/* Fleet Analytics Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                                    <span className="text-muted text-[10px] font-bold uppercase tracking-wider block mb-1">Total Fuel Consumed</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xl font-extrabold text-sky-400">{analyticsData.summary.total_actual_fuel_liters} L</span>
                                        <span className="text-xs text-muted">est: {analyticsData.summary.total_estimated_fuel_liters} L</span>
                                    </div>
                                    <div className="mt-2 text-[11px] font-semibold flex items-center gap-1.5">
                                        <span className={`px-2 py-0.5 rounded border ${analyticsData.summary.fuel_variance_liters > 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                            {analyticsData.summary.fuel_variance_liters > 0 ? '+' : ''}{analyticsData.summary.fuel_variance_liters} L ({analyticsData.summary.fuel_variance_percentage}%)
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                                    <span className="text-muted text-[10px] font-bold uppercase tracking-wider block mb-1">Total Fuel Expense</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xl font-extrabold text-accent">₹{Number(analyticsData.summary.total_actual_cost).toLocaleString()}</span>
                                        <span className="text-xs text-muted">est: ₹{Number(analyticsData.summary.total_estimated_cost).toLocaleString()}</span>
                                    </div>
                                    <div className="mt-2 text-[11px] font-semibold flex items-center gap-1.5">
                                        <span className={`px-2 py-0.5 rounded border ${analyticsData.summary.cost_variance_amount > 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                            {analyticsData.summary.cost_variance_amount > 0 ? '+' : ''}₹{Number(analyticsData.summary.cost_variance_amount).toLocaleString()} ({analyticsData.summary.cost_variance_percentage}%)
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                                    <span className="text-muted text-[10px] font-bold uppercase tracking-wider block mb-1">Fleet Actual Efficiency</span>
                                    <span className="text-xl font-extrabold text-emerald-400">{analyticsData.summary.fleet_actual_kmpl} KM/L</span>
                                    <span className="text-muted text-[11px] block mt-1">Est target: {analyticsData.summary.fleet_estimated_kmpl} KM/L</span>
                                </div>

                                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                                    <span className="text-muted text-[10px] font-bold uppercase tracking-wider block mb-1">Avg Fuel Cost per KM</span>
                                    <span className="text-xl font-extrabold text-primary">₹{analyticsData.summary.avg_cost_per_km} / KM</span>
                                    <span className="text-muted text-[11px] block mt-1">Across {analyticsData.summary.total_distance_km} KM total</span>
                                </div>
                            </div>

                            {/* Vehicle-Wise Performance Table */}
                            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm p-6 space-y-4">
                                <div>
                                    <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">Vehicle-Wise Fuel Performance</h3>
                                    <p className="text-xs text-muted mt-0.5">Breakdown of estimated vs actual fuel metrics per vehicle</p>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse whitespace-nowrap">
                                        <thead>
                                            <tr className="border-b border-border bg-sidebar text-muted text-[11px] font-bold uppercase tracking-wider">
                                                <th className="px-5 py-3">Vehicle</th>
                                                <th className="px-5 py-3">Fuel Type</th>
                                                <th className="px-5 py-3">Rated (KM/L)</th>
                                                <th className="px-5 py-3">Est. Fuel</th>
                                                <th className="px-5 py-3">Actual Fuel</th>
                                                <th className="px-5 py-3">Fuel Variance</th>
                                                <th className="px-5 py-3">Est. Cost</th>
                                                <th className="px-5 py-3">Actual Cost</th>
                                                <th className="px-5 py-3">Actual KM/L</th>
                                                <th className="px-5 py-3">Cost / KM</th>
                                                <th className="px-5 py-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border text-xs">
                                            {analyticsData.vehicles.map(v => {
                                                const varStatus = getFuelVarianceStatus(v.estimated_fuel, v.actual_fuel);
                                                return (
                                                    <tr key={v.vehicle_id} className="hover:bg-primary/[0.02] transition-colors">
                                                        <td className="px-5 py-3.5">
                                                            <strong className="text-primary block font-semibold">{v.registration_no}</strong>
                                                            <span className="text-[10px] text-muted">{v.vehicle_name}</span>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-secondary">{v.fuel_type}</td>
                                                        <td className="px-5 py-3.5 text-secondary font-mono">{v.rated_efficiency_kmpl} KM/L</td>
                                                        <td className="px-5 py-3.5 text-amber-400 font-bold">{v.estimated_fuel} L</td>
                                                        <td className="px-5 py-3.5 text-sky-400 font-bold">{v.actual_fuel > 0 ? `${v.actual_fuel} L` : "—"}</td>
                                                        <td className="px-5 py-3.5">
                                                            {v.actual_fuel > 0 ? (
                                                                <span className={`font-bold ${v.fuel_variance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                                    {v.fuel_variance > 0 ? '+' : ''}{v.fuel_variance} L
                                                                </span>
                                                            ) : "—"}
                                                        </td>
                                                        <td className="px-5 py-3.5 text-secondary">₹{Number(v.estimated_cost).toLocaleString()}</td>
                                                        <td className="px-5 py-3.5 font-bold text-accent">₹{Number(v.actual_cost).toLocaleString()}</td>
                                                        <td className="px-5 py-3.5 font-bold text-emerald-400">{v.actual_kmpl > 0 ? `${v.actual_kmpl} KM/L` : "—"}</td>
                                                        <td className="px-5 py-3.5 text-secondary">₹{v.cost_per_km}/KM</td>
                                                        <td className="px-5 py-3.5">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${varStatus.badgeClass}`}>
                                                                {varStatus.label}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {analyticsData.vehicles.length === 0 && (
                                                <tr><td colSpan={11} className="py-8 text-center text-muted">No vehicles found.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

        </div>
    );
};

export default Fuel;