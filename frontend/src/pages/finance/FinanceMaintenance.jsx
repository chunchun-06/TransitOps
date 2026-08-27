import { useEffect, useState, useMemo } from "react";
import {
    HiOutlineSearch,
    HiOutlineDownload,
    HiOutlinePrinter,
    HiOutlineChevronDown,
    HiOutlineChevronUp,
    HiOutlinePlus,
    HiOutlineTrash,
    HiX,
} from "react-icons/hi";
import { getMaintenanceLogs, createMaintenanceLog, deleteMaintenanceLog } from "../../api/maintenance.api";
import { getVehicles } from "../../api/vehicle.api";
import { Select, Badge, Input, Button } from "../../components/common";

const SERVICE_TYPES = [
    "Oil Change",
    "Tire Replacement",
    "Brake Inspection",
    "Engine Repair",
    "Transmission Service",
    "General Inspection",
    "Scheduled Service",
    "Other"
];

const initialForm = {
    vehicle_id: "",
    service_type: "Oil Change",
    description: "",
    cost: "",
    service_date: new Date().toISOString().split("T")[0],
    status: "Completed",
};

const FinanceMaintenance = () => {
    const [logs, setLogs] = useState([]);
    const [vehicles, setVehicles] = useState([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [sortConfig, setSortConfig] = useState({ key: "service_date", direction: "desc" });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const fetchData = async () => {
        try {
            const [logsRes, vehiclesRes] = await Promise.all([
                getMaintenanceLogs().catch(() => ({ data: [] })),
                getVehicles().catch(() => ({ data: [] })),
            ]);
            setLogs(logsRes.data || []);
            setVehicles(vehiclesRes.data || []);
            if (vehiclesRes.data?.length > 0 && !form.vehicle_id) {
                setForm(prev => ({ ...prev, vehicle_id: vehiclesRes.data[0].id }));
            }
        } catch (err) {
            console.error("Fetch maintenance error:", err);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSort = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
        setSortConfig({ key, direction });
    };

    const getVehicleName = (id) => vehicles.find(v => v.id === id)?.registration_no || "—";

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmitMaintenance = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            setErrorMsg("");
            const payload = {
                ...form,
                vehicle_id: Number(form.vehicle_id),
                cost: Number(form.cost),
            };
            await createMaintenanceLog(payload);
            setForm({ ...initialForm, vehicle_id: vehicles[0]?.id || "", service_date: new Date().toISOString().split("T")[0] });
            setShowModal(false);
            fetchData();
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Failed to save maintenance record");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this maintenance record?")) return;
        try {
            await deleteMaintenanceLog(id);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete maintenance log");
        }
    };

    const processedLogs = useMemo(() => {
        let filtered = logs.filter((l) => {
            const matchesSearch =
                l.service_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                l.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                getVehicleName(l.vehicle_id)?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === "All" || l.status === statusFilter;
            return (matchesSearch || !searchTerm) && matchesStatus;
        });
        filtered.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
        return filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [logs, searchTerm, statusFilter, sortConfig, vehicles]);

    const paginatedLogs = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return processedLogs.slice(start, start + itemsPerPage);
    }, [processedLogs, currentPage]);

    const totalPages = Math.ceil(processedLogs.length / itemsPerPage) || 1;
    const totalCost = logs.reduce((sum, l) => sum + Number(l.cost || 0), 0);

    const formatCurrency = (val) => val ? Number(val).toLocaleString() : "—";
    const formatDate = (dateString) => {
        if (!dateString) return "—";
        const d = new Date(dateString);
        return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    };

    const vehicleOptions = vehicles.map(v => ({
        label: `${v.registration_no} (${v.make} ${v.model})`,
        value: v.id
    }));

    const handleExportCSV = () => {
        const headers = ["Vehicle", "Service Type", "Description", "Cost", "Date", "Status"];
        const rows = processedLogs.map((l) => [
            getVehicleName(l.vehicle_id),
            `"${l.service_type}"`,
            `"${l.description || ""}"`,
            l.cost || 0,
            formatDate(l.service_date),
            l.status,
        ]);
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "transitops_maintenance_report.csv");
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

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "Total Records", value: logs.length, color: "text-primary" },
                    { label: "In Shop", value: logs.filter(l => l.status === "In Shop").length, color: "text-warning" },
                    { label: "Completed", value: logs.filter(l => l.status === "Completed").length, color: "text-success" },
                    { label: "Total Cost", value: `₹${totalCost.toLocaleString()}`, color: "text-accent" },
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
                            { label: "In Shop", value: "In Shop" },
                            { label: "Completed", value: "Completed" },
                        ]}
                        className="w-[160px]"
                    />
                    <div className="relative flex-1 min-w-[200px]">
                        <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search vehicle, service type..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="form-input border text-sm rounded-lg pl-10 pr-4 py-2.5 outline-none transition-colors w-full"
                        />
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 text-sm font-bold shadow-md transition-all"
                    >
                        <HiOutlinePlus className="w-4 h-4" /> Add Service Record
                    </button>
                    <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-secondary hover:text-primary hover:bg-primary/5 text-sm font-medium transition-colors">
                        <HiOutlineDownload className="w-4 h-4" /> Export CSV
                    </button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-secondary hover:text-primary hover:bg-primary/5 text-sm font-medium transition-colors">
                        <HiOutlinePrinter className="w-4 h-4" /> Print
                    </button>
                </div>
            </div>

            {/* Add Maintenance Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl max-w-md w-full relative animate-fade-in-up">
                        <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                            <h3 className="text-base font-bold text-primary">Log Maintenance Service</h3>
                            <button onClick={() => setShowModal(false)} className="text-muted hover:text-primary p-1 rounded-lg">
                                <HiX className="w-5 h-5" />
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="mb-4 bg-danger/10 border border-danger/30 text-danger text-xs p-3 rounded-lg">
                                {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleSubmitMaintenance} className="space-y-4">
                            <Select
                                label="Target Vehicle"
                                name="vehicle_id"
                                value={form.vehicle_id}
                                onChange={handleFormChange}
                                options={vehicleOptions}
                                required
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label="Service Type"
                                    name="service_type"
                                    value={form.service_type}
                                    onChange={handleFormChange}
                                    options={SERVICE_TYPES.map(st => ({ label: st, value: st }))}
                                    required
                                />
                                <Input
                                    label="Cost (₹)"
                                    name="cost"
                                    type="number"
                                    placeholder="e.g. 2500"
                                    value={form.cost}
                                    onChange={handleFormChange}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Service Date"
                                    name="service_date"
                                    type="date"
                                    value={form.service_date}
                                    onChange={handleFormChange}
                                    required
                                />
                                <Select
                                    label="Status"
                                    name="status"
                                    value={form.status}
                                    onChange={handleFormChange}
                                    options={[
                                        { label: "Completed", value: "Completed" },
                                        { label: "In Shop", value: "In Shop" }
                                    ]}
                                    required
                                />
                            </div>

                            <Input
                                label="Description / Service Details"
                                name="description"
                                placeholder="e.g. Routine 10,000 KM synthetic oil change"
                                value={form.description}
                                onChange={handleFormChange}
                            />

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-border text-secondary hover:text-primary"
                                >
                                    Cancel
                                </button>
                                <Button type="submit" disabled={submitting || !form.vehicle_id || !form.cost}>
                                    {submitting ? "Saving..." : "Save Record"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-border bg-sidebar">
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary" onClick={() => handleSort("registration_no")}>
                                    Vehicle <SortIcon column="registration_no" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary" onClick={() => handleSort("service_type")}>
                                    Service Type <SortIcon column="service_type" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Description</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary" onClick={() => handleSort("cost")}>
                                    Cost <SortIcon column="cost" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary" onClick={() => handleSort("service_date")}>
                                    Date <SortIcon column="service_date" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary" onClick={() => handleSort("status")}>
                                    Status <SortIcon column="status" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {paginatedLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-muted text-sm">
                                        No maintenance records found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-primary/[0.02] transition-colors group">
                                        <td className="px-6 py-4 text-sm font-semibold text-primary">{getVehicleName(log.vehicle_id)}</td>
                                        <td className="px-6 py-4 text-sm text-secondary">{log.service_type}</td>
                                        <td className="px-6 py-4 text-sm text-secondary max-w-[200px] truncate">{log.description || "—"}</td>
                                        <td className="px-6 py-4 text-sm text-primary font-semibold">{formatCurrency(log.cost)}</td>
                                        <td className="px-6 py-4 text-sm text-secondary">{formatDate(log.service_date)}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <Badge status={log.status}>{log.status}</Badge>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right">
                                            <button
                                                onClick={() => handleDelete(log.id)}
                                                className="p-1.5 text-secondary hover:text-danger hover:bg-red-400/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete Maintenance Record"
                                            >
                                                <HiOutlineTrash className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {processedLogs.length > 0 && (
                            <tfoot>
                                <tr className="bg-sidebar border-t border-border">
                                    <td colSpan={3} className="px-6 py-3 text-xs font-bold text-muted uppercase tracking-wider">Total Maintenance Cost</td>
                                    <td className="px-6 py-3 text-sm font-bold text-accent">
                                        {processedLogs.reduce((sum, l) => sum + Number(l.cost || 0), 0).toLocaleString()}
                                    </td>
                                    <td colSpan={3} />
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

export default FinanceMaintenance;
