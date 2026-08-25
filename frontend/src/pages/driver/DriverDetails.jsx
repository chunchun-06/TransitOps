import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
    HiOutlineArrowLeft, HiOutlineUser, HiOutlineCamera, HiOutlineTruck,
    HiOutlineBadgeCheck, HiOutlinePhone, HiOutlineCalendar, HiOutlineSwitchHorizontal,
    HiOutlineMap, HiOutlineExclamation, HiOutlineShieldCheck
} from "react-icons/hi";
import { getDriverById, updateDriverStatus, uploadDriverPhoto } from "../../api/driver.api";
import { Badge, Button } from "../../components/common";

const DriverDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [driver, setDriver] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const fetchDriverDetails = async () => {
        try {
            setLoading(true);
            const res = await getDriverById(id);
            setDriver(res.data);
        } catch (err) {
            console.error("Fetch driver error:", err);
            setError(err.response?.data?.message || "Driver not found");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDriverDetails();
    }, [id]);

    const handleToggleStatus = async () => {
        if (!driver) return;
        const nextStatus = driver.status === "Inactive" ? "Available" : "Inactive";
        const promptMsg = driver.status === "Inactive"
            ? `Reactivate driver ${driver.name}?`
            : `Deactivate driver ${driver.name}? (Sets status to Inactive without losing trip history)`;
        
        if (!window.confirm(promptMsg)) return;

        try {
            await updateDriverStatus(driver.id, nextStatus);
            fetchDriverDetails();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update driver status");
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("photo", file);

        try {
            setUploadingPhoto(true);
            const res = await uploadDriverPhoto(id, formData);
            if (res.data?.photo_url) {
                setDriver(prev => ({ ...prev, photo_url: res.data.photo_url }));
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
                <p className="text-sm font-medium">Loading Driver Profile...</p>
            </div>
        );
    }

    if (error || !driver) {
        return (
            <div className="p-8 text-center bg-card border border-border rounded-2xl max-w-lg mx-auto mt-10 space-y-4">
                <HiOutlineExclamation className="w-12 h-12 text-warning mx-auto" />
                <h2 className="text-xl font-bold text-primary">Driver Not Found</h2>
                <p className="text-sm text-secondary">{error}</p>
                <Button onClick={() => navigate("/drivers")} className="mx-auto">
                    <HiOutlineArrowLeft className="w-4 h-4" /> Back to Drivers
                </Button>
            </div>
        );
    }

    const isExpired = driver.license_expiry && new Date(driver.license_expiry) < new Date();

    return (
        <div className="animate-fade-in-up space-y-6 max-w-[1600px] mx-auto text-primary">
            
            {/* Top Navigation */}
            <div className="flex items-center justify-between">
                <button 
                    onClick={() => navigate("/drivers")} 
                    className="flex items-center gap-2 text-sm font-semibold text-secondary hover:text-accent transition-colors"
                >
                    <HiOutlineArrowLeft className="w-4 h-4" /> Back to Drivers
                </button>
                <div className="flex items-center gap-3">
                    <Button 
                        variant={driver.status === "Inactive" ? "default" : "secondary"}
                        onClick={handleToggleStatus}
                        className="flex items-center gap-2 text-xs"
                    >
                        <HiOutlineSwitchHorizontal className="w-4 h-4" />
                        {driver.status === "Inactive" ? "Reactivate Driver" : "Deactivate Driver"}
                    </Button>
                </div>
            </div>

            {/* Driver Hero Header Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
                
                {/* Photo Avatar with Uploader */}
                <div className="relative group rounded-full overflow-hidden bg-sidebar border-2 border-accent w-28 h-28 shrink-0 flex items-center justify-center">
                    {driver.photo_url ? (
                        <img src={driver.photo_url} alt={driver.name} className="w-full h-full object-cover" />
                    ) : (
                        <HiOutlineUser className="w-14 h-14 text-muted stroke-1" />
                    )}
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity backdrop-blur-xs">
                        <HiOutlineCamera className="w-6 h-6" />
                        <span className="text-[10px] font-bold mt-1">{uploadingPhoto ? "..." : "Upload"}</span>
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploadingPhoto} className="hidden" />
                    </label>
                </div>

                {/* Driver Info Banner */}
                <div className="flex-1 space-y-2 text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <h1 className="text-2xl font-extrabold text-primary">{driver.name}</h1>
                        <Badge status={isExpired ? "Suspended" : driver.status}>
                            {isExpired ? "Expired" : driver.status}
                        </Badge>
                    </div>

                    <p className="text-xs text-secondary flex flex-wrap items-center justify-center md:justify-start gap-4">
                        <span className="flex items-center gap-1"><HiOutlineBadgeCheck className="w-4 h-4 text-accent" /> {driver.license_category || "Commercial"} License</span>
                        <span className="flex items-center gap-1"><HiOutlinePhone className="w-4 h-4 text-accent" /> {driver.contact_number || "No Phone"}</span>
                        <span className="flex items-center gap-1"><HiOutlineCalendar className="w-4 h-4 text-accent" /> Registered Date</span>
                    </p>
                </div>

                {/* Safety Score Card */}
                <div className="bg-sidebar border border-border p-4 rounded-xl text-center min-w-[140px]">
                    <span className="text-[10px] uppercase font-bold text-muted tracking-wider block mb-1">Safety Rating</span>
                    <div className="flex items-center justify-center gap-1">
                        <HiOutlineShieldCheck className="w-5 h-5 text-emerald-400" />
                        <span className="text-2xl font-extrabold text-emerald-400">{driver.safety_score || 100}</span>
                        <span className="text-xs text-muted font-bold">/100</span>
                    </div>
                </div>

            </div>

            {/* Middle Section: Assigned Vehicle & License Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Assigned Vehicle Card */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2 border-b border-border pb-3">
                        <HiOutlineTruck className="w-4 h-4 text-accent" /> Currently Assigned Vehicle
                    </h3>

                    {driver.assigned_vehicle_registration ? (
                        <div className="bg-sidebar border border-border rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                {driver.assigned_vehicle_photo ? (
                                    <img src={driver.assigned_vehicle_photo} alt={driver.assigned_vehicle_registration} className="w-12 h-12 rounded-lg object-cover border border-border shrink-0" />
                                ) : (
                                    <div className="w-12 h-12 rounded-lg bg-card border border-border flex items-center justify-center text-muted shrink-0">
                                        <HiOutlineTruck className="w-6 h-6" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-bold text-primary truncate">{driver.assigned_vehicle_registration}</p>
                                        <Badge status={driver.assigned_vehicle_status}>{driver.assigned_vehicle_status}</Badge>
                                    </div>
                                    <p className="text-xs text-secondary truncate">{driver.assigned_vehicle_name || "Vehicle"}</p>
                                </div>
                            </div>
                            {driver.assigned_vehicle_id && (
                                <Link to={`/vehicles/${driver.assigned_vehicle_id}`} className="text-xs font-semibold text-accent hover:underline block pt-1 border-t border-border">
                                    View Mapped Vehicle Details →
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="bg-sidebar border border-border rounded-xl p-6 text-center text-muted text-xs">
                            This driver is not currently assigned to any vehicle.
                        </div>
                    )}
                </div>

                {/* Driver Credentials Card */}
                <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted border-b border-border pb-3">
                        Driver Credentials & Expiry Status
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-sidebar p-4 rounded-xl border border-border">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">License Number</span>
                            <span className="text-sm font-bold font-mono text-primary">{driver.license_number}</span>
                        </div>
                        <div className="bg-sidebar p-4 rounded-xl border border-border">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">License Expiry</span>
                            <span className={`text-sm font-semibold ${isExpired ? 'text-danger' : 'text-primary'}`}>
                                {driver.license_expiry ? new Date(driver.license_expiry).toLocaleDateString() : "—"}
                                {isExpired && <span className="ml-2 text-xs font-bold text-danger">(EXPIRED)</span>}
                            </span>
                        </div>
                        <div className="bg-sidebar p-4 rounded-xl border border-border">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Contact Phone</span>
                            <span className="text-sm font-semibold text-primary">{driver.contact_number || "—"}</span>
                        </div>
                        <div className="bg-sidebar p-4 rounded-xl border border-border">
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Associated User Email</span>
                            <span className="text-sm font-semibold text-primary">{driver.email || "No User Account Linked"}</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Bottom Section: Recent Trip History */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2 border-b border-border pb-3">
                    <HiOutlineMap className="w-4 h-4 text-accent" /> Recent Trip History ({driver.trips?.length || 0})
                </h3>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border text-[11px] font-bold text-muted uppercase">
                                <th className="py-3 px-4">Trip ID</th>
                                <th className="py-3 px-4">Vehicle</th>
                                <th className="py-3 px-4">Route</th>
                                <th className="py-3 px-4">Distance</th>
                                <th className="py-3 px-4">Revenue</th>
                                <th className="py-3 px-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-sm">
                            {driver.trips?.map(trip => (
                                <tr key={trip.id} className="hover:bg-primary/[0.02]">
                                    <td className="py-3 px-4 font-mono font-medium text-accent">TR-{String(trip.id).substring(0, 6).toUpperCase()}</td>
                                    <td className="py-3 px-4 text-secondary">{trip.registration_no || "—"}</td>
                                    <td className="py-3 px-4 text-secondary">{trip.source} → {trip.destination}</td>
                                    <td className="py-3 px-4 text-secondary">{trip.planned_distance || trip.actual_distance || 0} km</td>
                                    <td className="py-3 px-4 font-semibold text-emerald-400">₹{Number(trip.revenue || 0).toLocaleString()}</td>
                                    <td className="py-3 px-4"><Badge status={trip.status}>{trip.status}</Badge></td>
                                </tr>
                            ))}
                            {(!driver.trips || driver.trips.length === 0) && (
                                <tr><td colSpan={6} className="py-8 text-center text-muted text-xs">No trip history recorded for this driver.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default DriverDetails;
