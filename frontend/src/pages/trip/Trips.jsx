import { useEffect, useState } from "react";
import { HiOutlineArrowRight } from "react-icons/hi";
import { getTrips, createTrip } from "../../api/trip.api";
import { getVehicles } from "../../api/vehicle.api";
import { getDrivers } from "../../api/driver.api";
import { Input, Select, Button, Badge } from "../../components/common";

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
    
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const fetchData = async () => {
        try {
            const [tripsRes, vehiclesRes, driversRes] = await Promise.all([
                getTrips().catch(() => ({ data: [] })),
                getVehicles().catch(() => ({ data: [] })),
                getDrivers().catch(() => ({ data: [] }))
            ]);
            setTrips(tripsRes.data || []);
            setVehicles(vehiclesRes.data || []);
            setDrivers(driversRes.data || []);
        } catch (err) {
            console.error("Error fetching trip dispatcher data:", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const selectedVehicle = vehicles.find(v => v.id.toString() === form.vehicle_id);
    const capacity = selectedVehicle?.max_load_capacity || 0;
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
                vehicle_id: Number(form.vehicle_id),
                driver_id: Number(form.driver_id),
                cargo_weight: Number(form.cargo_weight),
                planned_distance: Number(form.planned_distance || 0),
                status: "Dispatched" // Defaults to dispatched on creation in this UI
            };

            await createTrip(payload);
            setForm(initialForm);
            fetchData(); // Refresh data to update Live Board
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Failed to dispatch trip");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setForm(initialForm);
        setErrorMsg("");
    };

    const vehicleOptions = [
        { label: "Select Vehicle...", value: "" },
        ...vehicles
            .filter(v => v.status === "Available")
            .map(v => ({
                label: `${v.registration_no} - ${v.max_load_capacity} kg capacity`,
                value: v.id
            }))
    ];

    const driverOptions = [
        { label: "Select Driver...", value: "" },
        ...drivers
            .filter(d => d.status === "Available")
            .map(d => ({
                label: d.name,
                value: d.id
            }))
    ];

    return (
        <div className="animate-fade-in-up max-w-[1600px] mx-auto text-white">
            
            {/* Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Side: Create Trip */}
                <div className="lg:col-span-4 space-y-6">
                    
                    {/* Stepper */}
                    <div className="bg-[#1B1F24] border border-[#2B3038] rounded-2xl p-6 shadow-sm">
                        <h2 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-6">Trip Lifecycle</h2>
                        <div className="flex items-center justify-between relative">
                            {/* Connecting Line */}
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
                    <div className="bg-[#1B1F24] border border-[#2B3038] rounded-2xl p-6 shadow-sm">
                        <h2 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-6">Create Trip</h2>
                        
                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            {errorMsg && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg">
                                    <span className="font-semibold">Error:</span> {errorMsg}
                                </div>
                            )}

                            <Input 
                                label="Source" 
                                name="source" 
                                placeholder="e.g. Gandhinagar Depot" 
                                value={form.source} 
                                onChange={handleChange} 
                            />
                            
                            <Input 
                                label="Destination" 
                                name="destination" 
                                placeholder="e.g. Ahmedabad Hub" 
                                value={form.destination} 
                                onChange={handleChange} 
                            />
                            
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
                                placeholder="e.g. 38" 
                                value={form.planned_distance} 
                                onChange={handleChange} 
                            />

                            {/* Validation Block */}
                            {isOverweight && (
                                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mt-2 animate-fade-in">
                                    <p className="text-red-400 text-sm font-medium leading-relaxed">
                                        Vehicle Capacity: <span className="text-white">{capacity} kg</span><br />
                                        Cargo Weight: <span className="text-white">{weight} kg</span><br />
                                    </p>
                                    <div className="text-red-400 text-sm font-bold flex items-center gap-1.5 mt-2 pt-2 border-t border-red-500/20">
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

                {/* Right Side: Live Board */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <h2 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold ml-1">Live Board</h2>
                    
                    {trips.length === 0 ? (
                        <div className="bg-[#1B1F24] border border-[#2B3038] rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
                            <p className="text-gray-400 text-sm">No active trips found.</p>
                            <p className="text-gray-600 text-xs mt-1">Create a trip from the left panel to see it here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {trips.map(trip => {
                                const v = vehicles.find(veh => veh.id === trip.vehicle_id);
                                const d = drivers.find(drv => drv.id === trip.driver_id);
                                const vName = v ? v.registration_no : "—";
                                const dName = d ? d.name.toUpperCase() : "UNASSIGNED";
                                
                                return (
                                    <div key={trip.id} className="bg-[#1B1F24] border border-[#2B3038] hover:border-[#4b5563] rounded-2xl p-5 shadow-sm transition-colors flex flex-col gap-4 relative overflow-hidden group">
                                        
                                        {/* Colored Left Accent line */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${trip.status === "Dispatched" ? "bg-[#3B82F6]" : trip.status === "Draft" ? "bg-[#4B5563]" : trip.status === "Cancelled" ? "bg-[#F87171]" : "bg-[#10B981]"}`}></div>

                                        <div className="flex justify-between items-start ml-2">
                                            <div className="flex flex-col">
                                                <span className="text-gray-300 font-bold text-sm tracking-wide">TR{String(trip.id).padStart(3, '0')}</span>
                                                <div className="flex items-center gap-2 text-gray-400 text-sm mt-1.5 font-medium">
                                                    <span>{trip.source}</span>
                                                    <HiOutlineArrowRight className="w-3.5 h-3.5 text-[#C98A1C]" />
                                                    <span>{trip.destination}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-gray-400 text-xs font-semibold tracking-wider">
                                                    {vName} / {dName}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-end ml-2 mt-2">
                                            <Badge status={trip.status}>{trip.status}</Badge>
                                            <span className="text-gray-500 text-xs font-medium">
                                                {trip.status === "Dispatched" ? "45 min ETA" : trip.status === "Draft" ? "Awaiting driver" : trip.status === "Cancelled" ? "Vehicle went to shop" : "—"}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-4 p-4">
                        <p className="text-xs text-gray-500">
                            On Complete: odometer <HiOutlineArrowRight className="inline w-3 h-3 text-gray-600" /> Fuel log <HiOutlineArrowRight className="inline w-3 h-3 text-gray-600" /> expenses <HiOutlineArrowRight className="inline w-3 h-3 text-gray-600" /> Vehicle & Driver Available
                        </p>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default Trips;