import { useEffect, useState } from "react";
import { 
    HiOutlineArrowRight as ArrowRight, 
    HiX as CloseIcon, 
    HiOutlineMap as MapIcon,
    HiOutlineTruck as TruckIcon, 
    HiOutlineUser as UserIcon, 
    HiOutlineBeaker as BeakerIcon, 
    HiOutlineCurrencyRupee as RupeeIcon,
    HiOutlineClipboardList as ClipboardIcon,
    HiOutlineChevronRight as ChevronRight,
    HiOutlineExclamationCircle
} from "react-icons/hi";
import { getTrips, createTrip, updateTrip } from "../../api/trip.api";
import { getVehicles, getAvailableVehicles } from "../../api/vehicle.api";
import { getDrivers, getAvailableDrivers } from "../../api/driver.api";
import { getCurrentFuelPrice } from "../../api/fuel_price.api";
import { Input, Select, Button, Badge, Modal } from "../../components/common";
import TripMap from "../../components/trip/TripMap";

const initialForm = {
    source: "",
    destination: "",
    vehicle_id: "",
    driver_id: "",
    cargo_weight: "",
    planned_distance: "",
    estimated_duration_min: "",
    source_latitude: "",
    source_longitude: "",
    destination_latitude: "",
    destination_longitude: "",
    current_fuel_liters: ""
};

const STEPS = [
    { label: "Draft", color: "#10B981" },
    { label: "Dispatched", color: "#3B82F6" },
    { label: "Completed", color: "#10B981" },
    { label: "Cancelled", color: "#EF4444" }
];

