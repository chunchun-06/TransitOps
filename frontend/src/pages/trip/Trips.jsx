import { useEffect, useState } from "react";
import { HiOutlineArrowRight, HiX, HiOutlineMap } from "react-icons/hi";
import { getTrips, createTrip } from "../../api/trip.api";
import { getVehicles, getAvailableVehicles } from "../../api/vehicle.api";
import { getDrivers, getAvailableDrivers } from "../../api/driver.api";
import { Input, Select, Button, Badge } from "../../components/common";
import TripMap from "../../components/trip/TripMap";

const initialForm = {
    source: "",
    destination: "",
    vehicle_id: "",
    driver_id: "",
    cargo_weight: "",
    planned_distance: ""
};

const STEPS = [
    { label: "Draft", color: "#10B981" },
    { label: "Dispatched", color: "#3B82F6" },
    { label: "Completed", color: "#4B5563" },
    { label: "Cancelled", color: "#4B5563" }
];

const Trips = () => {
    const [trips, setTrips] = useState([]);
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

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSelectLocation = (mode, locationData) => {
        if (mode === 'source') {
            setForm(prev => ({ ...prev, source: locationData.address }));
            setDraftSource(locationData);
        } else if (mode === 'destination') {
            setForm(prev => ({ ...prev, destination: locationData.address }));
            setDraftDestination(locationData);
        }
        setSelectingMode(null);
    };

    const handleRouteCalculated = (distanceKm) => {
        if (distanceKm && (!form.planned_distance || form.planned_distance === "0")) {
            setForm(prev => ({ ...prev, planned_distance: distanceKm }));
        }
    };

    const selectedVehicleForForm = availableVehicles.find(v => v.id.toString() === form.vehicle_id);
    const capacity = selectedVehicleForForm?.max_load_capacity || 0;
    const weight = Number(form.cargo_weight) || 0;
    const isOverweight = capacity > 0 && weight > capacity;
    const overAmount = weight - capacity;

    const isFormValid = form.source && form.destination && form.vehicle_id && form.driver_id && form.cargo_weight && !isOverweight;

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
                planned_distance: Number(form.planned_distance || 0),
                status: "Dispatched"
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
            label: `${v.registration_no} - ${v.vehicle_name} (${v.max_load_capacity || 0} kg capacity)`,
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
                                        <HiOutlineMap className="w-3.5 h-3.5" />
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
                                        <HiOutlineMap className="w-3.5 h-3.5" />
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

                            {/* Validation Block */}
                            {isOverweight && (
                                <div className="bg-danger/10 border border-red-500/20 p-4 rounded-xl mt-2 animate-fade-in">
                                    <p className="text-danger text-sm font-medium leading-relaxed">
                                        Vehicle Capacity: <span className="text-primary">{capacity} kg</span><br />
                                        Cargo Weight: <span className="text-primary">{weight} kg</span><br />
                                    </p>
                                    <div className="text-danger text-sm font-bold flex items-center gap-1.5 mt-2 pt-2 border-t border-red-500/20">
                                        <HiX className="w-4 h-4" /> Capacity exceeded by {overAmount} kg — dispatch blocked
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 mt-2">
                                <Button 
                                    type="submit" 
                                    className="flex-1"
                                    disabled={!isFormValid || loading}
                                >
                                    {loading ? "Dispatching..." : !isFormValid ? "Dispatch (disabled)" : "Dispatch"}
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

                    {/* Live Board Title */}
                    <div className="flex items-center justify-between ml-1">
                        <h2 className="text-[10px] uppercase tracking-widest text-muted font-bold">Live Board ({trips.length} Trips)</h2>
                        {activeTrip && (
                            <span className="text-xs text-secondary">
                                Currently Viewing Map for: <strong className="text-accent">TR-{String(activeTrip.id).substring(0,5).toUpperCase()}</strong>
                            </span>
                        )}
                    </div>
                    
                    {trips.length === 0 ? (
                        <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
                            <p className="text-secondary text-sm">No active trips found.</p>
                            <p className="text-gray-600 text-xs mt-1">Create a trip from the left panel to see it here and render its map route.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {trips.map(trip => {
                                const v = vehicles.find(veh => veh.id === trip.vehicle_id);
                                const d = drivers.find(drv => drv.id === trip.driver_id);
                                const vName = v ? v.registration_no : "—";
                                const dName = d ? d.name.toUpperCase() : "UNASSIGNED";
                                const isSelected = activeTrip && activeTrip.id === trip.id;
                                
                                return (
                                    <div 
                                        key={trip.id} 
                                        onClick={() => setSelectedTripId(trip.id)}
                                        className={`bg-card border rounded-2xl p-5 shadow-sm transition-all cursor-pointer flex flex-col gap-4 relative overflow-hidden group ${isSelected ? 'border-accent ring-1 ring-accent/50' : 'border-border hover:border-[#4b5563]'}`}
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
                                                    <HiOutlineArrowRight className="w-3.5 h-3.5 text-accent" />
                                                    <span>{trip.destination}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-secondary text-xs font-semibold tracking-wider">
                                                    {vName} / {dName}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-end ml-2 mt-2">
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
                                                    <HiOutlineMap className="w-3.5 h-3.5" /> Map Route
                                                </Button>

                                                {trip.status === "Dispatched" && (
                                                    <>
                                                        <Button 
                                                            variant="outline" 
                                                            className="px-2 py-1 text-xs" 
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                try {
                                                                    await import('../../api/trip.api').then(m => m.updateTrip(trip.id, { ...trip, status: "Cancelled" }));
                                                                    fetchData();
                                                                } catch (e) { alert("Failed to cancel trip"); }
                                                            }}
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button 
                                                            className="px-2 py-1 text-xs" 
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                try {
                                                                    await import('../../api/trip.api').then(m => m.updateTrip(trip.id, { ...trip, status: "Completed" }));
                                                                    fetchData();
                                                                } catch (e) { alert("Failed to complete trip"); }
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
        </div>
    );
};

export default Trips;