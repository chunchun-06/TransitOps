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
import { getExpenses, createExpense, deleteExpense } from "../../api/expense.api";
import { getVehicles } from "../../api/vehicle.api";
import { getTrips } from "../../api/trip.api";
import { Select, Input, Button } from "../../components/common";

const CATEGORIES = ["Toll", "Fine", "Parking", "Accommodation", "Meals", "Other"];

const categoryColors = {
    Toll: "bg-blue-500/10 text-blue-400",
    Fine: "bg-red-500/10 text-red-400",
    Parking: "bg-purple-500/10 text-purple-400",
    Accommodation: "bg-orange-500/10 text-orange-400",
    Meals: "bg-green-500/10 text-green-400",
    Other: "bg-gray-500/10 text-gray-400",
};

const initialForm = {
    trip_id: "",
    category: "Toll",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
};

const FinanceExpenses = () => {
    const [expenses, setExpenses] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [trips, setTrips] = useState([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const fetchData = async () => {
        try {
            const [expRes, vehiclesRes, tripsRes] = await Promise.all([
                getExpenses().catch(() => ({ data: [] })),
                getVehicles().catch(() => ({ data: [] })),
                getTrips().catch(() => ({ data: [] })),
            ]);
            setExpenses(expRes.data || []);
            setVehicles(vehiclesRes.data || []);
            setTrips(tripsRes.data || []);
        } catch (err) {
            console.error("Fetch expenses error:", err);
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
        setForm(prev => {
            const updated = { ...prev, [name]: value };
            if (name === "trip_id" && value) {
                const selectedTrip = trips.find(t => String(t.id) === String(value));
                if (selectedTrip) {
                    const toll = selectedTrip.toll_amount !== null && selectedTrip.toll_amount !== undefined ? parseFloat(selectedTrip.toll_amount) : 0;
                    if (toll > 0 && (updated.category === "Toll" || !updated.amount)) {
                        updated.amount = toll.toString();
                    }
                    if (!updated.description || updated.description.startsWith("Toll charges for")) {
                        updated.description = `Toll charges for TR-${String(selectedTrip.id).substring(0, 5).toUpperCase()} (${selectedTrip.source} → ${selectedTrip.destination})`;
                    }
                }
            }
            return updated;
        });
    };

    const handleSubmitExpense = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            setErrorMsg("");
            const payload = {
                ...form,
                trip_id: form.trip_id ? form.trip_id : null,
                amount: Number(form.amount),
            };
            await createExpense(payload);
            setForm({ ...initialForm, date: new Date().toISOString().split("T")[0] });
            setShowModal(false);
            fetchData();
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Failed to save expense");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this expense record?")) return;
        try {
            await deleteExpense(id);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete expense");
        }
    };

    const processedExpenses = useMemo(() => {
        let filtered = expenses.filter((e) => {
            const matchesSearch =
                e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.category?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === "All" || e.category === categoryFilter;
            return (matchesSearch || !searchTerm) && matchesCategory;
        });
        filtered.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
        return filtered;
    }, [expenses, searchTerm, categoryFilter, sortConfig]);

    const paginatedExpenses = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return processedExpenses.slice(start, start + itemsPerPage);
    }, [processedExpenses, currentPage]);

    const totalPages = Math.ceil(processedExpenses.length / itemsPerPage) || 1;
    const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // Category breakdown
    const categoryBreakdown = CATEGORIES.map(cat => ({
        cat,
        total: expenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount || 0), 0),
        count: expenses.filter(e => e.category === cat).length,
    })).filter(c => c.count > 0);

    const formatCurrency = (val) => val ? Number(val).toLocaleString() : "—";
    const formatDate = (dateString) => {
        if (!dateString) return "—";
        const d = new Date(dateString);
        return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    };

    const categoryOptions = [
        { label: "Category: All", value: "All" },
        ...CATEGORIES.map(c => ({ label: c, value: c })),
    ];

    const tripSelectOptions = [
        { label: "None (General Operation)", value: "" },
        ...trips.map(t => {
            const isOngoing = t.status === "Dispatched" || t.status === "In Progress" || t.status === "Scheduled";
            const tag = isOngoing ? "🟢 [ONGOING]" : t.status === "Completed" ? "🏁 [COMPLETED]" : `[${(t.status || 'TRIP').toUpperCase()}]`;
            return {
                label: `${tag} TR-${String(t.id).substring(0, 5).toUpperCase()} (${t.source} → ${t.destination})`,
                value: t.id
            };
        })
    ];

    const handleExportCSV = () => {
        const headers = ["Date", "Category", "Description", "Vehicle", "Trip ID", "Amount"];
        const rows = processedExpenses.map((e) => [
            formatDate(e.date),
            e.category,
            `"${e.description || ""}"`,
            getVehicleName(e.vehicle_id),
            e.trip_id ? `TR-${String(e.trip_id).substring(0, 5).toUpperCase()}` : "—",
            e.amount,
        ]);
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "transitops_expenses_report.csv");
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
                    { label: "Total Records", value: expenses.length, color: "text-primary" },
                    { label: "Total Amount", value: `₹${totalAmount.toLocaleString()}`, color: "text-accent" },
                    { label: "Avg per Record", value: expenses.length ? `₹${(totalAmount / expenses.length).toFixed(0)}` : "—", color: "text-secondary" },
                    { label: "Categories Used", value: categoryBreakdown.length, color: "text-info" },
                ].map(stat => (
                    <div key={stat.label} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                        <p className="text-xs text-muted uppercase tracking-wider font-bold mb-1">{stat.label}</p>
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Category Breakdown */}
            {categoryBreakdown.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                    <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-4">Expense by Category</h3>
                    <div className="flex flex-wrap gap-3">
                        {categoryBreakdown.map(({ cat, total, count }) => (
                            <div key={cat} className={`flex items-center gap-3 px-4 py-2 rounded-xl border border-border ${categoryColors[cat] || "bg-card text-secondary"}`}>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider">{cat}</p>
                                    <p className="text-sm font-bold">₹{total.toLocaleString()}</p>
                                </div>
                                <span className="text-xs opacity-70">{count} records</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Bar */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm print:hidden">
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    <Select
                        value={categoryFilter}
                        onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                        options={categoryOptions}
                        className="w-[160px]"
                    />
                    <div className="relative flex-1 min-w-[200px]">
                        <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search description or category..."
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
                        <HiOutlinePlus className="w-4 h-4" /> Add Expense
                    </button>
                    <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-secondary hover:text-primary hover:bg-primary/5 text-sm font-medium transition-colors">
                        <HiOutlineDownload className="w-4 h-4" /> Export CSV
                    </button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-secondary hover:text-primary hover:bg-primary/5 text-sm font-medium transition-colors">
                        <HiOutlinePrinter className="w-4 h-4" /> Print
                    </button>
                </div>
            </div>

            {/* Add Expense Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl max-w-md w-full relative animate-fade-in-up">
                        <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                            <h3 className="text-base font-bold text-primary">Log Trip / Operation Expense</h3>
                            <button onClick={() => setShowModal(false)} className="text-muted hover:text-primary p-1 rounded-lg">
                                <HiX className="w-5 h-5" />
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="mb-4 bg-danger/10 border border-danger/30 text-danger text-xs p-3 rounded-lg">
                                {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleSubmitExpense} className="space-y-4">
                            <Select
                                label="Associated Trip (Ongoing or Completed)"
                                name="trip_id"
                                value={form.trip_id}
                                onChange={handleFormChange}
                                options={tripSelectOptions}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label="Category"
                                    name="category"
                                    value={form.category}
                                    onChange={handleFormChange}
                                    options={CATEGORIES.map(c => ({ label: c, value: c }))}
                                    required
                                />
                                <Input
                                    label="Amount (₹)"
                                    name="amount"
                                    type="number"
                                    placeholder="e.g. 500"
                                    value={form.amount}
                                    onChange={handleFormChange}
                                    required
                                />
                            </div>

                            <Input
                                label="Date"
                                name="date"
                                type="date"
                                value={form.date}
                                onChange={handleFormChange}
                                required
                            />

                            <Input
                                label="Description / Notes"
                                name="description"
                                placeholder="e.g. Toll charges for trip"
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
                                <Button type="submit" disabled={submitting || !form.amount || !form.date}>
                                    {submitting ? "Saving..." : "Save Expense"}
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
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary" onClick={() => handleSort("date")}>
                                    Date <SortIcon column="date" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary" onClick={() => handleSort("category")}>
                                    Category <SortIcon column="category" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Description</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Vehicle</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Trip ID</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary" onClick={() => handleSort("amount")}>
                                    Amount <SortIcon column="amount" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {paginatedExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-muted text-sm">No expenses found.</td>
                                </tr>
                            ) : (
                                paginatedExpenses.map((exp) => (
                                    <tr key={exp.id} className="hover:bg-primary/[0.02] transition-colors group">
                                        <td className="px-6 py-4 text-sm text-secondary">{formatDate(exp.date)}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${categoryColors[exp.category] || "bg-gray-500/10 text-gray-400"}`}>
                                                {exp.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary max-w-[180px] truncate">{exp.description || "—"}</td>
                                        <td className="px-6 py-4 text-sm text-secondary">{getVehicleName(exp.vehicle_id)}</td>
                                        <td className="px-6 py-4 text-sm text-secondary">{exp.trip_id ? `TR-${String(exp.trip_id).substring(0, 5).toUpperCase()}` : "—"}</td>
                                        <td className="px-6 py-4 text-sm font-semibold text-primary">{formatCurrency(exp.amount)}</td>
                                        <td className="px-6 py-4 text-sm text-right">
                                            <button
                                                onClick={() => handleDelete(exp.id)}
                                                className="p-1.5 text-secondary hover:text-danger hover:bg-red-400/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete Expense"
                                            >
                                                <HiOutlineTrash className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {processedExpenses.length > 0 && (
                            <tfoot>
                                <tr className="bg-sidebar border-t border-border">
                                    <td colSpan={5} className="px-6 py-3 text-xs font-bold text-muted uppercase tracking-wider">Filtered Total</td>
                                    <td className="px-6 py-3 text-sm font-bold text-accent">
                                        {processedExpenses.reduce((s, e) => s + Number(e.amount || 0), 0).toLocaleString()}
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
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, processedExpenses.length)} of {processedExpenses.length} entries
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

export default FinanceExpenses;
