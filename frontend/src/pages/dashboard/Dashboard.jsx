import { useEffect, useState } from "react";
import { HiOutlineCurrencyRupee, HiOutlineTrendingUp, HiOutlineTrendingDown, HiOutlineTruck, HiOutlineMap, HiOutlineCalendar, HiOutlineUser, HiOutlineBell, HiOutlineCheckCircle, HiOutlineBeaker, HiOutlineRefresh, HiOutlinePlus } from "react-icons/hi";
import { useFleet } from "../../context/FleetContext";
import { useAuth } from "../../context/AuthContext";
import { getDashboardData } from "../../api/dashboard.api";
import { getCurrentFuelPrice, getMarketFuelRates, createFuelPrice } from "../../api/fuel_price.api";

const getStatusClasses = (status) => {
    switch (status) {
        case "On Trip":    return "bg-info/15 text-info";
        case "Completed":  return "bg-success/15 text-success";
        case "Dispatched": return "bg-info/15 text-info";
        case "Draft":      return "bg-secondary/10 text-secondary";
        default:           return "bg-secondary/10 text-secondary";
    }
};

const Dashboard = () => {
    const fleet = useFleet();
    const trips = fleet?.trips || [];
    const vehicles = fleet?.vehicles || [];
    const drivers = fleet?.drivers || [];
    const { user } = useAuth();

    const [dbData, setDbData] = useState(null);
    const [loading, setLoading] = useState(true);

    // ── Fuel Pricing Controller state ──────────────────────────────────────────
    const [marketRates, setMarketRates] = useState(null);
    const [marketLoading, setMarketLoading] = useState(false);
    const [marketFetchedAt, setMarketFetchedAt] = useState(null);
    const [marketFallback, setMarketFallback] = useState(false);

    const fetchMarketRates = async () => {
        setMarketLoading(true);
        try {
            const res = await getMarketFuelRates();
            setMarketRates(res.data?.rates || null);
            setMarketFetchedAt(res.data?.fetched_at || new Date().toISOString());
            setMarketFallback(res.data?.fallback || false);
        } catch (err) { console.error("Market rates fetch failed:", err); }
        finally { setMarketLoading(false); }
    };

    useEffect(() => {
        const fetchDashboardStats = async () => {
            try {
                const res = await getDashboardData();
                if (res?.data) setDbData(res.data);
            } catch (err) {
                console.error("Error fetching dashboard statistics:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardStats();
        fetchMarketRates();
    }, [trips, vehicles, drivers]);

    // Calculate Active Trip Metrics (Derived from backend dbData with context fallbacks)
    const activeTrips = trips.filter(t => t.status === "Dispatched" || t.status === "In Progress");
    const activeVehiclesCount = dbData?.operational?.on_trip_vehicles ?? vehicles.filter(v => v.status === "On Trip").length;
    const availableVehiclesCount = dbData?.operational?.available_vehicles ?? vehicles.filter(v => v.status === "Available").length;
    const maintenanceVehiclesCount = dbData?.operational?.maintenance_vehicles ?? vehicles.filter(v => v.status === "In Shop").length;
    const activeTripsCount = dbData?.operational?.active_trips ?? activeTrips.length;
    const driversOnDutyCount = dbData?.operational?.on_trip_drivers ?? drivers.filter(d => d.status === "On Trip" || d.status === "Available").length;
    
    const totalVehiclesCount = dbData?.operational?.total_vehicles ?? vehicles.length;
    const vehicleStatusData = [
        { label: "Available", percentage: totalVehiclesCount > 0 ? Math.round(((dbData?.operational?.available_vehicles ?? vehicles.filter(v => v.status === 'Available').length) / totalVehiclesCount) * 100) : 0, bgClass: "bg-success" },
        { label: "On Trip", percentage: totalVehiclesCount > 0 ? Math.round(((dbData?.operational?.on_trip_vehicles ?? vehicles.filter(v => v.status === 'On Trip').length) / totalVehiclesCount) * 100) : 0, bgClass: "bg-info" },
        { label: "In Shop", percentage: totalVehiclesCount > 0 ? Math.round(((dbData?.operational?.maintenance_vehicles ?? vehicles.filter(v => v.status === 'In Shop').length) / totalVehiclesCount) * 100) : 0, bgClass: "bg-warning" },
        { label: "Retired", percentage: totalVehiclesCount > 0 ? Math.round(((dbData?.operational?.retired_vehicles ?? vehicles.filter(v => v.status === 'Retired').length) / totalVehiclesCount) * 100) : 0, bgClass: "bg-danger" },
    ];

    // Roles checking
    const isAdmin = user?.role === "Admin" || user?.role === "Admin User";
    const isFleetManager = user?.role === "Fleet Manager";
    const isFinancial = user?.role === "Financial Analyst";
    const isDispatcher = user?.role === "Dispatcher";

    const pnl = dbData?.financial || {
        today: { revenue: 0, expenses: 0, profit: 0, loss: 0 },
        this_week: { revenue: 0, expenses: 0, profit: 0, loss: 0 },
        this_month: { revenue: 0, expenses: 0, profit: 0, loss: 0 }
    };

    return (
        <div className="animate-fade-in-up space-y-6 max-w-[1600px] mx-auto text-primary">
            
            {/* ── Fuel Pricing Controller ── */}
            <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">

                {/* Header */}
                <div className="relative px-6 py-5 flex items-center justify-between overflow-hidden"
                    style={{background: 'linear-gradient(135deg, #1a1f2e 0%, #0f1420 60%, #1a1208 100%)'}}>
                    {/* Background glow */}
                    <div className="absolute top-0 right-0 w-64 h-full opacity-20"
                        style={{background: 'radial-gradient(ellipse at right, #C98A1C 0%, transparent 70%)'}}></div>

                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 rounded-xl" style={{background: 'rgba(201,138,28,0.15)', border: '1px solid rgba(201,138,28,0.3)'}}>
                            <HiOutlineBeaker className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <h2 className="text-base font-bold text-white">Fuel Pricing Controller</h2>
                                <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    LIVE
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                                Real-time market rates &amp; system base price management
                                {marketFetchedAt && <span className="ml-2 text-slate-500">· Updated {new Date(marketFetchedAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})} IST</span>}
                            </p>
                        </div>
                    </div>

                    <button onClick={fetchMarketRates} disabled={marketLoading}
                        className="relative z-10 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                        style={{background: 'rgba(201,138,28,0.2)', border: '1px solid rgba(201,138,28,0.4)'}}>
                        <HiOutlineRefresh className={`w-3.5 h-3.5 ${marketLoading ? 'animate-spin' : ''}`} />
                        {marketLoading ? 'Fetching...' : 'Refresh Rates'}
                    </button>
                </div>

                <div className="p-6">
                    {/* Market Rate Cards */}
                    <div>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Today's Live Market Rate (Chennai, Tamil Nadu)
                        </p>

                        {marketLoading && !marketRates && (
                            <div className="flex items-center gap-3 text-sm text-muted py-4">
                                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                                Fetching live prices from market APIs...
                            </div>
                        )}
                        {!marketRates && !marketLoading && (
                            <div className="flex items-center gap-2 py-3 text-xs text-muted italic">
                                <HiOutlineRefresh className="w-3.5 h-3.5" /> Click "Refresh Rates" to load live market data
                            </div>
                        )}

                        {marketRates && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    {key:'Diesel',  emoji:'⛽', label:'Diesel',  grad:'from-blue-900/60 to-blue-950/80',   border:'border-blue-500/25', glow:'shadow-blue-500/10',   price:'text-blue-300',  badge:'bg-blue-500/20 text-blue-300'},
                                    {key:'Petrol',  emoji:'🔥', label:'Petrol',  grad:'from-green-900/60 to-green-950/80',  border:'border-green-500/25', glow:'shadow-green-500/10',  price:'text-green-300', badge:'bg-green-500/20 text-green-300'},
                                    {key:'CNG',     emoji:'💨', label:'CNG',     grad:'from-violet-900/60 to-violet-950/80',border:'border-violet-500/25',glow:'shadow-violet-500/10', price:'text-violet-300',badge:'bg-violet-500/20 text-violet-300'},
                                    {key:'Electric',emoji:'⚡', label:'Electric', grad:'from-amber-900/60 to-amber-950/80',  border:'border-amber-500/25', glow:'shadow-amber-500/10',  price:'text-amber-300', badge:'bg-amber-500/20 text-amber-300'},
                                ].map(({key, emoji, label, grad, border, glow, price, badge}) => {
                                    const r = marketRates[key];
                                    return (
                                        <div key={key} className={`bg-gradient-to-br ${grad} ${border} border rounded-2xl p-5 flex flex-col gap-3 shadow-lg ${glow} hover:scale-[1.02] transition-transform cursor-default`}>
                                            <div className="flex items-center justify-between">
                                                <span className="text-2xl">{emoji}</span>
                                                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${badge} border ${border}`}>
                                                    {r?.live ? 'LIVE MARKET' : 'MARKET REF'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">{label}</p>
                                                <p className={`text-3xl font-black ${price} leading-tight`}>
                                                    ₹{r ? parseFloat(r.price).toFixed(2) : '—'}
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-1 font-medium">{r?.unit || 'per litre'}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {marketFallback && (
                            <p className="text-[11px] text-warning mt-3 flex items-center gap-1.5 font-medium">⚠ Live fetch unavailable — showing verified reference rates</p>
                        )}
                    </div>
                </div>
            </div>




            {/* Operational Stats Grid */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1">
                    <HiOutlineTruck className="w-4 h-4 text-accent" /> Fleet Operations Overview
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-card border-l-4 border-l-[#10B981] border-y border-r border-border rounded-xl p-4 flex flex-col justify-between shadow-sm">
                        <span className="text-[10px] text-secondary uppercase tracking-wider font-semibold">Available Vehicles</span>
                        <span className="text-2xl font-bold mt-2">{availableVehiclesCount}</span>
                    </div>
                    <div className="bg-card border-l-4 border-l-[#F59E0B] border-y border-r border-border rounded-xl p-4 flex flex-col justify-between shadow-sm">
                        <span className="text-[10px] text-secondary uppercase tracking-wider font-semibold">In Maintenance</span>
                        <span className="text-2xl font-bold mt-2">{maintenanceVehiclesCount}</span>
                    </div>
                    <div className="bg-card border-l-4 border-l-[#8B5CF6] border-y border-r border-border rounded-xl p-4 flex flex-col justify-between shadow-sm">
                        <span className="text-[10px] text-secondary uppercase tracking-wider font-semibold">Active Trips</span>
                        <span className="text-2xl font-bold mt-2">{activeTripsCount}</span>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                
                {/* Recent Trips Table */}
                <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden flex flex-col shadow-sm">
                    <div className="px-6 py-5 border-b border-border flex justify-between items-center">
                        <h2 className="text-sm font-semibold text-secondary uppercase tracking-widest flex items-center gap-1.5">
                            <HiOutlineMap className="w-4 h-4 text-accent" /> Recent Trips Dispatch
                        </h2>
                        <span className="text-xs text-muted">
                            Total Live Trips: <strong className="text-accent">{activeTripsCount}</strong>
                        </span>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-sidebar">
                                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Trip</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Vehicle</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Driver</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Route Info</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
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
                                            <td className="px-6 py-4 text-sm text-secondary">
                                                {trip.source} → {trip.destination}
                                            </td>
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
                    <h2 className="text-sm font-semibold text-secondary uppercase tracking-widest mb-6">Vehicle Status Breakdown</h2>
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