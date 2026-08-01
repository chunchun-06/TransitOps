import { useEffect, useState, useMemo } from "react";
import {
    HiOutlineSearch,
    HiOutlineDownload,
    HiOutlinePrinter,
    HiOutlineChevronDown,
    HiOutlineChevronUp,
    HiOutlineUser,
    HiX,
} from "react-icons/hi";
import { getDrivers } from "../../api/driver.api";
import { Select, Badge } from "../../components/common";

const FinanceDrivers = () => {
    const [drivers, setDrivers] = useState([]);

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");

    // Sorting
    const [sortConfig, setSortConfig] = useState({ key: "created_at", direction: "desc" });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Details drawer
    const [selectedDriver, setSelectedDriver] = useState(null);

    const fetchDrivers = async () => {
        try {
            const res = await getDrivers();
            setDrivers(res.data || []);
        } catch (err) {
            console.error("Fetch drivers error:", err);
        }
    };

    useEffect(() => {
        fetchDrivers();
    }, []);

    const handleSort = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
        setSortConfig({ key, direction });
    };

    const processedDrivers = useMemo(() => {
        let filtered = drivers.filter((d) => {
            const matchesSearch =
                d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.license_number?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === "All" || d.license_category === categoryFilter;
            const matchesStatus = statusFilter === "All" || d.status === statusFilter;
            return (matchesSearch || !searchTerm) && matchesCategory && matchesStatus;
        });

        filtered.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
        return filtered;
    }, [drivers, searchTerm, categoryFilter, statusFilter, sortConfig]);

    const paginatedDrivers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return processedDrivers.slice(start, start + itemsPerPage);
    }, [processedDrivers, currentPage]);

    const totalPages = Math.ceil(processedDrivers.length / itemsPerPage) || 1;

    const handleExportCSV = () => {
        const headers = ["ID", "Name", "License No", "Category", "Phone", "Safety Score", "Status", "Expiry Date"];
        const rows = processedDrivers.map((d) => [
            d.id,
            `"${d.name}"`,
            d.license_number,
            d.license_category,
            d.contact_number,
            d.safety_score,
            d.status,
            d.license_expiry ? new Date(d.license_expiry).toLocaleDateString() : "—",
        ]);
        let csvContent =
            "data:text/csv;charset=utf-8," +
            headers.join(",") +
            "\n" +
            rows.map((e) => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "transitops_drivers_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column)
            return <HiOutlineChevronDown className="w-3 h-3 opacity-30 inline ml-1" />;
        return sortConfig.direction === "asc" ? (
            <HiOutlineChevronUp className="w-3 h-3 text-accent inline ml-1" />
        ) : (
            <HiOutlineChevronDown className="w-3 h-3 text-accent inline ml-1" />
        );
    };

    return (
        <div className="animate-fade-in-up space-y-6 max-w-[1600px] mx-auto text-primary">

            {/* Read-Only Banner */}
            <div className="bg-info/10 border border-info/20 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-info text-xs font-bold uppercase tracking-wider">📋 View-Only Mode</span>
                <span className="text-xs text-secondary">
                    You are viewing driver records registered by the admin. No edits can be made from this view.
                </span>
            </div>

            {/* Top Bar */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm print:hidden">
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    <Select
                        value={categoryFilter}
                        onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                        options={[
                            { label: "Category: All", value: "All" },
                            { label: "Commercial", value: "Commercial" },
                            { label: "Heavy Duty", value: "Heavy Duty" },
                            { label: "Standard", value: "Standard" },
                        ]}
                        className="w-[150px]"
                    />
                    <Select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                        options={[
                            { label: "Status: All", value: "All" },
                            { label: "Available", value: "Available" },
                            { label: "On Trip", value: "On Trip" },
                            { label: "Off Duty", value: "Off Duty" },
                            { label: "Suspended", value: "Suspended" },
                        ]}
                        className="w-[140px]"
                    />
                    <div className="relative flex-1 min-w-[200px]">
                        <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search name or license..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="form-input border text-sm rounded-lg pl-10 pr-4 py-2.5 outline-none transition-colors w-full"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-secondary hover:text-primary hover:bg-primary/5 text-sm font-medium transition-colors"
                        title="Export CSV"
                    >
                        <HiOutlineDownload className="w-4 h-4" /> Export CSV
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-secondary hover:text-primary hover:bg-primary/5 text-sm font-medium transition-colors"
                        title="Print"
                    >
                        <HiOutlinePrinter className="w-4 h-4" /> Print
                    </button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "Total Drivers", value: drivers.length, color: "text-primary" },
                    { label: "Available", value: drivers.filter(d => d.status === "Available").length, color: "text-success" },
                    { label: "On Trip", value: drivers.filter(d => d.status === "On Trip").length, color: "text-info" },
                    { label: "Off Duty / Suspended", value: drivers.filter(d => d.status === "Off Duty" || d.status === "Suspended").length, color: "text-warning" },
                ].map(stat => (
                    <div key={stat.label} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                        <p className="text-xs text-muted uppercase tracking-wider font-bold mb-1">{stat.label}</p>
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-border bg-sidebar">
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort("name")}>
                                    Driver Name <SortIcon column="name" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort("license_number")}>
                                    License No. <SortIcon column="license_number" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort("license_category")}>
                                    Category <SortIcon column="license_category" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Phone</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort("safety_score")}>
                                    Safety Score <SortIcon column="safety_score" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort("license_expiry")}>
                                    Expiry Date <SortIcon column="license_expiry" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort("status")}>
                                    Status <SortIcon column="status" />
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {paginatedDrivers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-muted text-sm">
                                        No drivers found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedDrivers.map((driver) => {
                                    const isExpired = driver.license_expiry && new Date(driver.license_expiry) < new Date();
                                    return (
                                        <tr
                                            key={driver.id}
                                            className="hover:bg-primary/[0.02] transition-colors cursor-pointer"
                                            onClick={() => setSelectedDriver(driver)}
                                        >
                                            <td className="px-6 py-4 text-sm font-semibold text-accent hover:underline">{driver.name}</td>
                                            <td className="px-6 py-4 text-sm text-primary">{driver.license_number}</td>
                                            <td className="px-6 py-4 text-sm text-secondary">{driver.license_category || "—"}</td>
                                            <td className="px-6 py-4 text-sm text-secondary">{driver.contact_number || "—"}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${Number(driver.safety_score) >= 90 ? "bg-success/10 text-success" : Number(driver.safety_score) >= 70 ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger"}`}>
                                                    {driver.safety_score}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={isExpired ? "text-danger font-semibold" : "text-secondary"}>
                                                    {driver.license_expiry ? new Date(driver.license_expiry).toLocaleDateString() : "—"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <Badge status={isExpired ? "Suspended" : driver.status}>{isExpired ? "Expired" : driver.status}</Badge>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-border bg-sidebar flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
                        <span className="text-xs text-secondary">
                            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                            {Math.min(currentPage * itemsPerPage, processedDrivers.length)} of {processedDrivers.length} entries
                        </span>
                        <div className="flex gap-2">
                            <button
                                className="px-3 py-1 text-xs rounded-lg border border-border bg-card text-secondary hover:text-primary transition-colors disabled:opacity-40"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                Prev
                            </button>
                            <span className="px-3 py-1 text-xs text-primary bg-border rounded-md border border-border">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                className="px-3 py-1 text-xs rounded-lg border border-border bg-card text-secondary hover:text-primary transition-colors disabled:opacity-40"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Drawer (read-only) */}
            {selectedDriver && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setSelectedDriver(null)} />
                    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-sidebar border-l border-border shadow-2xl z-50 flex flex-col">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0 bg-card">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
                                    <HiOutlineUser className="w-7 h-7" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-lg text-primary leading-tight">{selectedDriver.name}</h2>
                                    <p className="text-xs text-muted mt-0.5">Driver Profile</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedDriver(null)} className="p-2 text-muted hover:text-primary bg-border/50 hover:bg-border rounded-full transition-colors">
                                <HiX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest border-b border-border pb-2">Status & Contact</h3>
                                <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border">
                                    <span className="text-sm text-secondary">Current Status</span>
                                    <Badge status={selectedDriver.status}>{selectedDriver.status}</Badge>
                                </div>
                                <div className="bg-card p-4 rounded-xl border border-border">
                                    <p className="text-xs text-muted mb-1">Phone Number</p>
                                    <p className="text-sm font-semibold text-primary">{selectedDriver.contact_number || "—"}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest border-b border-border pb-2">License Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-card p-4 rounded-xl border border-border">
                                        <p className="text-xs text-muted mb-1">License No.</p>
                                        <p className="text-sm font-semibold text-primary">{selectedDriver.license_number}</p>
                                    </div>
                                    <div className="bg-card p-4 rounded-xl border border-border">
                                        <p className="text-xs text-muted mb-1">Category</p>
                                        <p className="text-sm font-semibold text-primary">{selectedDriver.license_category || "—"}</p>
                                    </div>
                                    <div className="bg-card p-4 rounded-xl border border-border col-span-2">
                                        <p className="text-xs text-muted mb-1">Expiry Date</p>
                                        <p className="text-sm font-semibold text-primary">
                                            {selectedDriver.license_expiry ? new Date(selectedDriver.license_expiry).toLocaleDateString() : "—"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest border-b border-border pb-2">Performance</h3>
                                <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border">
                                    <span className="text-sm text-secondary">Safety Score</span>
                                    <span className={`px-3 py-1 rounded-lg text-sm font-bold ${Number(selectedDriver.safety_score) >= 90 ? "bg-success/10 text-success" : Number(selectedDriver.safety_score) >= 70 ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger"}`}>
                                        {selectedDriver.safety_score} / 100
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-card p-4 rounded-xl border border-border">
                                        <p className="text-xs text-muted mb-1">Trips Completed</p>
                                        <p className="text-sm font-semibold text-primary">{selectedDriver.trip_count || 0}</p>
                                    </div>
                                    <div className="bg-card p-4 rounded-xl border border-border">
                                        <p className="text-xs text-muted mb-1">Assigned Vehicle</p>
                                        <p className="text-sm font-semibold text-info">{selectedDriver.assigned_vehicle || "None"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-border bg-card shrink-0">
                            <div className="text-center text-xs text-muted py-2 border border-border/50 rounded-lg bg-info/5">
                                🔒 Read-only access — Contact admin to make changes
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default FinanceDrivers;
