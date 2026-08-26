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
import { getTollEstimate, calculateTolls } from "../../api/toll_rate.api";
import { Input, Select, Button, Badge, Modal } from "../../components/common";
import AddressAutocomplete from "../../components/common/AddressAutocomplete";
import TripMap from "../../components/trip/TripMap";
import { useFleet } from "../../context/FleetContext";

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
    current_fuel_liters: "",
    toll_amount: ""
};

const STEPS = [
    { label: "Draft", color: "#10B981" },
    { label: "Dispatched", color: "#3B82F6" },
    { label: "Completed", color: "#10B981" },
    { label: "Cancelled", color: "#EF4444" }
];

const Trips = () => {
    const fleetCtx = useFleet();
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
    const [fuelPriceData, setFuelPriceData] = useState({
        price: 0,
        city: 'Chennai',
        state: 'Tamil Nadu',
        effectiveDate: '',
        source: '',
        isStale: false,
        fetchedAt: '',
        error: ''
    });
    
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
        revenue: "",
        toll_amount: ""
    });
    const [completeError, setCompleteError] = useState("");
    const [tollsDetected, setTollsDetected] = useState([]);
    const [tollEstimateMsg, setTollEstimateMsg] = useState("");
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
            
            setFuelPriceData(prev => ({ ...prev, error: '' }));
            
            try {
                const res = await getCurrentFuelPrice(fuelType, "Chennai", "Tamil Nadu");
                if (res.data) {
                    setFuelPriceData({
                        price: parseFloat(res.data.price_per_liter) || 0,
                        city: res.data.city || 'Chennai',
                        state: 'Tamil Nadu',
                        effectiveDate: res.data.effective_from || '',
                        source: res.data.source || '',
                        isStale: !!res.data.is_stale,
                        fetchedAt: res.data.fetched_at || '',
                        error: ''
                    });
                }
            } catch (err) {
                console.error("Error fetching fuel price:", err);
                setFuelPriceData(prev => ({ 
                    ...prev, 
                    price: 0,
                    error: err.response?.data?.message || 'Current fuel price unavailable.' 
                }));
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
        const estimatedCost = Math.round(additionalRequired * fuelPriceData.price * 100) / 100;

        setFuelPanelData({
            efficiency,
            tankCapacity,
            estimatedRequired,
            additionalRequired,
            estimatedCost,
            fuelType
        });
    }, [form.vehicle_id, form.planned_distance, form.current_fuel_liters, fuelPriceData.price, availableVehicles]);

    // Calculate route-based tolls — fires when we have valid coordinates OR non-empty addresses
    useEffect(() => {
        const srcLat = parseFloat(form.source_latitude);
        const srcLng = parseFloat(form.source_longitude);
        const dstLat = parseFloat(form.destination_latitude);
        const dstLng = parseFloat(form.destination_longitude);

        const hasSourceCoords = !isNaN(srcLat) && !isNaN(srcLng) && srcLat !== 0 && srcLng !== 0;
        const hasDestCoords   = !isNaN(dstLat) && !isNaN(dstLng) && dstLat !== 0 && dstLng !== 0;

        // Clear tolls if source or destination text was cleared
        if (!form.source || !form.destination) {
            setTollsDetected([]);
            setTollEstimateMsg("");
            return;
        }

        const hasSourceText = form.source.trim().length >= 3;
        const hasDestText   = form.destination.trim().length >= 3;

        // Trigger calculation if coordinates are valid, OR if we have text-based fallback search input
        if (!((hasSourceCoords && hasDestCoords) || (hasSourceText && hasDestText))) {
            return;
        }

        const veh = availableVehicles.find(v => v?.id != null && String(v.id) === String(form.vehicle_id));

        const fetchTolls = async () => {
            try {
                console.log('[Toll] Calculating for:', form.source, '→', form.destination, 
                    '| Coords:', hasSourceCoords ? `${srcLat}, ${srcLng}` : 'None (Backend Fallback)', 
                    '→', hasDestCoords ? `${dstLat}, ${dstLng}` : 'None (Backend Fallback)',
                    '| Vehicle:', form.vehicle_id, '| Category:', veh?.toll_category || veh?.vehicle_type);

                const res = await calculateTolls({
                    source: form.source,
                    destination: form.destination,
                    source_latitude: hasSourceCoords ? srcLat : undefined,
                    source_longitude: hasSourceCoords ? srcLng : undefined,
                    destination_latitude: hasDestCoords ? dstLat : undefined,
                    destination_longitude: hasDestCoords ? dstLng : undefined,
                    vehicle_id: form.vehicle_id || undefined,
                    vehicle_class: veh?.vehicle_type || 'Truck',
                    axle_count: veh?.axle_count || 2,
                    trip_date: new Date().toISOString().split('T')[0]   // YYYY-MM-DD for effective-date tariff lookup
                });

                if (res.data) {
                    console.log('[Toll] Result:', res.data.message, '| Total: ₹' + res.data.total_toll_amount);
                    setTollsDetected(res.data.tolls_detected || []);
                    
                    setForm(prev => {
                        const updates = {};
                        if (res.data.total_toll_amount !== undefined) {
                            updates.toll_amount = res.data.total_toll_amount.toString();
                        }
                        if (res.data.source_latitude && !prev.source_latitude) {
                            updates.source_latitude = res.data.source_latitude.toString();
                            updates.source_longitude = res.data.source_longitude.toString();
                        }
                        if (res.data.destination_latitude && !prev.destination_latitude) {
                            updates.destination_latitude = res.data.destination_latitude.toString();
                            updates.destination_longitude = res.data.destination_longitude.toString();
                        }
                        if (res.data.distanceKm && !prev.planned_distance) {
                            updates.planned_distance = res.data.distanceKm.toString();
                        }
                        return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
                    });

                    if (res.data.source_latitude && !draftSource) {
                        setDraftSource({
                            lat: parseFloat(res.data.source_latitude),
                            lng: parseFloat(res.data.source_longitude),
                            address: form.source
                        });
                    }
                    if (res.data.destination_latitude && !draftDestination) {
                        setDraftDestination({
                            lat: parseFloat(res.data.destination_latitude),
                            lng: parseFloat(res.data.destination_longitude),
                            address: form.destination
                        });
                    }

                    setTollEstimateMsg(res.data.message || "");
                }
            } catch (err) {
                console.error("[Toll] Calculation error:", err?.response?.data || err.message);
                setTollsDetected([]);
                setTollEstimateMsg(
                    err?.response?.data?.message || "Toll information temporarily unavailable."
                );
            }
        };

        const timer = setTimeout(fetchTolls, 400);
        return () => clearTimeout(timer);
    }, [
        form.source,
        form.destination,
        form.source_latitude,
        form.source_longitude,
        form.destination_latitude,
        form.destination_longitude,
        form.vehicle_id,
        availableVehicles
    ]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "vehicle_id") {
            const selectedVeh = availableVehicles.find(v => v?.id != null && String(v.id) === String(value));
            let autoDriverId = form.driver_id;
            if (selectedVeh && selectedVeh.current_driver_id) {
                const isDrvAvail = availableDrivers.some(d => d.id === selectedVeh.current_driver_id);
                if (isDrvAvail) {
                    autoDriverId = selectedVeh.current_driver_id;
                }
            }
            setForm(prev => ({
                ...prev,
                vehicle_id: value,
                driver_id: autoDriverId,
                current_fuel_liters: selectedVeh?.current_fuel_level_liters !== undefined ? selectedVeh.current_fuel_level_liters.toString() : prev.current_fuel_liters
            }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSelectLocation = (mode, locationData) => {
        // Normalise: AddressAutocomplete gives {latitude, longitude}, MapClickHandler gives {lat, lng}
        const lat = locationData.lat ?? locationData.latitude;
        const lng = locationData.lng ?? locationData.longitude;
        const address = locationData.address;
        const normalised = { lat, lng, address };

        if (mode === 'source') {
            setForm(prev => ({ 
                ...prev, 
                source: address,
                source_latitude: lat,
                source_longitude: lng
            }));
            setDraftSource(normalised);
        } else if (mode === 'destination') {
            setForm(prev => ({ 
                ...prev, 
                destination: address,
                destination_latitude: lat,
                destination_longitude: lng
            }));
            setDraftDestination(normalised);
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

    const selectedVehicleForForm = availableVehicles.find(v => v?.id != null && String(v.id) === String(form.vehicle_id));
    const capacity = parseFloat(selectedVehicleForForm?.max_load_capacity) || 0;
    const tankCapacity = parseFloat(selectedVehicleForForm?.fuel_tank_capacity_liters) || 0;
    const weight = Number(form.cargo_weight) || 0;
    const currentFuelInput = form.current_fuel_liters !== '' ? parseFloat(form.current_fuel_liters) : NaN;
    const isOverweight = capacity > 0 && weight > capacity;
    const overAmount = Math.max(weight - capacity, 0);
    const isFuelNegative = !isNaN(currentFuelInput) && currentFuelInput < 0;
    const isFuelOverTank = tankCapacity > 0 && !isNaN(currentFuelInput) && currentFuelInput > tankCapacity;
    const hasFuelError = isFuelNegative || isFuelOverTank;

    const isFormValid = 
        form.source && 
        form.destination && 
        form.vehicle_id && 
        form.driver_id && 
        form.cargo_weight && 
        !isOverweight && 
        !hasFuelError &&
        parseFloat(form.planned_distance) > 0 &&
        !isNaN(parseFloat(form.source_latitude)) &&
        !isNaN(parseFloat(form.source_longitude)) &&
        !isNaN(parseFloat(form.destination_latitude)) &&
        !isNaN(parseFloat(form.destination_longitude));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isOverweight || !isFormValid || hasFuelError) return;
        
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
                toll_amount: form.toll_amount ? Number(form.toll_amount) : 0,
                source_latitude: form.source_latitude ? Number(form.source_latitude) : null,
                source_longitude: form.source_longitude ? Number(form.source_longitude) : null,
                destination_latitude: form.destination_latitude ? Number(form.destination_latitude) : null,
                destination_longitude: form.destination_longitude ? Number(form.destination_longitude) : null
            };

            const createdRes = await createTrip(payload);
            if (createdRes.data && createdRes.data.id) {
                setSelectedTripId(createdRes.data.id);
                if (fleetCtx?.addTripToState) {
                    fleetCtx.addTripToState(createdRes.data);
                }
            }
            setForm(initialForm);
            setDraftSource(null);
            setDraftDestination(null);
            setSelectingMode(null);
            setTollsDetected([]);
            setTollEstimateMsg("");
            await fetchData();
            if (fleetCtx?.fetchFleetData) {
                fleetCtx.fetchFleetData();
            }
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
        setTollsDetected([]);
        setTollEstimateMsg("");
    };

    const handleOpenCompleteModal = (trip) => {
        const v = vehicles.find(veh => veh.id === trip.vehicle_id);
        const startOdo = parseFloat(trip.start_odometer || v?.odometer || 0);
        const plannedDist = parseFloat(trip.planned_distance || 0);
        const finalOdo = (startOdo + plannedDist).toFixed(1);
        const autoRev = (trip.revenue && parseFloat(trip.revenue) > 0)
            ? trip.revenue.toString()
            : Math.round(plannedDist * 50).toString();

        setTripToComplete(trip);
        setCompleteForm({
            actual_distance: plannedDist > 0 ? plannedDist.toString() : "",
            final_odometer: finalOdo,
            actual_fuel_consumed: trip.estimated_fuel_liters ? trip.estimated_fuel_liters.toString() : "",
            revenue: autoRev,
            toll_amount: trip.toll_amount ? trip.toll_amount.toString() : ""
        });
        setCompleteError("");
        setIsCompleteModalOpen(true);
    };

    const handleActualDistanceChange = (val) => {
        if (!tripToComplete) return;
        const v = vehicles.find(veh => veh.id === tripToComplete.vehicle_id);
        const startOdo = parseFloat(tripToComplete.start_odometer || v?.odometer || 0);
        const distNum = parseFloat(val);

        if (!isNaN(distNum) && distNum >= 0) {
            const syncedOdo = (startOdo + distNum).toFixed(1);
            const syncedRev = Math.round(distNum * 50).toString();
            setCompleteForm(prev => ({
                ...prev,
                actual_distance: val,
                final_odometer: syncedOdo,
                revenue: syncedRev
            }));
        } else {
            setCompleteForm(prev => ({ ...prev, actual_distance: val }));
        }
    };

    const handleFinalOdometerChange = (val) => {
        if (!tripToComplete) return;
        const v = vehicles.find(veh => veh.id === tripToComplete.vehicle_id);
        const startOdo = parseFloat(tripToComplete.start_odometer || v?.odometer || 0);
        const finalOdoNum = parseFloat(val);

        if (!isNaN(finalOdoNum) && finalOdoNum >= startOdo) {
            const syncedDist = (finalOdoNum - startOdo).toFixed(1);
            const syncedRev = Math.round(parseFloat(syncedDist) * 50).toString();
            setCompleteForm(prev => ({
                ...prev,
                final_odometer: val,
                actual_distance: syncedDist,
                revenue: syncedRev
            }));
        } else {
            setCompleteForm(prev => ({ ...prev, final_odometer: val }));
        }
    };

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

            const res = await updateTrip(tripToComplete.id, {
                status: "Completed",
                actual_distance: Number(completeForm.actual_distance),
                final_odometer: finalOdo,
                actual_fuel_consumed: Number(completeForm.actual_fuel_consumed),
                revenue: completeForm.revenue ? Number(completeForm.revenue) : null,
                toll_amount: completeForm.toll_amount ? Number(completeForm.toll_amount) : null
            });

            if (fleetCtx?.updateTripInState && res?.data) {
                fleetCtx.updateTripInState(res.data);
            }

            setIsCompleteModalOpen(false);
            setTripToComplete(null);
            await fetchData();
            if (fleetCtx?.fetchFleetData) {
                fleetCtx.fetchFleetData();
            }
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

                            {/* Source Field with Autocomplete & Map Button */}
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
                                <AddressAutocomplete
                                    value={form.source}
                                    onChange={(val) => {
                                        setForm(prev => ({ 
                                            ...prev, 
                                            source: val,
                                            source_latitude: "",
                                            source_longitude: ""
                                        }));
                                        setDraftSource(null);
                                    }}
                                    onSelectLocation={(loc) => handleSelectLocation('source', loc)}
                                    placeholder="Search source address or city..."
                                />
                            </div>
                            
                            {/* Destination Field with Autocomplete & Map Button */}
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
                                <AddressAutocomplete
                                    value={form.destination}
                                    onChange={(val) => {
                                        setForm(prev => ({ 
                                            ...prev, 
                                            destination: val,
                                            destination_latitude: "",
                                            destination_longitude: ""
                                        }));
                                        setDraftDestination(null);
                                    }}
                                    onSelectLocation={(loc) => handleSelectLocation('destination', loc)}
                                    placeholder="Search destination address or city..."
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
                            
                            <div>
                                <Input 
                                    label={`Cargo Weight (kg)${capacity > 0 ? ` — max ${capacity} kg` : ''}`}
                                    name="cargo_weight" 
                                    type="number" 
                                    placeholder={capacity > 0 ? `Max ${capacity} kg` : "e.g. 700"}
                                    value={form.cargo_weight} 
                                    onChange={handleChange} 
                                />
                            </div>
                            
                            <Input 
                                label="Planned Distance (km)" 
                                name="planned_distance" 
                                type="number" 
                                placeholder="e.g. 150" 
                                value={form.planned_distance} 
                                onChange={handleChange} 
                            />
                            
                            <div className="flex flex-col gap-1.5">
                                <Input 
                                    label="Toll Amount (₹)" 
                                    name="toll_amount" 
                                    type="number" 
                                    placeholder="Auto-estimated from route toll plazas" 
                                    value={form.toll_amount} 
                                    onChange={handleChange} 
                                />
                                {tollEstimateMsg && (
                                    <p className="text-[11.5px] text-accent font-medium -mt-1 flex items-center gap-1">
                                        <span>🛣️</span> {tollEstimateMsg}
                                    </p>
                                )}
                            </div>

                            {/* Detected Toll Gates Breakdown Panel */}
                            {tollsDetected.length > 0 && (
                                <div className="bg-sidebar p-3.5 rounded-xl border border-amber-500/30 space-y-2.5">
                                    <div className="flex items-center justify-between border-b border-border pb-2">
                                        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <span>🚧</span> Toll Plazas Detected ({tollsDetected.length})
                                        </span>
                                        <span className="text-xs font-bold text-emerald-400">
                                            Total Toll: ₹{form.toll_amount || 0}
                                        </span>
                                    </div>
                                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                        {tollsDetected.map((t, idx) => (
                                            t && (
                                                <div key={t.id || idx} className="flex items-center justify-between text-xs bg-card/70 p-2.5 rounded-lg border border-border/80 shadow-xs">
                                                    <div className="truncate pr-2">
                                                        <p className="font-bold text-primary truncate">{idx + 1}. {t.name || t.toll_name || `Toll Plaza #${idx + 1}`}</p>
                                                        <p className="text-[10px] text-muted">{t.highway || "Highway"} • {t.state || "Route Corridor"}</p>
                                                        <p className="text-[10px] text-accent font-medium mt-0.5">
                                                            Category: {t.vehicleCategoryLabel || t.vehicleCategory || "Truck – 2 Axle"}
                                                        </p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        {t.toll_amount !== null && t.toll_amount !== undefined ? (
                                                            <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 text-xs">
                                                                ₹{parseFloat(t.toll_amount).toFixed(2)}
                                                            </span>
                                                        ) : (
                                                            <span className="font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[10px]">
                                                                Rate Unavailable
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Fuel Panel */}
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
                                            <p className={`font-semibold ${fuelPanelData.efficiency > 0 ? 'text-secondary' : 'text-amber-400'}`}>
                                                {fuelPanelData.efficiency > 0 ? `${fuelPanelData.efficiency} km/L` : '⚠️ Not set'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted">Tank Capacity</p>
                                            <p className={`font-semibold ${fuelPanelData.tankCapacity > 0 ? 'text-secondary' : 'text-amber-400'}`}>
                                                {fuelPanelData.tankCapacity > 0 ? `${fuelPanelData.tankCapacity} L` : '⚠️ Not set'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted">Fuel Price</p>
                                            <p className="font-semibold text-secondary">
                                                {fuelPriceData.price > 0 ? `₹${fuelPriceData.price}/L` : '---'}
                                            </p>
                                        </div>
                                    </div>

                                    {fuelPriceData.error ? (
                                        <div className="text-[11px] text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
                                            ❌ {fuelPriceData.error}
                                        </div>
                                    ) : fuelPriceData.price > 0 ? (
                                        <div className="text-[11px] bg-card/60 p-2.5 rounded-lg space-y-1 border border-border">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-secondary">Current Fuel Price</span>
                                                <span className="font-bold text-accent">₹{fuelPriceData.price}/L</span>
                                            </div>
                                            <div className="text-muted flex flex-col gap-0.5 mt-1">
                                                <p>Location: {fuelPriceData.city}, {fuelPriceData.state}</p>
                                                <p>Effective: {new Date(fuelPriceData.effectiveDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                                <p>Source: {fuelPriceData.source}</p>
                                                <p>Last Updated: {new Date(fuelPriceData.fetchedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' })}</p>
                                            </div>
                                            {fuelPriceData.isStale && (
                                                <div className="text-amber-400 mt-1 font-medium flex items-center gap-1">
                                                    <span>⚠️</span> Using last available fuel price (Status: Cached)
                                                </div>
                                            )}
                                        </div>
                                    ) : null}

                                    {fuelPanelData.efficiency === 0 && (
                                        <div className="text-[11px] text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20">
                                            ⚠️ Vehicle mileage not configured — fuel estimation unavailable. Edit the vehicle to add fuel efficiency (km/L).
                                        </div>
                                    )}

                                    <div>
                                        <Input 
                                            label={`Current Fuel Level (litres)${tankCapacity > 0 ? ` — max ${tankCapacity} L` : ''}`}
                                            name="current_fuel_liters" 
                                            type="number" 
                                            placeholder={`Current: ${selectedVehicleForForm.current_fuel_level_liters || 0} L`}
                                            value={form.current_fuel_liters} 
                                            onChange={handleChange} 
                                            className="py-1 px-2 text-xs"
                                        />
                                        {isFuelNegative && (
                                            <p className="text-[11px] text-red-400 mt-1">❌ Fuel level cannot be negative.</p>
                                        )}
                                        {isFuelOverTank && (
                                            <p className="text-[11px] text-red-400 mt-1">❌ Current fuel ({currentFuelInput} L) cannot exceed tank capacity ({tankCapacity} L).</p>
                                        )}
                                    </div>

                                    <div className="pt-2 border-t border-border space-y-1.5 text-xs">
                                        {parseFloat(form.planned_distance) > 0 && fuelPanelData.efficiency > 0 ? (
                                            <>
                                                <div className="flex justify-between">
                                                    <span className="text-muted">Route Distance:</span>
                                                    <span className="font-semibold text-secondary">{parseFloat(form.planned_distance).toFixed(1)} km</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted">Est. Fuel Required:</span>
                                                    <span className="font-semibold text-secondary">{fuelPanelData.estimatedRequired} L</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted">Additional Fuel to Buy:</span>
                                                    <span className={`font-semibold ${fuelPanelData.additionalRequired > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                        {fuelPanelData.additionalRequired} L
                                                        {fuelPanelData.additionalRequired === 0 ? ' ✓ Sufficient' : ''}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted">Est. Additional Cost:</span>
                                                    <span className="font-bold text-emerald-400">₹{fuelPanelData.estimatedCost}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-muted italic text-[11px]">
                                                {parseFloat(form.planned_distance) <= 0
                                                    ? '📍 Select source & destination to calculate fuel.'
                                                    : '⚠️ Set vehicle mileage to enable fuel estimation.'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Overweight Alert */}
                            {isOverweight && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold">
                                    ❌ Goods weight ({weight} kg) exceeds vehicle load capacity ({capacity} kg) by {overAmount} kg. Reduce goods weight to dispatch.
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <Button type="button" variant="secondary" onClick={handleCancel}>Cancel</Button>
                                <Button type="submit" disabled={loading || !isFormValid}>
                                    {loading ? "Dispatching..." : "Dispatch Trip"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right Side: Map & Trip Live Board */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {/* OpenStreetMap Component */}
                    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col h-[520px]">
                        <div className="p-4 border-b border-border bg-sidebar flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                                <MapIcon className="w-4 h-4 text-accent" /> Live Route & Geographic Mapping
                            </h3>
                            {selectingMode && (
                                <span className="text-xs font-bold text-accent animate-pulse bg-accent/10 px-3 py-1 rounded-full border border-accent/30">
                                    Click on the map to set {selectingMode.toUpperCase()}
                                </span>
                            )}
                        </div>
                        
                        <div className="flex-1 relative">
                            <TripMap
                                draftSource={draftSource}
                                draftDestination={draftDestination}
                                sourceText={form.source}
                                destinationText={form.destination}
                                sourceLatitude={form.source_latitude}
                                sourceLongitude={form.source_longitude}
                                destLatitude={form.destination_latitude}
                                destLongitude={form.destination_longitude}
                                selectingMode={selectingMode}
                                onSelectLocation={handleSelectLocation}
                                onRouteCalculated={handleRouteCalculated}
                                vehicle={selectedVehicleForForm || null}
                                driver={availableDrivers.find(d => d.id === form.driver_id) || null}
                                tolls={tollsDetected}
                            />
                        </div>
                    </div>

                    {/* Trips Live Table Board */}
                    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
                        <div className="p-4 border-b border-border bg-sidebar flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                                <ClipboardIcon className="w-4 h-4 text-accent" /> Active Fleet Dispatch Board
                            </h3>
                            <Select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                options={[
                                    { label: "Filter: All Trips", value: "All" },
                                    { label: "Draft", value: "Draft" },
                                    { label: "Dispatched", value: "Dispatched" },
                                    { label: "Completed", value: "Completed" },
                                    { label: "Cancelled", value: "Cancelled" }
                                ]}
                                className="w-[160px] py-1 text-xs"
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-border bg-sidebar/50 text-[11px] font-bold text-muted uppercase">
                                        <th className="py-3 px-4">Trip ID</th>
                                        <th className="py-3 px-4">Vehicle</th>
                                        <th className="py-3 px-4">Driver</th>
                                        <th className="py-3 px-4">Route</th>
                                        <th className="py-3 px-4">Distance</th>
                                        <th className="py-3 px-4">Est. Fuel</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border text-sm">
                                    {trips
                                        .filter(t => statusFilter === "All" || t.status === statusFilter)
                                        .map(t => (
                                            <tr 
                                                key={t.id} 
                                                onClick={() => setSelectedTripId(t.id)}
                                                className={`hover:bg-primary/[0.02] cursor-pointer transition-colors ${selectedTripId === t.id ? 'bg-accent/5 font-medium' : ''}`}
                                            >
                                                <td className="py-3 px-4 font-mono text-accent text-xs font-bold">TR-{String(t.id).substring(0, 6).toUpperCase()}</td>
                                                <td className="py-3 px-4 text-secondary font-medium">{t.registration_no || "—"}</td>
                                                <td className="py-3 px-4 text-secondary">{t.driver_name || "—"}</td>
                                                <td className="py-3 px-4 text-secondary text-xs">{t.source} → {t.destination}</td>
                                                <td className="py-3 px-4 text-secondary">{t.planned_distance} km</td>
                                                <td className="py-3 px-4 text-amber-400 font-medium">{t.estimated_fuel_liters || "—"} L</td>
                                                <td className="py-3 px-4"><Badge status={t.status}>{t.status}</Badge></td>
                                                <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                    {t.status === "Dispatched" && (
                                                        <Button 
                                                            variant="secondary" 
                                                            className="text-xs py-1 px-2.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                                                            onClick={() => handleOpenCompleteModal(t)}
                                                        >
                                                            Complete Trip
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    {trips.length === 0 && (
                                        <tr><td colSpan={8} className="py-8 text-center text-muted text-xs">No trips found in dispatch board.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

            </div>

            {/* Complete Trip Modal */}
            <Modal
                isOpen={isCompleteModalOpen}
                onClose={() => setIsCompleteModalOpen(false)}
                title="Complete Trip & Record Actual Metrics"
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="secondary" onClick={() => setIsCompleteModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCompleteTrip} disabled={completeLoading}>
                            {completeLoading ? "Completing..." : "Submit & Mark Completed"}
                        </Button>
                    </div>
                }
            >
                <form onSubmit={handleCompleteTrip} className="space-y-4">
                    {completeError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold rounded-xl">
                            {completeError}
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input 
                            label="Actual Distance (km)" 
                            type="number" 
                            value={completeForm.actual_distance} 
                            onChange={(e) => handleActualDistanceChange(e.target.value)} 
                            required 
                        />
                        <Input 
                            label="Final Odometer Reading (km)" 
                            type="number" 
                            value={completeForm.final_odometer} 
                            onChange={(e) => handleFinalOdometerChange(e.target.value)} 
                            required 
                        />
                        <Input 
                            label="Actual Fuel Consumed (litres)" 
                            type="number" 
                            value={completeForm.actual_fuel_consumed} 
                            onChange={(e) => setCompleteForm({ ...completeForm, actual_fuel_consumed: e.target.value })} 
                            required 
                        />
                        <div>
                            <Input 
                                label="Trip Revenue (₹)" 
                                type="number" 
                                value={completeForm.revenue} 
                                onChange={(e) => setCompleteForm({ ...completeForm, revenue: e.target.value })} 
                                placeholder="Auto-calculated (₹50/km)"
                            />
                            <p className="text-[10px] text-accent font-medium mt-1 flex items-center gap-1">
                                ⚡ Auto-calculated based on ₹50/km freight rate (editable)
                            </p>
                        </div>
                        <Input 
                            label="Total Toll Amount (₹)" 
                            type="number" 
                            value={completeForm.toll_amount} 
                            onChange={(e) => setCompleteForm({ ...completeForm, toll_amount: e.target.value })} 
                            placeholder="e.g. 450"
                        />
                    </div>
                </form>
            </Modal>

        </div>
    );
};

export default Trips;