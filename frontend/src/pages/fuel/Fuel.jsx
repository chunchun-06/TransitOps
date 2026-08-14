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
    HiOutlinePencilAlt
} from "react-icons/hi";
import { useFleet } from "../../context/FleetContext";
import { 
    validateFuelBillFile, 
    createBillPreview, 
    simulateOCRScanning, 
    buildFuelRecordPayload 
} from "../../utils/fuelService";
import { Button, Input, Select } from "../../components/common";

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

    // Extracted / Editable OCR Form State
    const [ocrData, setOcrData] = useState({
        fuelType: "Diesel",
        volume: "45.6",
        amount: "4560",
        pricePerLitre: "100.00",
        billDate: new Date().toISOString().split("T")[0],
        billNumber: "FB-10234",
        vehicleId: "",
        driverId: "",
        tripId: ""
    });

    const [isManualPriceEdit, setIsManualPriceEdit] = useState(false);
    const [activeTab, setActiveTab] = useState("scanner"); // 'scanner' | 'history'

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

    // Execute Simulated Scan
    const handleStartScan = async () => {
        if (!selectedFile) return;
        setIsScanning(true);
        setUploadError("");

        try {
            const extracted = await simulateOCRScanning(selectedFile, (statusText, progress) => {
                setScanStatusText(statusText);
                setScanProgress(progress);
            });

            setOcrData(prev => ({
                ...prev,
                fuelType: extracted.fuelType,
                volume: String(extracted.volume),
                amount: String(extracted.amount),
                pricePerLitre: String(extracted.pricePerLitre),
                billDate: extracted.billDate,
                billNumber: extracted.billNumber
            }));
            setIsManualPriceEdit(false);
            setViewMode("review");
        } catch (err) {
            setUploadError("Simulated scanning failed. Please try again.");
        } finally {
            setIsScanning(false);
        }
    };

    // Form inputs handling
    const handleOcrChange = (field, value) => {
        if (field === "pricePerLitre") {
            setIsManualPriceEdit(true);
        }
        setOcrData(prev => ({ ...prev, [field]: value }));
    };

    // Confirm Fuel Entry (Updates Frontend State)
    const handleConfirmEntry = (e) => {
        e.preventDefault();

        const selectedVeh = vehicles.find(v => v.id === ocrData.vehicleId);
        const selectedDrv = drivers.find(d => d.id === ocrData.driverId);
        const selectedTrp = trips.find(t => t.id === ocrData.tripId);

        const newRecord = buildFuelRecordPayload({
            billNumber: ocrData.billNumber,
            billDate: ocrData.billDate,
            vehicleId: ocrData.vehicleId,
            vehicleReg: selectedVeh ? `${selectedVeh.registration_no} (${selectedVeh.vehicle_name})` : "TN-38-AB-1234",
            driverId: ocrData.driverId,
            driverName: selectedDrv ? selectedDrv.name : "Alex",
            tripId: ocrData.tripId,
            tripCode: selectedTrp ? `TR-${String(selectedTrp.id).substring(0, 5).toUpperCase()}` : (ocrData.tripId ? "TR-102" : "—"),
            fuelType: ocrData.fuelType,
            volume: ocrData.volume,
            amount: ocrData.amount,
            pricePerLitre: ocrData.pricePerLitre,
            fileName: preview?.name || "fuel_bill.jpg"
        });

        addFuelBillRecord(newRecord);
        setViewMode("confirmed");
    };

    const handleResetScanner = () => {
        handleRemoveFile();
        setOcrData({
            fuelType: "Diesel",
            volume: "45.6",
            amount: "4560",
            pricePerLitre: "100.00",
            billDate: new Date().toISOString().split("T")[0],
            billNumber: `FB-${Math.floor(10000 + Math.random() * 90000)}`,
            vehicleId: "",
            driverId: "",
            tripId: ""
        });
        setViewMode("upload");
    };

    // Dashboard Cards Dynamic Calculations
    const totalVolume = fuelRecords.reduce((acc, r) => acc + (parseFloat(r.volume) || 0), 0);
    const totalExpense = fuelRecords.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);
    const avgPrice = totalVolume > 0 ? (totalExpense / totalVolume).toFixed(2) : "100.00";

    // Selected items for display
    const selectedVehObj = vehicles.find(v => v.id === ocrData.vehicleId);
    const selectedTrpObj = trips.find(t => t.id === ocrData.tripId);

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
                </div>
            </div>

            {/* Top Stat Cards (Derived dynamically from frontend state) */}
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
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* LEFT COLUMN: Upload & Preview Panel (Responsive 5 cols) */}
                    <div className="lg:col-span-5 space-y-6">
                        
                        {/* Upload Card */}
                        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xs font-bold text-secondary uppercase tracking-wider">Upload Fuel Bill</h2>
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
                                    Drag & Drop Fuel Bill here
                                </p>
                                <p className="text-xs text-muted mt-1">
                                    or <span className="text-accent underline font-semibold">Choose File</span> from your computer
                                </p>
                                <div className="flex items-center gap-2 mt-4 text-[10px] text-muted font-medium bg-sidebar px-3 py-1.5 rounded-lg border border-border">
                                    <span>Supported Formats: JPG, JPEG, PNG, PDF</span>
                                </div>
                            </div>

                            {uploadError && (
                                <div className="mt-4 p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-xs flex items-center gap-2">
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
                                            {isScanning ? "Scanning..." : "Scan Bill (Simulate OCR)"}
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

                    {/* RIGHT COLUMN: Extracted Bill Review & Edit Form (Responsive 7 cols) */}
                    <div className="lg:col-span-7 space-y-6">
                        
                        {viewMode === "upload" && !selectedFile && (
                            <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm min-h-[380px]">
                                <div className="p-4 bg-sidebar rounded-full text-muted border border-border mb-4">
                                    <HiOutlinePhotograph className="w-10 h-10" />
                                </div>
                                <h3 className="text-base font-bold text-primary mb-1">No Fuel Bill Uploaded</h3>
                                <p className="text-xs text-secondary max-w-md">
                                    Upload a fuel receipt image or PDF on the left panel to trigger simulated OCR scanning and auto-extract fuel metrics.
                                </p>
                            </div>
                        )}

                        {(viewMode === "review" || viewMode === "upload" && selectedFile) && (
                            <form onSubmit={handleConfirmEntry} className="space-y-6">
                                
                                {/* OCR Extracted & Editable Fields Card */}
                                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
                                    <div className="flex items-center justify-between border-b border-border pb-3">
                                        <div>
                                            <h2 className="text-xs font-bold text-secondary uppercase tracking-wider">Extracted Fuel Details</h2>
                                            <p className="text-[11px] text-muted">Review & edit simulated OCR extracted fields before confirming</p>
                                        </div>
                                        <span className="text-[10px] bg-emerald-500/10 text-emerald-500 font-bold px-2.5 py-1 rounded-md border border-emerald-500/20">
                                            OCR Scan Complete
                                        </span>
                                    </div>

                                    {/* Editable Inputs Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        
                                        <Select
                                            label="Fuel Type"
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
                                            label="Bill Date"
                                            type="date"
                                            value={ocrData.billDate}
                                            onChange={(e) => handleOcrChange("billDate", e.target.value)}
                                            required
                                        />

                                        <Input
                                            label="Volume (Liters)"
                                            type="number"
                                            step="0.1"
                                            placeholder="e.g. 45.6"
                                            value={ocrData.volume}
                                            onChange={(e) => handleOcrChange("volume", e.target.value)}
                                            required
                                        />

                                        <Input
                                            label="Amount Spent (INR)"
                                            type="number"
                                            placeholder="e.g. 4560"
                                            value={ocrData.amount}
                                            onChange={(e) => handleOcrChange("amount", e.target.value)}
                                            required
                                        />

                                        <Input
                                            label="Price per Litre (INR/L)"
                                            type="number"
                                            step="0.01"
                                            placeholder="Calculated automatically"
                                            value={ocrData.pricePerLitre}
                                            onChange={(e) => handleOcrChange("pricePerLitre", e.target.value)}
                                            required
                                        />

                                        <Input
                                            label="Bill / Invoice Number"
                                            type="text"
                                            placeholder="e.g. FB-10234"
                                            value={ocrData.billNumber}
                                            onChange={(e) => handleOcrChange("billNumber", e.target.value)}
                                            required
                                        />
                                    </div>

                                    {/* Automatic Calculation Banner */}
                                    <div className="bg-sidebar p-3.5 rounded-xl border border-border flex items-center justify-between text-xs">
                                        <span className="text-secondary font-medium">Calculated Fuel Price Formula (Amount / Volume):</span>
                                        <span className="text-accent font-bold text-sm">
                                            ₹{ocrData.pricePerLitre} / L
                                        </span>
                                    </div>

                                </div>

                                {/* Association Card: Vehicle, Driver, Trip */}
                                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
                                    <h2 className="text-xs font-bold text-secondary uppercase tracking-wider border-b border-border pb-3">
                                        Entity Associations
                                    </h2>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Vehicle Selector */}
                                        <Select
                                            label="Associate Vehicle"
                                            value={ocrData.vehicleId}
                                            onChange={(e) => handleOcrChange("vehicleId", e.target.value)}
                                            options={[
                                                { label: "Select Vehicle...", value: "" },
                                                ...vehicles.map(v => ({
                                                    label: `${v.registration_no} - ${v.vehicle_name}`,
                                                    value: v.id
                                                }))
                                            ]}
                                        />

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
                                            label="Associate Trip / Dispatch (Optional)"
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

                                    {/* Vehicle Info Card Preview */}
                                    {selectedVehObj && (
                                        <div className="bg-sidebar p-3.5 rounded-xl border border-border grid grid-cols-4 gap-2 text-xs">
                                            <div>
                                                <span className="text-muted block text-[10px]">Registration</span>
                                                <span className="font-bold text-primary">{selectedVehObj.registration_no}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted block text-[10px]">Vehicle Type</span>
                                                <span className="font-bold text-primary">{selectedVehObj.vehicle_type || "Truck"}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted block text-[10px]">Fuel Type</span>
                                                <span className="font-bold text-primary">{selectedVehObj.fuel_type || "Diesel"}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted block text-[10px]">Status</span>
                                                <span className="font-bold text-accent">{selectedVehObj.status}</span>
                                            </div>
                                        </div>
                                    )}

                                </div>

                                {/* Summary Review before Confirmation */}
                                <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6 space-y-4">
                                    <div className="flex items-center justify-between border-b border-accent/15 pb-3">
                                        <h3 className="text-xs font-bold text-accent uppercase tracking-wider">Fuel Bill Summary</h3>
                                        <span className="text-xs text-secondary font-medium">Ready for Confirmation</span>
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
                                            <span className="font-semibold text-primary block">{selectedVehObj?.registration_no || "TN-38-AB-1234"}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted block">Trip</span>
                                            <span className="font-semibold text-primary block">{selectedTrpObj ? `TR-${String(selectedTrpObj.id).substring(0, 5).toUpperCase()}` : "TR-102"}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <Button type="submit" className="flex-1 justify-center py-2.5 font-bold">
                                            Confirm Fuel Entry
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
                                    <h3 className="text-lg font-bold text-primary">Fuel Entry Confirmed Successfully!</h3>
                                    <p className="text-xs text-secondary mt-1 max-w-md mx-auto">
                                        The scanned bill record has been added to the frontend fuel logs and dashboard statistics.
                                    </p>
                                </div>
                                <div className="flex justify-center gap-3 pt-2">
                                    <Button onClick={handleResetScanner}>
                                        Upload Another Bill
                                    </Button>
                                    <Button variant="secondary" onClick={() => setActiveTab("history")}>
                                        View Fuel Log Table
                                    </Button>
                                </div>
                            </div>
                        )}

                    </div>

                </div>
            )}

            {/* TAB 2: FUEL HISTORY TABLE */}
            {activeTab === "history" && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm space-y-4 p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                        <div>
                            <h2 className="text-sm font-bold text-secondary uppercase tracking-widest">Fuel History Records</h2>
                            <p className="text-xs text-muted">All confirmed fuel bills and logged refuel entries</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-border bg-sidebar text-muted text-[11px] font-bold uppercase tracking-wider">
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Bill Number</th>
                                    <th className="px-6 py-4">Vehicle</th>
                                    <th className="px-6 py-4">Driver</th>
                                    <th className="px-6 py-4">Trip</th>
                                    <th className="px-6 py-4">Fuel Type</th>
                                    <th className="px-6 py-4">Volume (L)</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Price / L</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {fuelRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-6 py-12 text-center text-muted text-sm">
                                            No fuel bills recorded yet. <br />
                                            <button onClick={() => setActiveTab("scanner")} className="text-accent underline font-semibold mt-2">
                                                Upload Fuel Bill Now
                                            </button>
                                        </td>
                                    </tr>
                                ) : (
                                    fuelRecords.map((rec) => (
                                        <tr key={rec.id} className="hover:bg-primary/[0.02] transition-colors group text-sm">
                                            <td className="px-6 py-4 text-secondary font-medium">{rec.date}</td>
                                            <td className="px-6 py-4 font-mono font-bold text-primary">{rec.bill_number}</td>
                                            <td className="px-6 py-4 font-semibold text-primary">{rec.vehicle_reg}</td>
                                            <td className="px-6 py-4 text-secondary">{rec.driver_name}</td>
                                            <td className="px-6 py-4 text-secondary font-mono">{rec.trip_code}</td>
                                            <td className="px-6 py-4 text-secondary">{rec.fuel_type}</td>
                                            <td className="px-6 py-4 font-semibold text-primary">{rec.volume} L</td>
                                            <td className="px-6 py-4 font-bold text-accent">₹{Number(rec.amount).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-secondary">₹{rec.price_per_litre}/L</td>
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

        </div>
    );
};

export default Fuel;