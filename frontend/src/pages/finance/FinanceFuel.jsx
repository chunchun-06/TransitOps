import { useEffect, useState, useMemo } from "react";
import {
    HiOutlineSearch,
    HiOutlineDownload,
    HiOutlinePrinter,
    HiOutlineChevronDown,
    HiOutlineChevronUp,
} from "react-icons/hi";
import { getFuelLogs } from "../../api/fuel.api";
import { getVehicles } from "../../api/vehicle.api";
import { Select } from "../../components/common";

const FinanceFuel = () => {
    const [logs, setLogs] = useState([]);
    const [vehicles, setVehicles] = useState([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [vehicleFilter, setVehicleFilter] = useState("All");
    const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchData = async () => {
        try {
            const [logsRes, vehiclesRes] = await Promise.all([
                getFuelLogs().catch(() => ({ data: [] })),
                getVehicles().catch(() => ({ data: [] })),
            ]);
            setLogs(logsRes.data || []);
            setVehicles(vehiclesRes.data || []);
        } catch (err) {
            console.error("Fetch fuel error:", err);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSort = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
        setSortConfig({ key, direction });
    };

    const getVehicleName = (id) => vehicles.find(v => v.id === id)?.registration_no || "—";

    const processedLogs = useMemo(() => {
        let filtered = logs.filter((l) => {
            const matchesSearch =
                getVehicleName(l.vehicle_id)?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesVehicle = vehicleFilter === "All" || String(l.vehicle_id) === vehicleFilter;
            return (matchesSearch || !searchTerm) && matchesVehicle;
        });
        filtered.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
        return filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [logs, searchTerm, vehicleFilter, sortConfig, vehicles]);

    const paginatedLogs = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return processedLogs.slice(start, start + itemsPerPage);
    }, [processedLogs, currentPage]);

    const totalPages = Math.ceil(processedLogs.length / itemsPerPage) || 1;
    const totalCost = logs.reduce((sum, l) => sum + Number(l.cost || 0), 0);
    const totalVolume = logs.reduce((sum, l) => sum + Number(l.fuel_amount || 0), 0);

    const formatCurrency = (val) => val ? Number(val).toLocaleString() : "—";
    const formatDate = (dateString) => {
        if (!dateString) return "—";
        const d = new Date(dateString);
        return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    };

    const vehicleOptions = [
        { label: "Vehicle: All", value: "All" },
        ...vehicles.map(v => ({ label: v.registration_no, value: String(v.id) })),
    ];

    const handleExportCSV = () => {
        const headers = ["Vehicle", "Trip ID", "Volume (L)", "Cost", "Date"];
        const rows = processedLogs.map((l) => [
            getVehicleName(l.vehicle_id),
            l.trip_id ? `TR-${String(l.trip_id).substring(0, 5).toUpperCase()}` : "—",
            l.fuel_amount,
            l.cost,
            formatDate(l.date),
        ]);
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "transitops_fuel_report.csv");
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
                    You are viewing fuel records logged by the admin. No edits can be made from this view.
                </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "Total Fill-ups", value: logs.length, color: "text-primary" },
                    { label: "Total Volume", value: `${totalVolume.toFixed(1)} L`, color: "text-info" },
                    { label: "Total Cost", value: `₹${totalCost.toLocaleString()}`, color: "text-accent" },
                    { label: "Avg Cost/Fill", value: logs.length ? `₹${(totalCost / logs.length).toFixed(0)}` : "—", color: "text-secondary" },
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
                        value={vehicleFilter}
                        onChange={(e) => { setVehicleFilter(e.target.value); setCurrentPage(1); }}
                        options={vehicleOptions}
                        className="w-[160px]"
                    />
                    <div className="relative flex-1 min-w-[200px]">
                        <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search vehicle..."
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
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary" onClick={() => handleSort("vehicle_id")}>
                                    Vehicle <SortIcon column="vehicle_id" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Trip ID</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary" onClick={() => handleSort("fuel_amount")}>
                                    Volume (L) <SortIcon column="fuel_amount" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary" onClick={() => handleSort("cost")}>
                                    Cost <SortIcon column="cost" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary" onClick={() => handleSort("date")}>
                                    Date <SortIcon column="date" />
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {paginatedLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted text-sm">No fuel logs found.</td>
                                </tr>
                            ) : (
                                paginatedLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-primary/[0.02] transition-colors">
                                        <td className="px-6 py-4 text-sm font-semibold text-primary">{getVehicleName(log.vehicle_id)}</td>
                                        <td className="px-6 py-4 text-sm text-secondary">{log.trip_id ? `TR-${String(log.trip_id).substring(0, 5).toUpperCase()}` : "—"}</td>
                                        <td className="px-6 py-4 text-sm text-secondary">{log.fuel_amount} L</td>
                                        <td className="px-6 py-4 text-sm font-semibold text-primary">{formatCurrency(log.cost)}</td>
                                        <td className="px-6 py-4 text-sm text-secondary">{formatDate(log.date)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {processedLogs.length > 0 && (
                            <tfoot>
                                <tr className="bg-sidebar border-t border-border">
                                    <td colSpan={2} className="px-6 py-3 text-xs font-bold text-muted uppercase tracking-wider">Filtered Totals</td>
                                    <td className="px-6 py-3 text-sm font-bold text-info">
                                        {processedLogs.reduce((s, l) => s + Number(l.fuel_amount || 0), 0).toFixed(1)} L
                                    </td>
                                    <td className="px-6 py-3 text-sm font-bold text-accent">
                                        {processedLogs.reduce((s, l) => s + Number(l.cost || 0), 0).toLocaleString()}
                                    </td>
                                    <td />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-border bg-sidebar flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
                        <span className="text-xs text-secondary">
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, processedLogs.length)} of {processedLogs.length} entries
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

export default FinanceFuel;