const Trips = () => {
    const [trips, setTrips] = useState([]);
    const [statusFilter, setStatusFilter] = useState("All");
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [availableVehicles, setAvailableVehicles] = useState([]);
    const [availableDrivers, setAvailableDrivers] = useState([]);
    const [fetchingDropdowns, setFetchingDropdowns] = useState(true);
    const [selectedTripId, setSelectedTripId] = useState(null);
    
    // Map Location Selection Mode & Draft Coordinates
    const [selectingMode, setSelectingMode] = useState(null); // 'source' | 'destination' | null
    const [draftSource, setDraftSource] = useState(null);
    const [draftDestination, setDraftDestination] = useState(null);

    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Fuel State
    const [fuelPrice, setFuelPrice] = useState(100.00);
    const [fuelPanelData, setFuelPanelData] = useState({
        efficiency: 0,
        tankCapacity: 0,
        estimatedRequired: 0,
        additionalRequired: 0,
        estimatedCost: 0,
        fuelType: 'Diesel'
    });

    // Complete Trip Modal State
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [tripToComplete, setTripToComplete] = useState(null);
    const [completeForm, setCompleteForm] = useState({
        actual_distance: "",
        final_odometer: "",
        actual_fuel_consumed: "",
        revenue: ""
    });
    const [completeError, setCompleteError] = useState("");
    const [completeLoading, setCompleteLoading] = useState(false);

    const fetchData = async () => {
        try {
            setFetchingDropdowns(true);
            const [tripsRes, allVehRes, availVehRes, allDrvRes, availDrvRes] = await Promise.all([
                getTrips().catch(() => ({ data: [] })),
                getVehicles().catch(() => ({ data: [] })),
                getAvailableVehicles().catch(() => ({ data: [] })),
                getDrivers().catch(() => ({ data: [] })),
                getAvailableDrivers().catch(() => ({ data: [] }))
            ]);
            const fetchedTrips = tripsRes.data || [];
            setTrips(fetchedTrips);
            setVehicles(allVehRes.data || []);
            setAvailableVehicles(availVehRes.data || []);
            setDrivers(allDrvRes.data || []);
            setAvailableDrivers(availDrvRes.data || []);

            if (fetchedTrips.length > 0 && !selectedTripId) {
                setSelectedTripId(fetchedTrips[0].id);
            }
        } catch (err) {
            console.error("Error fetching trip dispatcher data:", err);
        } finally {
            setFetchingDropdowns(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Fetch fuel price whenever vehicle is selected or changed
    useEffect(() => {
        const fetchPrice = async () => {
            if (!form.vehicle_id) return;
            const veh = availableVehicles.find(v => v.id === form.vehicle_id);
            const fuelType = veh?.fuel_type || 'Diesel';
            try {
                const res = await getCurrentFuelPrice(fuelType);
                if (res.data) {
                    setFuelPrice(parseFloat(res.data.price_per_liter) || 100.00);
                }
            } catch (err) {
                console.error("Error fetching fuel price:", err);
                setFuelPrice(100.00);
            }
        };
        fetchPrice();
    }, [form.vehicle_id, availableVehicles]);

    // Recalculate fuel requirements based on inputs
    useEffect(() => {
        if (!form.vehicle_id) {
            setFuelPanelData({
                efficiency: 0,
                tankCapacity: 0,
                estimatedRequired: 0,
                additionalRequired: 0,
                estimatedCost: 0,
                fuelType: 'Diesel'
            });
            return;
        }

        const veh = availableVehicles.find(v => v.id === form.vehicle_id);
        const efficiency = parseFloat(veh?.fuel_efficiency_kmpl) || 0;
        const tankCapacity = parseFloat(veh?.fuel_tank_capacity_liters) || 0;
        const fuelType = veh?.fuel_type || 'Diesel';

        const distance = parseFloat(form.planned_distance) || 0;
        const currentFuel = parseFloat(form.current_fuel_liters) || parseFloat(veh?.current_fuel_level_liters) || 0;

        let estimatedRequired = 0;
        if (efficiency > 0) {
            estimatedRequired = Math.round((distance / efficiency) * 100) / 100;
        }

        const additionalRequired = Math.max(estimatedRequired - currentFuel, 0);
        const estimatedCost = Math.round(additionalRequired * fuelPrice * 100) / 100;

        setFuelPanelData({
            efficiency,
            tankCapacity,
            estimatedRequired,
            additionalRequired,
            estimatedCost,
            fuelType
        });
    }, [form.vehicle_id, form.planned_distance, form.current_fuel_liters, fuelPrice, availableVehicles]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSelectLocation = (mode, locationData) => {
        if (mode === 'source') {
            setForm(prev => ({ 
                ...prev, 
                source: locationData.address,
                source_latitude: locationData.lat,
                source_longitude: locationData.lng
            }));
            setDraftSource(locationData);
        } else if (mode === 'destination') {
            setForm(prev => ({ 
                ...prev, 
                destination: locationData.address,
                destination_latitude: locationData.lat,
                destination_longitude: locationData.lng
            }));
            setDraftDestination(locationData);
        }
        setSelectingMode(null);
    };

    const handleRouteCalculated = (routeData) => {
        if (routeData) {
            setForm(prev => ({ 
                ...prev, 
                planned_distance: routeData.distanceKm.toString(),
                estimated_duration_min: routeData.durationMin.toString(),
                source_latitude: routeData.sourceLat,
                source_longitude: routeData.sourceLng,
                destination_latitude: routeData.destLat,
                destination_longitude: routeData.destLng
            }));
        }
    };

    const selectedVehicleForForm = availableVehicles.find(v => v.id.toString() === form.vehicle_id);
    const capacity = selectedVehicleForForm?.max_load_capacity || 0;
    const weight = Number(form.cargo_weight) || 0;
    const isOverweight = capacity > 0 && weight > capacity;
    const overAmount = weight - capacity;

    const isFormValid = form.source && form.destination && form.vehicle_id && form.driver_id && form.cargo_weight && !isOverweight && parseFloat(form.planned_distance) > 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isOverweight || !isFormValid) return;
        
        try {
            setLoading(true);
            setErrorMsg("");
            
            const payload = {
                ...form,
                vehicle_id: form.vehicle_id,
                driver_id: form.driver_id,
                cargo_weight: Number(form.cargo_weight),
                planned_distance: Number(form.planned_distance),
                estimated_duration_min: form.estimated_duration_min ? Number(form.estimated_duration_min) : null,
                current_fuel_liters: form.current_fuel_liters ? Number(form.current_fuel_liters) : null,
                source_latitude: form.source_latitude ? Number(form.source_latitude) : null,
                source_longitude: form.source_longitude ? Number(form.source_longitude) : null,
                destination_latitude: form.destination_latitude ? Number(form.destination_latitude) : null,
                destination_longitude: form.destination_longitude ? Number(form.destination_longitude) : null
            };

            const createdRes = await createTrip(payload);
            if (createdRes.data && createdRes.data.id) {
                setSelectedTripId(createdRes.data.id);
            }
            setForm(initialForm);
            setDraftSource(null);
            setDraftDestination(null);
            setSelectingMode(null);
            fetchData();
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Failed to dispatch trip");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setForm(initialForm);
        setDraftSource(null);
        setDraftDestination(null);
        setSelectingMode(null);
        setErrorMsg("");
    };

    // Open Complete Modal
    const handleOpenCompleteModal = (trip) => {
        const v = vehicles.find(veh => veh.id === trip.vehicle_id);
        setTripToComplete(trip);
        setCompleteForm({
            actual_distance: trip.planned_distance || "",
            final_odometer: v ? (parseFloat(v.odometer || 0) + parseFloat(trip.planned_distance || 0)).toString() : "",
            actual_fuel_consumed: trip.estimated_fuel_liters || "",
            revenue: trip.revenue || ""
        });
        setCompleteError("");
        setIsCompleteModalOpen(true);
    };

    // Submit Trip Completion
    const handleCompleteTrip = async (e) => {
        e.preventDefault();
        if (!tripToComplete) return;

        const v = vehicles.find(veh => veh.id === tripToComplete.vehicle_id);
        const startOdo = parseFloat(v?.odometer || 0);
        const finalOdo = parseFloat(completeForm.final_odometer);

        if (isNaN(finalOdo) || finalOdo <= startOdo) {
            setCompleteError(`Final odometer must be greater than current vehicle odometer (${startOdo} km)`);
            return;
        }

        try {
            setCompleteLoading(true);
            setCompleteError("");

            await updateTrip(tripToComplete.id, {
                status: "Completed",
                actual_distance: Number(completeForm.actual_distance),
                final_odometer: finalOdo,
                actual_fuel_consumed: Number(completeForm.actual_fuel_consumed),
                revenue: completeForm.revenue ? Number(completeForm.revenue) : null
            });

            setIsCompleteModalOpen(false);
            setTripToComplete(null);
            fetchData();
        } catch (err) {
            setCompleteError(err.response?.data?.message || "Failed to complete trip");
        } finally {
            setCompleteLoading(false);
        }
    };

    const vehicleOptions = [
        { 
            label: fetchingDropdowns 
                ? "Loading available vehicles..." 
                : availableVehicles.length === 0 
                    ? "No available vehicles currently" 
                    : "Select Vehicle (Available Only)...", 
            value: "" 
        },
        ...availableVehicles.map(v => ({
            label: `${v.registration_no} - ${v.vehicle_name} (${v.fuel_type || 'Diesel'})`,
            value: v.id
        }))
    ];

    const driverOptions = [
        { 
            label: fetchingDropdowns 
                ? "Loading available drivers..." 
                : availableDrivers.length === 0 
                    ? "No available drivers currently" 
                    : "Select Driver (Available Only)...", 
            value: "" 
        },
        ...availableDrivers.map(d => ({
            label: `${d.name} (${d.license_category || 'Commercial'})`,
            value: d.id
        }))
    ];

    const activeTrip = trips.find(t => t.id === selectedTripId) || (trips.length > 0 ? trips[0] : null);
    const activeVehicle = activeTrip ? vehicles.find(v => v.id === activeTrip.vehicle_id) : null;
    const activeDriver = activeTrip ? drivers.find(d => d.id === activeTrip.driver_id) : null;

    const selectedDriverName = availableDrivers.find(d => d.id === form.driver_id)?.name;

    return (
        <div className="animate-fade-in-up max-w-[1600px] mx-auto text-primary pb-12">
            
            {/* Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Side: Create Trip Form & Stepper */}
                <div className="lg:col-span-4 space-y-6">
                    
                    {/* Stepper */}
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                        <h2 className="text-[10px] uppercase tracking-widest text-muted font-bold mb-6">Trip Lifecycle</h2>
                        <div className="flex items-center justify-between relative">
                            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-[#2B3038] -translate-y-1/2 z-0"></div>
                            
                            {STEPS.map((step, i) => (
                                <div key={i} className="relative z-10 flex flex-col items-center gap-2">
                                    <div 
                                        className="w-3 h-3 rounded-full outline outline-4 outline-[#1B1F24]"
                                        style={{ backgroundColor: step.color }}
                                    ></div>
                                    <span 
                                        className="text-[10px] font-bold tracking-wider"
                                        style={{ color: step.color }}
                                    >
                                        {step.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Dispatch Form */}
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                        <h2 className="text-[10px] uppercase tracking-widest text-muted font-bold mb-6">Create Trip</h2>
                        
                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            {errorMsg && (
                                <div className="bg-danger/10 border border-red-500/20 text-danger text-sm p-3 rounded-lg">
                                    <span className="font-semibold">Error:</span> {errorMsg}
                                </div>
                            )}

                            {/* Source Field with Select on Map */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-secondary">Source Location</label>
                                    <button 
                                        type="button" 
                                        onClick={() => setSelectingMode(selectingMode === 'source' ? null : 'source')}
                                        className={`text-[11px] px-2.5 py-0.5 rounded-lg border transition-all flex items-center gap-1 font-medium ${selectingMode === 'source' ? 'bg-accent text-card border-accent font-bold' : 'bg-sidebar text-accent border-accent/40 hover:bg-accent/10'}`}
                                    >
                                        <MapIcon className="w-3.5 h-3.5" />
                                        {selectingMode === 'source' ? 'Click Map Now...' : 'Select on Map'}
                                    </button>
                                </div>
                                <Input 
                                    name="source" 
                                    placeholder="e.g. Mumbai Port or click map" 
                                    value={form.source} 
                                    onChange={(e) => {
                                        handleChange(e);
                                        setDraftSource(null);
                                    }} 
                                />
                            </div>
                            
                            {/* Destination Field with Select on Map */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-secondary">Destination Location</label>
                                    <button 
                                        type="button" 
                                        onClick={() => setSelectingMode(selectingMode === 'destination' ? null : 'destination')}
                                        className={`text-[11px] px-2.5 py-0.5 rounded-lg border transition-all flex items-center gap-1 font-medium ${selectingMode === 'destination' ? 'bg-accent text-card border-accent font-bold' : 'bg-sidebar text-accent border-accent/40 hover:bg-accent/10'}`}
                                    >
                                        <MapIcon className="w-3.5 h-3.5" />
                                        {selectingMode === 'destination' ? 'Click Map Now...' : 'Select on Map'}
                                    </button>
                                </div>
                                <Input 
                                    name="destination" 
                                    placeholder="e.g. Pune Logistics Park or click map" 
                                    value={form.destination} 
                                    onChange={(e) => {
                                        handleChange(e);
                                        setDraftDestination(null);
                                    }} 
                                />
                            </div>
                            
                            <Select 
                                label="Vehicle (Available Only)" 
                                name="vehicle_id" 
                                value={form.vehicle_id} 
                                onChange={handleChange}
                                options={vehicleOptions}
                            />
                            
                            <Select 
                                label="Driver (Available Only)" 
                                name="driver_id" 
                                value={form.driver_id} 
                                onChange={handleChange}
                                options={driverOptions}
                            />
                            
                            <Input 
                                label="Cargo Weight (kg)" 
                                name="cargo_weight" 
                                type="number" 
                                placeholder="e.g. 700" 
                                value={form.cargo_weight} 
                                onChange={handleChange} 
                            />
                            
                            <Input 
                                label="Planned Distance (km)" 
                                name="planned_distance" 
                                type="number" 
                                placeholder="e.g. 150" 
                                value={form.planned_distance} 
                                onChange={handleChange} 
                            />

                            {/* Fuel Panel - STEP 5 */}
                            {selectedVehicleForForm && (
                                <div className="bg-sidebar p-4 rounded-xl border border-border space-y-3.5">
                                    <div className="flex items-center gap-2 border-b border-border pb-2">
                                        <BeakerIcon className="w-4 h-4 text-accent" />
                                        <h4 className="text-xs font-bold text-primary tracking-wide">FUEL PLANNING PANEL</h4>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <p className="text-muted">Fuel Type</p>
                                            <p className="font-semibold text-secondary">{fuelPanelData.fuelType}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted">Efficiency</p>
                                            <p className="font-semibold text-secondary">{fuelPanelData.efficiency} km/L</p>
                                        </div>
                                        <div>
                                            <p className="text-muted">Tank Capacity</p>
                                            <p className="font-semibold text-secondary">{fuelPanelData.tankCapacity} Litres</p>
                                        </div>
                                        <div>
                                            <p className="text-muted">Fuel Price</p>
                                            <p className="font-semibold text-secondary">₹{fuelPrice}/L</p>
                                        </div>
                                    </div>

                                    <Input 
                                        label="Current Fuel Level (litres)" 
                                        name="current_fuel_liters" 
                                        type="number" 
                                        placeholder={`Current: ${selectedVehicleForForm.current_fuel_level_liters || 0} L`}
                                        value={form.current_fuel_liters} 
                                        onChange={handleChange} 
                                        className="py-1 px-2 text-xs"
                                    />

                                    <div className="pt-2 border-t border-border space-y-1.5 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-muted">Est. Fuel Required:</span>
                                            <span className="font-semibold text-secondary">{fuelPanelData.estimatedRequired} L</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted">Additional Fuel to Buy:</span>
                                            <span className="font-semibold text-secondary">{fuelPanelData.additionalRequired} L</span>
                                        </div>
                                        <div className="flex justify-between text-accent font-bold pt-1 border-t border-border/50">
                                            <span>Est. Additional Cost:</span>
                                            <span>₹{fuelPanelData.estimatedCost.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Validation Block */}
                            {isOverweight && (
                                <div className="bg-danger/10 border border-red-500/20 p-4 rounded-xl mt-2 animate-fade-in">
                                    <p className="text-danger text-sm font-medium leading-relaxed">
                                        Vehicle Capacity: <span className="text-primary">{capacity} kg</span><br />
                                        Cargo Weight: <span className="text-primary">{weight} kg</span><br />
                                    </p>
                                    <div className="text-danger text-sm font-bold flex items-center gap-1.5 mt-2 pt-2 border-t border-red-500/20">
                                        <CloseIcon className="w-4 h-4" /> Capacity exceeded by {overAmount} kg — dispatch blocked
                                    </div>
                                </div>
                            )}

                            {/* Dispatch Summary Card - STEP 6 */}
                            {isFormValid && (
                                <div className="bg-accent/5 border border-accent/20 p-4 rounded-xl space-y-3 animate-fade-in-up">
                                    <div className="flex items-center gap-2 text-accent font-bold text-xs border-b border-accent/15 pb-2">
                                        <ClipboardIcon className="w-4 h-4" />
                                        <span>DISPATCH SUMMARY REVIEW</span>
                                    </div>
                                    <div className="text-xs space-y-1.5">
                                        <div className="flex justify-between">
                                            <span className="text-secondary font-medium">Route:</span>
                                            <span className="text-primary truncate max-w-[180px] font-semibold">{form.source} → {form.destination}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-secondary font-medium">Distance:</span>
                                            <span className="text-primary font-semibold">{form.planned_distance} km</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-secondary font-medium">Vehicle & Driver:</span>
                                            <span className="text-primary font-semibold truncate max-w-[180px]">{selectedVehicleForForm.registration_no} / {selectedDriverName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-secondary font-medium">Cargo Weight:</span>
                                            <span className="text-primary font-semibold">{form.cargo_weight} kg</span>
                                        </div>
                                        {fuelPanelData.estimatedRequired > 0 && (
                                            <div className="flex justify-between text-accent font-semibold pt-1 border-t border-accent/10">
                                                <span>Est. Fuel Cost:</span>
                                                <span>₹{fuelPanelData.estimatedCost.toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 mt-2">
                                <Button 
                                    type="submit" 
                                    className="flex-1"
                                    disabled={!isFormValid || loading}
                                >
                                    {loading ? "Dispatching..." : !isFormValid ? "Dispatch (disabled)" : "Dispatch Trip"}
                                </Button>
                                <Button 
                                    type="button" 
                                    variant="secondary" 
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </div>

                </div>

                {/* Right Side: Map Viewer + Live Board */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    
                    {/* Interactive Route Map */}
                    <TripMap 
                        trip={activeTrip} 
                        vehicle={activeVehicle} 
                        driver={activeDriver} 
                        selectingMode={selectingMode}
                        onSelectLocation={handleSelectLocation}
                        draftSource={draftSource}
                        draftDestination={draftDestination}
                        onRouteCalculated={handleRouteCalculated}
                    />

                    {/* Live Board Title & Filters */}
                    <div className="flex flex-col gap-3 bg-card p-4 rounded-2xl border border-border shadow-sm">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xs uppercase tracking-widest text-muted font-bold">Live Status Board</h2>
                            {activeTrip && (
                                <span className="text-xs text-secondary">
                                    Map Target: <strong className="text-accent">TR-{String(activeTrip.id).substring(0,5).toUpperCase()}</strong>
                                </span>
                            )}
                        </div>

                        {/* Status Tabs */}
                        <div className="flex flex-wrap gap-2">
                            {["All", "Draft", "Dispatched", "Completed", "Cancelled"].map(s => {
                                const count = trips.filter(t => s === "All" || t.status === s).length;
                                const isActive = statusFilter === s;
                                return (
                                    <button
                                        key={s}
                                        onClick={() => setStatusFilter(s)}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${isActive ? "bg-accent text-card border-accent" : "bg-sidebar text-secondary border-border/40 hover:bg-[#2B3038]"}`}
                                    >
                                        {s} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    
                    {trips.filter(t => statusFilter === "All" || t.status === statusFilter).length === 0 ? (
                        <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
                            <p className="text-secondary text-sm">No trips match the selected status.</p>
                            <p className="text-gray-600 text-xs mt-1">Adjust your filters or dispatch new trips from the planning console.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {trips
                                .filter(t => statusFilter === "All" || t.status === statusFilter)
                                .map(trip => {
                                    const v = vehicles.find(veh => veh.id === trip.vehicle_id);
                                    const d = drivers.find(drv => drv.id === trip.driver_id);
                                    const vName = v ? v.registration_no : "—";
                                    const dName = d ? d.name.toUpperCase() : "UNASSIGNED";
                                    const isSelected = activeTrip && activeTrip.id === trip.id;

                                    // GPS Telemetry & Progress
                                    let gpsData = null;
                                    if (trip.status === "Dispatched" && trip.source_latitude && trip.source_longitude && trip.destination_latitude && trip.destination_longitude) {
                                        const mins = new Date().getMinutes();
                                        const progress = (mins % 10) / 10 || 0.1; // fallback to 10%
                                        const lat = parseFloat(trip.source_latitude) + (parseFloat(trip.destination_latitude) - parseFloat(trip.source_latitude)) * progress;
                                        const lng = parseFloat(trip.source_longitude) + (parseFloat(trip.destination_longitude) - parseFloat(trip.source_longitude)) * progress;
                                        gpsData = { lat: lat.toFixed(5), lng: lng.toFixed(5), percent: Math.round(progress * 100) };
                                    }
                                    
                                    return (
                                        <div 
                                            key={trip.id} 
                                            onClick={() => setSelectedTripId(trip.id)}
                                            className={`bg-card border rounded-2xl p-5 shadow-sm transition-all cursor-pointer flex flex-col gap-3.5 relative overflow-hidden group ${isSelected ? 'border-accent ring-1 ring-accent/50' : 'border-border hover:border-[#4b5563]'}`}
                                        >
                                            
                                            {/* Colored Left Accent line */}
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${trip.status === "Dispatched" ? "bg-info" : trip.status === "Draft" ? "bg-[#4B5563]" : trip.status === "Cancelled" ? "bg-[#F87171]" : "bg-success"}`}></div>
 
                                            <div className="flex justify-between items-start ml-2">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-secondary font-bold text-sm tracking-wide">TR-{String(trip.id).substring(0,5).toUpperCase()}</span>
                                                        {isSelected && (
                                                            <span className="text-[10px] bg-accent/20 text-accent font-bold px-2 py-0.5 rounded">Active Map View</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-secondary text-sm mt-1.5 font-medium">
                                                        <span>{trip.source}</span>
                                                        <ArrowRight className="w-3.5 h-3.5 text-accent" />
                                                        <span>{trip.destination}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-secondary text-xs font-semibold tracking-wider">
                                                        {vName}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Driver details */}
                                            {d && (
                                                <div className="ml-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary bg-sidebar/30 px-3 py-2 rounded-lg border border-border/20">
                                                    <div className="flex items-center gap-1">
                                                        <UserIcon className="w-3.5 h-3.5 text-accent" />
                                                        <span className="font-semibold text-primary">{d.name}</span>
                                                    </div>
                                                    <span className="text-muted text-[11px]">Lic: {d.license_number || "—"}</span>
                                                    <span className="text-muted text-[11px]">Exp: {new Date(d.license_expiry_date).toLocaleDateString()}</span>
                                                </div>
                                            )}

                                            {/* Live telemetry progress & coordinates */}
                                            {gpsData && (
                                                <div className="ml-2 flex flex-col gap-1.5 bg-sidebar/50 p-3 rounded-lg border border-border/40">
                                                    <div className="flex justify-between items-center text-[10px] font-bold text-muted uppercase tracking-wider">
                                                        <span>GPS Position: <span className="text-[#C98A1C] font-mono">{gpsData.lat}, {gpsData.lng}</span></span>
                                                        <span className="text-info">{gpsData.percent}% Complete</span>
                                                    </div>
                                                    <div className="w-full bg-[#1A1F26] rounded-full h-1.5 overflow-hidden border border-border/30 relative">
                                                        <div 
                                                            className="bg-info h-1.5 rounded-full transition-all duration-1000" 
                                                            style={{ width: `${gpsData.percent}%`, backgroundColor: "#3B82F6" }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-end ml-2 mt-1">
                                                <Badge status={trip.status}>{trip.status}</Badge>
                                                
                                                <div className="flex items-center gap-2">
                                                    <Button 
                                                        variant={isSelected ? "default" : "outline"}
                                                        className="px-2.5 py-1 text-xs flex items-center gap-1"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTripId(trip.id);
                                                        }}
                                                    >
                                                        <MapIcon className="w-3.5 h-3.5" /> Map Route
                                                    </Button>
 
                                                    {trip.status === "Dispatched" && (
                                                        <>
                                                            <Button 
                                                                variant="outline" 
                                                                className="px-2 py-1 text-xs text-red-400 border-red-500/20 hover:bg-red-500/10" 
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    if (!window.confirm("Are you sure you want to cancel this trip?")) return;
                                                                    try {
                                                                        await updateTrip(trip.id, { ...trip, status: "Cancelled" });
                                                                        fetchData();
                                                                    } catch (e) { alert("Failed to cancel trip"); }
                                                                }}
                                                            >
                                                                Cancel
                                                            </Button>
                                                            <Button 
                                                                className="px-2 py-1 text-xs" 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenCompleteModal(trip);
                                                                }}
                                                            >
                                                                Complete
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}

                    <div className="mt-2 p-3 bg-sidebar/40 rounded-xl border border-border">
                        <p className="text-xs text-muted">
                            Click any trip or the "Map Route" button to instantly project the route on OpenStreetMap with real OSRM path calculation.
                        </p>
                    </div>

                </div>

            </div>

            {/* Complete Trip Dialog Modal */}
            <Modal
                isOpen={isCompleteModalOpen}
                onClose={() => setIsCompleteModalOpen(false)}
                title="Complete Trip Verification"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setIsCompleteModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCompleteTrip} disabled={completeLoading}>
                            {completeLoading ? "Completing..." : "Complete Trip"}
                        </Button>
                    </div>
                }
            >
                <form onSubmit={handleCompleteTrip} className="space-y-4">
                    {completeError && (
                        <div className="bg-danger/10 border border-red-500/20 text-danger text-sm p-3 rounded-lg flex items-center gap-2">
                            <HiOutlineExclamationCircle className="w-5 h-5 shrink-0" />
                            <span>{completeError}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label="Actual Distance Travelled (km)"
                            name="actual_distance"
                            type="number"
                            required
                            value={completeForm.actual_distance}
                            onChange={(e) => setCompleteForm({...completeForm, actual_distance: e.target.value})}
                        />
                        <Input 
                            label="Final Odometer Reading (km)"
                            name="final_odometer"
                            type="number"
                            required
                            value={completeForm.final_odometer}
                            onChange={(e) => setCompleteForm({...completeForm, final_odometer: e.target.value})}
                        />
                        <Input 
                            label="Actual Fuel Consumed (litres)"
                            name="actual_fuel_consumed"
                            type="number"
                            required
                            value={completeForm.actual_fuel_consumed}
                            onChange={(e) => setCompleteForm({...completeForm, actual_fuel_consumed: e.target.value})}
                        />
                        <Input 
                            label="Trip Revenue (₹)"
                            name="revenue"
                            type="number"
                            placeholder="e.g. 15000"
                            value={completeForm.revenue}
                            onChange={(e) => setCompleteForm({...completeForm, revenue: e.target.value})}
                        />
                    </div>
                </form>
            </Modal>

        </div>
    );
};

export default Trips;