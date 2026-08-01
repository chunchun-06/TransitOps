import { useEffect, useState, useMemo } from "react";
import {
    HiOutlineSearch,
    HiOutlineDownload,
    HiOutlinePrinter,
    HiOutlineChevronDown,
    HiOutlineChevronUp,
    HiOutlineArrowRight,
} from "react-icons/hi";
import { getTrips } from "../../api/trip.api";
import { getVehicles } from "../../api/vehicle.api";
import { getDrivers } from "../../api/driver.api";
import { Select, Badge } from "../../components/common";

const FinanceTrips = () => {
    const [trips, setTrips] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [sortConfig, setSortConfig] = useState({ key: "created_at", direction: "desc" });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchData = async () => {
        try {
            const [tripsRes, vehiclesRes, driversRes] = await Promise.all([
                getTrips().catch(() => ({ data: [] })),
                getVehicles().catch(() => ({ data: [] })),
                getDrivers().catch(() => ({ data: [] })),
            ]);
            setTrips(tripsRes.data || []);
            setVehicles(vehiclesRes.data || []);
            setDrivers(driversRes.data || []);
        } catch (err) {
            console.error("Fetch trips error:", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSort = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
        setSortConfig({ key, direction });
    };

    const getVehicleName = (id) => vehicles.find(v => v.id === id)?.registration_no || "—";
    const getDriverName = (id) => drivers.find(d => d.id === id)?.name || "—";

    const processedTrips = useMemo(() => {
        let filtered = trips.filter((t) => {
            const matchesSearch =
                t.source?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.destination?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === "All" || t.status === statusFilter;
            return (matchesSearch || !searchTerm) && matchesStatus;
        });

        filtered.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
        return filtered;
    }, [trips, searchTerm, statusFilter, sortConfig]);

    const paginatedTrips = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return processedTrips.slice(start, start + itemsPerPage);
    }, [processedTrips, currentPage]);

    const totalPages = Math.ceil(processedTrips.length / itemsPerPage) || 1;

    const handleExportCSV = () => {
        const headers = ["Trip ID", "Source", "Destination", "Vehicle", "Driver", "Cargo (kg)", "Distance (km)", "Status"];
        const rows = processedTrips.map((t) => [
            `TR-${String(t.id).substring(0, 5).toUpperCase()}`,
            `"${t.source}"`,
            `"${t.destination}"`,
            getVehicleName(t.vehicle_id),
            `"${getDriverName(t.driver_id)}"`,
            t.cargo_weight || 0,
            t.planned_distance || 0,
            t.status,
        ]);
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "transitops_trips_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return <HiOutlineChevronDown className="w-3 h-3 opacity-30 inline ml-1" />;
        return sortConfig.direction === "asc"
            ? <HiOutlineChevronUp className="w-3 h-3 text-accent inline ml-1" />
            : <HiOutlineChevronDown className="w-3 h-3 text-accent inline ml-1" />;
    };

    return (
        <div className="animate-fade-in-up space-y-6 max-w-[1600px] mx-auto text-primary">

            {/* Read-Only Banner */}
            <div className="bg-info/10 border border-info/20 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-info text-xs font-bold uppercase tracking-wider">📋 View-Only Mode</span>
                <span className="text-xs text-secondary">
                    You are viewing trip records dispatched by the admin. No edits can be made from this view.
                </span>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "Total Trips", value: trips.length, color: "text-primary" },
                    { label: "Dispatched", value: trips.filter(t => t.status === "Dispatched").length, color: "text-info" },
                    { label: "Completed", value: trips.filter(t => t.status === "Completed").length, color: "text-success" },
                    { label: "Cancelled", value: trips.filter(t => t.status === "Cancelled").length, color: "text-danger" },
                ].map(stat => (
                    <div key={stat.label} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                        <p className="text-xs text-muted uppercase tracking-wider font-bold mb-1">{stat.label}</p>
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Top Bar */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm print:hidden">
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    <Select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                        options={[
                            { label: "Status: All", value: "All" },
                            { label: "Draft", value: "Draft" },
                            { label: "Dispatched", value: "Dispatched" },
                            { label: "Completed", value: "Completed" },
                            { label: "Cancelled", value: "Cancelled" },
                        ]}
                        className="w-[160px]"
                    />
                    <div className="relative flex-1 min-w-[200px]">
                        <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search source or destination..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="form-input border text-sm rounded-lg pl-10 pr-4 py-2.5 outline-none transition-colors w-full"
                        />
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-secondary hover:text-primary hover:bg-primary/5 text-sm font-medium transition-colors">
                        <HiOutlineDownload className="w-4 h-4" /> Export CSV
                    </button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-secondary hover:text-primary hover:bg-primary/5 text-sm font-medium transition-colors">
                        <HiOutlinePrinter className="w-4 h-4" /> Print
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-border bg-sidebar">
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Trip ID</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary" onClick={() => handleSort("source")}>
                                    Route <SortIcon column="source" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Vehicle</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Driver</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary" onClick={() => handleSort("cargo_weight")}>
                                    Cargo (kg) <SortIcon column="cargo_weight" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary" onClick={() => handleSort("planned_distance")}>
                                    Distance (km) <SortIcon column="planned_distance" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary" onClick={() => handleSort("status")}>
                                    Status <SortIcon column="status" />
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {paginatedTrips.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-muted text-sm">
                                        No trips found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedTrips.map((trip) => (
                                    <tr key={trip.id} className="hover:bg-primary/[0.02] transition-colors">
                                        <td className="px-6 py-4 text-sm font-bold text-accent">
                                            TR-{String(trip.id).substring(0, 5).toUpperCase()}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="flex items-center gap-2 text-secondary font-medium">
                                                <span>{trip.source}</span>
                                                <HiOutlineArrowRight className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                                                <span>{trip.destination}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary">{getVehicleName(trip.vehicle_id)}</td>
                                        <td className="px-6 py-4 text-sm text-secondary">{getDriverName(trip.driver_id)}</td>
                                        <td className="px-6 py-4 text-sm text-secondary">{trip.cargo_weight ? `${trip.cargo_weight} kg` : "—"}</td>
                                        <td className="px-6 py-4 text-sm text-secondary">{trip.planned_distance ? `${trip.planned_distance} km` : "—"}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <Badge status={trip.status}>{trip.status}</Badge>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-border bg-sidebar flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
                        <span className="text-xs text-secondary">
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, processedTrips.length)} of {processedTrips.length} entries
                        </span>
                        <div className="flex gap-2">
                            <button className="px-3 py-1 text-xs rounded-lg border border-border bg-card text-secondary hover:text-primary transition-colors disabled:opacity-40" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
                            <span className="px-3 py-1 text-xs text-primary bg-border rounded-md border border-border">{currentPage} / {totalPages}</span>
                            <button className="px-3 py-1 text-xs rounded-lg border border-border bg-card text-secondary hover:text-primary transition-colors disabled:opacity-40" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinanceTrips;
