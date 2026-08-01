import { useEffect, useState, useMemo } from "react";
import {
    HiOutlineSearch,
    HiOutlineDownload,
    HiOutlinePrinter,
    HiOutlineChevronDown,
    HiOutlineChevronUp,
} from "react-icons/hi";
import { getExpenses } from "../../api/expense.api";
import { getVehicles } from "../../api/vehicle.api";
import { Select } from "../../components/common";

const CATEGORIES = ["Toll", "Fine", "Parking", "Accommodation", "Meals", "Other"];

const categoryColors = {
    Toll: "bg-blue-500/10 text-blue-400",
    Fine: "bg-red-500/10 text-red-400",
    Parking: "bg-purple-500/10 text-purple-400",
    Accommodation: "bg-orange-500/10 text-orange-400",
    Meals: "bg-green-500/10 text-green-400",
    Other: "bg-gray-500/10 text-gray-400",
};

const FinanceExpenses = () => {
    const [expenses, setExpenses] = useState([]);
    const [vehicles, setVehicles] = useState([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchData = async () => {
        try {
            const [expRes, vehiclesRes] = await Promise.all([
                getExpenses().catch(() => ({ data: [] })),
                getVehicles().catch(() => ({ data: [] })),
            ]);
            setExpenses(expRes.data || []);
            setVehicles(vehiclesRes.data || []);
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

            {/* Read-Only Banner */}
            <div className="bg-info/10 border border-info/20 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-info text-xs font-bold uppercase tracking-wider">📋 View-Only Mode</span>
                <span className="text-xs text-secondary">
                    You are viewing expense records logged by the admin. No edits can be made from this view.
                </span>
            </div>

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
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {paginatedExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted text-sm">No expenses found.</td>
                                </tr>
                            ) : (
                                paginatedExpenses.map((exp) => (
                                    <tr key={exp.id} className="hover:bg-primary/[0.02] transition-colors">
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
