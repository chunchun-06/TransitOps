import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
    HiOutlineArrowLeft, HiOutlineTruck, HiOutlineUser, HiOutlineCamera, 
    HiOutlineCalendar, HiOutlineCurrencyRupee, HiOutlineSwitchHorizontal, 
    HiOutlineMap, HiOutlineCog, HiOutlineBeaker, HiOutlineCheck, HiOutlineExclamation
} from "react-icons/hi";
import { 
    getVehicleById, updateVehicleStatus, assignDriverToVehicle, uploadVehiclePhoto 
} from "../../api/vehicle.api";
import { getAvailableDrivers } from "../../api/driver.api";
import { Badge, Button } from "../../components/common";

const VehicleDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [vehicle, setVehicle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [availableDrivers, setAvailableDrivers] = useState([]);
    const [selectedDriverId, setSelectedDriverId] = useState("");
    const [assigningDriver, setAssigningDriver] = useState(false);

    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [activeTab, setActiveTab] = useState("trips"); // trips, maintenance, fuel

    const fetchVehicleDetails = async () => {
        try {
            setLoading(true);
            const res = await getVehicleById(id);
            setVehicle(res.data);
            if (res.data?.current_driver_id) {
                setSelectedDriverId(res.data.current_driver_id);
            } else {
                setSelectedDriverId("");
            }
        } catch (err) {
            console.error("Fetch vehicle error:", err);
            setError(err.response?.data?.message || "Vehicle not found");
        } finally {
            setLoading(false);
        }
    };

    const fetchDriversList = async () => {
        try {
            const res = await getAvailableDrivers();
            setAvailableDrivers(res.data || []);
        } catch (err) {
            console.error("Fetch available drivers error:", err);
        }
    };

    useEffect(() => {
        fetchVehicleDetails();
        fetchDriversList();
    }, [id]);

    const handleToggleStatus = async () => {
        if (!vehicle) return;
        const isRetiredOrInactive = vehicle.status === "Retired" || vehicle.status === "Inactive";
        const nextStatus = isRetiredOrInactive ? "Available" : "Retired";
        const promptMsg = isRetiredOrInactive
            ? `Reactivate vehicle ${vehicle.registration_no}?`
            : `Retire vehicle ${vehicle.registration_no}? (Sets status to Retired while preserving all history)`;
        
        if (!window.confirm(promptMsg)) return;

        try {
            await updateVehicleStatus(vehicle.id, nextStatus);
            fetchVehicleDetails();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update status");
        }
    };

    const handleAssignDriver = async (e) => {
        e.preventDefault();
        try {
            setAssigningDriver(true);
            const targetId = (selectedDriverId && selectedDriverId !== 'null' && selectedDriverId !== '') ? selectedDriverId : null;
            await assignDriverToVehicle(id, targetId);
            await fetchVehicleDetails();
            await fetchDriversList();
            alert("Driver assignment updated successfully!");
        } catch (err) {
            alert(err.response?.data?.message || err.message || "Failed to assign driver");
        } finally {
            setAssigningDriver(false);
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("photo", file);

        try {
            setUploadingPhoto(true);
            const res = await uploadVehiclePhoto(id, formData);
            if (res.data?.photo_url) {
                setVehicle(prev => ({ ...prev, photo_url: res.data.photo_url }));
            }
            alert("Photo uploaded successfully!");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to upload photo");
        } finally {
            setUploadingPhoto(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-secondary">
                <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-medium">Loading Vehicle Details...</p>
            </div>
        );
    }

    if (error || !vehicle) {
        return (
            <div className="p-8 text-center bg-card border border-border rounded-2xl max-w-lg mx-auto mt-10 space-y-4">
                <HiOutlineExclamation className="w-12 h-12 text-warning mx-auto" />
                <h2 className="text-xl font-bold text-primary">Vehicle Not Found</h2>
                <p className="text-sm text-secondary">{error}</p>
                <Button onClick={() => navigate("/vehicles")} className="mx-auto">
                    <HiOutlineArrowLeft className="w-4 h-4" /> Back to Vehicles
                </Button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up space-y-6 max-w-[1600px] mx-auto text-primary">
            
            {/* Top Navigation */}
            <div className="flex items-center justify-between">
                <button 
                    onClick={() => navigate("/vehicles")} 
                    className="flex items-center gap-2 text-sm font-semibold text-secondary hover:text-accent transition-colors"
                >
                    <HiOutlineArrowLeft className="w-4 h-4" /> Back to Vehicles
                </button>
                <div className="flex items-center gap-3">
                    <Button 
                        variant={vehicle.status === "Inactive" ? "default" : "secondary"}
                        onClick={handleToggleStatus}
                        className="flex items-center gap-2 text-xs"
                    >
                        <HiOutlineSwitchHorizontal className="w-4 h-4" />
                        {vehicle.status === "Inactive" ? "Reactivate Vehicle" : "Deactivate Vehicle"}
                    </Button>
                </div>
            </div>

            {/* Vehicle Hero Header Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                
                {/* Left: Photo Preview & Uploader */}
                <div className="relative group rounded-xl overflow-hidden bg-sidebar border border-border h-48 flex items-center justify-center">
                    {vehicle.photo_url ? (
                        <img src={vehicle.photo_url} alt={vehicle.registration_no} className="w-full h-full object-cover" />
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-muted">
                            <HiOutlineTruck className="w-12 h-12 stroke-1" />
                            <span className="text-xs font-semibold">No Vehicle Photo</span>
                        </div>
                    )}
                    
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 text-white cursor-pointer transition-opacity backdrop-blur-xs">
                        <HiOutlineCamera className="w-6 h-6" />
                        <span className="text-xs font-bold">{uploadingPhoto ? "Uploading..." : "Upload / Change Photo"}</span>
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploadingPhoto} className="hidden" />
                    </label>
                </div>

                {/* Center: Vehicle Info */}
                <div className="space-y-3 lg:col-span-2 flex flex-col justify-center">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-extrabold tracking-tight text-primary">{vehicle.registration_no}</h1>
                                <Badge status={vehicle.status}>{vehicle.status}</Badge>
                            </div>
                            <p className="text-sm font-semibold text-secondary mt-1">{vehicle.vehicle_name} ({vehicle.vehicle_type})</p>
                        </div>

                        <div className="flex items-center gap-4 bg-sidebar px-4 py-2 rounded-xl border border-border">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">Odometer</span>
                                <span className="text-base font-extrabold text-accent">{Number(vehicle.odometer || 0).toLocaleString()} km</span>
                            </div>
                            <div className="w-px h-8 bg-border"></div>
                            <div>
                                <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">Fuel Level</span>
                                <span className="text-base font-extrabold text-emerald-400">{vehicle.current_fuel_level_liters || 0} L</span>
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-muted">
                        Registered vehicle record ID: <span className="font-mono text-secondary">{vehicle.id}</span>
                    </p>
                </div>

            </div>

            {/* Middle Row: Assigned Driver Card & Key Specs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Driver Assignment Card */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                            <HiOutlineUser className="w-4 h-4 text-accent" /> Assigned Driver
                        </h3>
                        {vehicle.current_driver_name && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active Driver</span>
                        )}
                    </div>

                    {vehicle.current_driver_name ? (
                        <div className="bg-sidebar border border-border rounded-xl p-4 space-y-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-bold text-primary">{vehicle.current_driver_name}</p>
                                    <p className="text-xs text-secondary">Phone: {vehicle.current_driver_phone || "—"}</p>
                                    <p className="text-xs text-secondary">License: {vehicle.current_driver_license || "—"}</p>
                                </div>
                                {vehicle.current_driver_id && (
                                    <Link to={`/drivers/${vehicle.current_driver_id}`} className="text-xs font-semibold text-accent hover:underline">
                                        View Profile →
                                    </Link>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-sidebar border border-border rounded-xl p-4 text-center space-y-1">
                            <p className="text-xs text-muted font-medium">No driver currently assigned to this vehicle.</p>
                        </div>
                    )}

                    {/* Driver Change/Assignment Form */}
                    <form onSubmit={handleAssignDriver} className="space-y-3 pt-2">
                        <label className="block text-xs font-semibold text-secondary">Assign / Switch Driver</label>
                        <select 
                            value={selectedDriverId} 
                            onChange={(e) => setSelectedDriverId(e.target.value)}
                            className="form-input border text-xs rounded-xl px-3 py-2 w-full outline-none bg-sidebar text-primary cursor-pointer font-medium"
                        >
                            <option value="">-- No Driver Assigned --</option>
                            {availableDrivers.map(d => (
                                <option key={d.id} value={d.id}>
                                    {d.name} ({d.license_number}) {d.current_vehicle ? `[Assigned: ${d.current_vehicle}]` : '[Unassigned]'}
                                </option>
                            ))}
                        </select>
                        <Button type="submit" disabled={assigningDriver} className="w-full justify-center text-xs py-2">
                            {assigningDriver ? "Saving..." : "Update Driver Assignment"}
                        </Button>
                    </form>
                </div>

                {/* Key Specifications Grid */}
                <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted border-b border-border pb-3">
                        Technical Specifications & Fuel Parameters
                    </h3>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-sidebar p-3.5 rounded-xl border border-border">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Vehicle Type</span>
                            <span className="text-sm font-semibold text-primary">{vehicle.vehicle_type}</span>
                        </div>
                        <div className="bg-sidebar p-3.5 rounded-xl border border-border">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Max Capacity</span>
                            <span className="text-sm font-semibold text-primary">{vehicle.max_load_capacity ? `${vehicle.max_load_capacity} kg` : "—"}</span>
                        </div>
                        <div className="bg-sidebar p-3.5 rounded-xl border border-border">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Fuel Type</span>
                            <span className="text-sm font-semibold text-primary">{vehicle.fuel_type || "Diesel"}</span>
                        </div>
                        <div className="bg-sidebar p-3.5 rounded-xl border border-border">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Efficiency</span>
                            <span className="text-sm font-semibold text-primary">{vehicle.fuel_efficiency_kmpl ? `${vehicle.fuel_efficiency_kmpl} km/L` : "—"}</span>
                        </div>
                        <div className="bg-sidebar p-3.5 rounded-xl border border-border">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Tank Capacity</span>
                            <span className="text-sm font-semibold text-primary">{vehicle.fuel_tank_capacity_liters ? `${vehicle.fuel_tank_capacity_liters} L` : "—"}</span>
                        </div>
                        <div className="bg-sidebar p-3.5 rounded-xl border border-border">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Engine CC</span>
                            <span className="text-sm font-semibold text-primary">{vehicle.engine_cc ? `${vehicle.engine_cc} cc` : "—"}</span>
                        </div>
                        <div className="bg-sidebar p-3.5 rounded-xl border border-border">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Purchase Year</span>
                            <span className="text-sm font-semibold text-primary">{vehicle.purchase_year || "—"}</span>
                        </div>
                        <div className="bg-sidebar p-3.5 rounded-xl border border-border">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Acquisition Cost</span>
                            <span className="text-sm font-semibold text-accent">{vehicle.acquisition_cost ? `₹${Number(vehicle.acquisition_cost).toLocaleString()}` : "—"}</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Bottom Section: Tabs for Trips, Maintenance & Fuel Logs */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                
                {/* Tab Navigation Header */}
                <div className="flex border-b border-border bg-sidebar px-6 pt-4 gap-6">
                    <button 
                        onClick={() => setActiveTab("trips")}
                        className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
                            activeTab === "trips" 
                                ? "border-accent text-accent" 
                                : "border-transparent text-muted hover:text-primary"
                        }`}
                    >
                        <HiOutlineMap className="w-4 h-4" /> Recent Trips ({vehicle.trips?.length || 0})
                    </button>

                    <button 
                        onClick={() => setActiveTab("maintenance")}
                        className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
                            activeTab === "maintenance" 
                                ? "border-accent text-accent" 
                                : "border-transparent text-muted hover:text-primary"
                        }`}
                    >
                        <HiOutlineCog className="w-4 h-4" /> Maintenance History ({vehicle.maintenance?.length || 0})
                    </button>

                    <button 
                        onClick={() => setActiveTab("fuel")}
                        className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
                            activeTab === "fuel" 
                                ? "border-accent text-accent" 
                                : "border-transparent text-muted hover:text-primary"
                        }`}
                    >
                        <HiOutlineBeaker className="w-4 h-4" /> Fuel Records ({vehicle.fuel_logs?.length || 0})
                    </button>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {activeTab === "trips" && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border text-[11px] font-bold text-muted uppercase">
                                        <th className="py-3 px-4">Trip ID</th>
                                        <th className="py-3 px-4">Driver</th>
                                        <th className="py-3 px-4">Route</th>
                                        <th className="py-3 px-4">Distance</th>
                                        <th className="py-3 px-4">Revenue</th>
                                        <th className="py-3 px-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border text-sm">
                                    {vehicle.trips?.map(trip => (
                                        <tr key={trip.id} className="hover:bg-primary/[0.02]">
                                            <td className="py-3 px-4 font-mono font-medium text-accent">TR-{String(trip.id).substring(0, 6).toUpperCase()}</td>
                                            <td className="py-3 px-4 text-secondary">{trip.driver_name || "—"}</td>
                                            <td className="py-3 px-4 text-secondary">{trip.source} → {trip.destination}</td>
                                            <td className="py-3 px-4 text-secondary">{trip.planned_distance || trip.actual_distance || 0} km</td>
                                            <td className="py-3 px-4 font-semibold text-emerald-400">₹{Number(trip.revenue || 0).toLocaleString()}</td>
                                            <td className="py-3 px-4"><Badge status={trip.status}>{trip.status}</Badge></td>
                                        </tr>
                                    ))}
                                    {(!vehicle.trips || vehicle.trips.length === 0) && (
                                        <tr><td colSpan={6} className="py-8 text-center text-muted text-xs">No trip history recorded for this vehicle.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === "maintenance" && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border text-[11px] font-bold text-muted uppercase">
                                        <th className="py-3 px-4">Service Type</th>
                                        <th className="py-3 px-4">Cost</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4">Created Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border text-sm">
                                    {vehicle.maintenance?.map(m => (
                                        <tr key={m.id} className="hover:bg-primary/[0.02]">
                                            <td className="py-3 px-4 font-medium text-primary">{m.service_type || m.description || "General Service"}</td>
                                            <td className="py-3 px-4 text-amber-400 font-semibold">₹{Number(m.cost || 0).toLocaleString()}</td>
                                            <td className="py-3 px-4"><Badge status={m.status}>{m.status}</Badge></td>
                                            <td className="py-3 px-4 text-secondary">{new Date(m.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                    {(!vehicle.maintenance || vehicle.maintenance.length === 0) && (
                                        <tr><td colSpan={4} className="py-8 text-center text-muted text-xs">No maintenance records found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === "fuel" && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border text-[11px] font-bold text-muted uppercase">
                                        <th className="py-3 px-4">Liters</th>
                                        <th className="py-3 px-4">Price / L</th>
                                        <th className="py-3 px-4">Total Cost</th>
                                        <th className="py-3 px-4">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border text-sm">
                                    {vehicle.fuel_logs?.map(f => (
                                        <tr key={f.id} className="hover:bg-primary/[0.02]">
                                            <td className="py-3 px-4 font-medium text-primary">{f.fuel_amount || f.fuel_quantity || f.liters || 0} L</td>
                                            <td className="py-3 px-4 text-secondary">₹{f.price_per_liter || "—"}</td>
                                            <td className="py-3 px-4 text-emerald-400 font-semibold">₹{Number(f.cost || f.total_cost || 0).toLocaleString()}</td>
                                            <td className="py-3 px-4 text-secondary">{new Date(f.created_at || f.fuel_date).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                    {(!vehicle.fuel_logs || vehicle.fuel_logs.length === 0) && (
                                        <tr><td colSpan={4} className="py-8 text-center text-muted text-xs">No fuel logs found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>

        </div>
    );
};

export default VehicleDetails;
