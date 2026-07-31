import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { HiOutlineFilter } from "react-icons/hi";
import { getDashboardStats } from "../../api/report.api";
import { getVehicles } from "../../api/vehicle.api";
import { getDrivers } from "../../api/driver.api";
import { getTrips } from "../../api/trip.api";

const getStatusClasses = (status) => {
    switch (status) {
        case "On Trip": return "bg-info text-primary";
        case "Completed": return "bg-success text-primary";
        case "Dispatched": return "bg-info text-[#111111]";
        case "Draft": return "bg-[#4B5563] text-primary";
        default: return "bg-[#4B5563] text-primary";
    }
};

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [trips, setTrips] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [statsRes, tripsRes, vehiclesRes, driversRes] = await Promise.all([
                    getDashboardStats().catch(() => null),
                    getTrips().catch(() => ({ data: [] })),
                    getVehicles().catch(() => ({ data: [] })),
                    getDrivers().catch(() => ({ data: [] }))
                ]);
                if (statsRes) setStats(statsRes.data);
                setTrips(tripsRes.data || []);
                setVehicles(vehiclesRes.data || []);
                setDrivers(driversRes.data || []);
            } catch (err) {
                console.error("Error fetching dashboard data:", err);
            }
        };
        fetchDashboardData();
    }, []);

    const activeVehiclesCount = vehicles.filter(v => v.status === "On Trip").length;
    const availableVehiclesCount = vehicles.filter(v => v.status === "Available").length;
    const maintenanceVehiclesCount = vehicles.filter(v => v.status === "In Shop").length;
    const activeTripsCount = trips.filter(t => t.status === "Dispatched" || t.status === "In Progress").length;
    const pendingTripsCount = trips.filter(t => t.status === "Draft").length;
    const driversOnDutyCount = drivers.filter(d => d.status === "On Trip" || d.status === "Available").length;
    const fleetUtilizationRate = stats?.fleet_utilization ?? (vehicles.length > 0 ? Math.round((activeVehiclesCount / vehicles.length) * 100) : 0);

    const statsList = [
        { label: "ACTIVE VEHICLES", value: activeVehiclesCount, borderClass: "border-l-[#3B82F6]" },
        { label: "AVAILABLE VEHICLES", value: availableVehiclesCount, borderClass: "border-l-[#10B981]" },
        { label: "VEHICLES IN MAINTENANCE", value: maintenanceVehiclesCount, borderClass: "border-l-[#F59E0B]" },
        { label: "ACTIVE TRIPS", value: activeTripsCount, borderClass: "border-l-[#3B82F6]" },
        { label: "PENDING TRIPS", value: pendingTripsCount, borderClass: "border-l-[#60A5FA]" },
        { label: "DRIVERS ON DUTY", value: driversOnDutyCount, borderClass: "border-l-[#60A5FA]" },
        { label: "FLEET UTILIZATION", value: `${fleetUtilizationRate}%`, borderClass: "border-l-[#10B981]" },
    ];

    const totalVehiclesCount = vehicles.length;
    const vehicleStatusData = [
        { label: "Available", percentage: totalVehiclesCount > 0 ? Math.round((vehicles.filter(v => v.status === 'Available').length / totalVehiclesCount) * 100) : 0, bgClass: "bg-success" },
        { label: "On Trip", percentage: totalVehiclesCount > 0 ? Math.round((vehicles.filter(v => v.status === 'On Trip').length / totalVehiclesCount) * 100) : 0, bgClass: "bg-info" },
        { label: "In Shop", percentage: totalVehiclesCount > 0 ? Math.round((vehicles.filter(v => v.status === 'In Shop').length / totalVehiclesCount) * 100) : 0, bgClass: "bg-warning" },
        { label: "Retired", percentage: totalVehiclesCount > 0 ? Math.round((vehicles.filter(v => v.status === 'Retired').length / totalVehiclesCount) * 100) : 0, bgClass: "bg-[#F87171]" },
    ];

    return (
        <div className="animate-fade-in-up space-y-6 max-w-[1600px] mx-auto text-primary">
            
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 mb-2">
                <span className="text-xs text-muted uppercase tracking-widest font-semibold flex items-center gap-1.5 mr-2">
                    <HiOutlineFilter className="w-4 h-4" /> Filters
                </span>
                <select className="form-input border text-sm rounded-lg px-4 py-2 outline-none appearance-none cursor-pointer min-w-[160px]">
                    <option>Vehicle Type: All</option>
                    <option>Van</option>
                    <option>Truck</option>
                    <option>Mini</option>
                </select>
                <select className="form-input border text-sm rounded-lg px-4 py-2 outline-none appearance-none cursor-pointer min-w-[160px]">
                    <option>Status: All</option>
                    <option>Available</option>
                    <option>On Trip</option>
                    <option>In Shop</option>
                </select>
                <select className="form-input border text-sm rounded-lg px-4 py-2 outline-none appearance-none cursor-pointer min-w-[160px]">
                    <option>Region: All</option>
                    <option>North</option>
                    <option>South</option>
                </select>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {statsList.map((stat, i) => (
                    <div 
                        key={i} 
                        className={`bg-card border-y border-r border-l-4 border-border ${stat.borderClass} rounded-xl p-4 flex flex-col justify-between shadow-sm hover:brightness-110 transition-all duration-200`}
                    >
                        <p className="text-[10px] text-secondary uppercase tracking-wider font-semibold mb-3 leading-tight">
                            {stat.label}
                        </p>
                        <p className="text-2xl font-bold text-primary">
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                
                {/* Recent Trips Table */}
                <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden flex flex-col shadow-sm">
                    <div className="px-6 py-5 border-b border-border">
                        <h2 className="text-sm font-semibold text-secondary uppercase tracking-widest">Recent Trips</h2>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-sidebar">
                                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Trip</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Vehicle</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Driver</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">ETA</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2B3038]">
                                {trips.slice(0, 5).map((trip) => {
                                    const v = vehicles.find(veh => veh.id === trip.vehicle_id);
                                    const d = drivers.find(drv => drv.id === trip.driver_id);
                                    return (
                                        <tr key={trip.id} className="hover:bg-primary/[0.02] transition-colors">
                                            <td className="px-6 py-4 text-sm text-secondary font-medium">TR-{String(trip.id).substring(0, 5).toUpperCase()}</td>
                                            <td className="px-6 py-4 text-sm text-secondary">{v ? v.registration_no : "—"}</td>
                                            <td className="px-6 py-4 text-sm text-secondary">{d ? d.name : "—"}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md inline-block ${getStatusClasses(trip.status)}`}>
                                                    {trip.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-secondary">{trip.status === 'Dispatched' ? 'In Transit' : '—'}</td>
                                        </tr>
                                    );
                                })}
                                {trips.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-muted text-sm">No trips found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Vehicle Status */}
                <div className="bg-card border border-border rounded-2xl p-6 flex flex-col shadow-sm">
                    <h2 className="text-sm font-semibold text-secondary uppercase tracking-widest mb-6">Vehicle Status</h2>
                    <div className="space-y-6 flex-1 flex flex-col justify-center py-4">
                        {vehicleStatusData.map((status, i) => (
                            <div key={i}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-secondary font-medium">{status.label}</span>
                                    <span className="text-xs text-muted font-semibold">{status.percentage}%</span>
                                </div>
                                <div className="w-full bg-sidebar rounded-full h-3.5 border border-border overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ease-out ${status.bgClass}`}
                                        style={{ width: `${status.percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;