import { useEffect, useState } from "react";
import { HiOutlineTrash } from "react-icons/hi";
import { getExpenses, createExpense, deleteExpense } from "../../api/expense.api";
import { getTrips } from "../../api/trip.api";
import { Input, Select, Button, Badge } from "../../components/common";

const initialForm = {
    trip_id: "",
    category: "Toll",
    amount: "",
    date: "",
    description: ""
};

const CATEGORIES = ["Toll", "Fine", "Parking", "Accommodation", "Meals", "Other"];

const Expenses = () => {
    const [expenses, setExpenses] = useState([]);
    const [trips, setTrips] = useState([]);
    
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const fetchData = async () => {
        try {
            const [expRes, tripsRes] = await Promise.all([
                getExpenses().catch(() => ({ data: [] })),
                getTrips().catch(() => ({ data: [] }))
            ]);
            setExpenses(expRes.data || []);
            setTrips(tripsRes.data || []);
        } catch (err) {
            console.error("Error fetching expenses data:", err);
        }
    };

    useEffect(() => {
        fetchData();
        setForm(f => ({ ...f, date: new Date().toISOString().split('T')[0] }));
    }, []);

    const handleChange = (e) => {
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
            } else if (name === "category" && value === "Toll" && prev.trip_id) {
                const selectedTrip = trips.find(t => String(t.id) === String(prev.trip_id));
                if (selectedTrip) {
                    const toll = selectedTrip.toll_amount !== null && selectedTrip.toll_amount !== undefined ? parseFloat(selectedTrip.toll_amount) : 0;
                    if (toll > 0) {
                        updated.amount = toll.toString();
                    }
                    if (!updated.description) {
                        updated.description = `Toll charges for TR-${String(selectedTrip.id).substring(0, 5).toUpperCase()} (${selectedTrip.source} → ${selectedTrip.destination})`;
                    }
                }
            }

            return updated;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setErrorMsg("");
            
            const payload = {
                ...form,
                trip_id: form.trip_id ? form.trip_id : null,
                amount: Number(form.amount),
            };

            await createExpense(payload);
            setForm({ ...initialForm, date: new Date().toISOString().split('T')[0] });
            fetchData();
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Failed to save record");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this expense log?")) return;
        try {
            await deleteExpense(id);
            fetchData();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to delete");
        }
    };

    const tripOptions = [
        { label: "None (General Operation)", value: "" },
        ...trips.map(t => ({ label: `TR-${String(t.id).substring(0,5).toUpperCase()} - ${t.source} to ${t.destination}`, value: t.id }))
    ];

    const categoryOptions = CATEGORIES.map(c => ({ label: c, value: c }));

    const formatCurrency = (val) => val ? Number(val).toLocaleString() : "—";
    const formatDate = (dateString) => {
        if (!dateString) return "—";
        const d = new Date(dateString);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };

    return (
        <div className="animate-fade-in-up max-w-[1600px] mx-auto text-primary">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Side: Form */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                        <h2 className="text-[10px] uppercase tracking-widest text-muted font-bold mb-6">Log Expense</h2>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            {errorMsg && (
                                <div className="bg-danger/10 border border-red-500/20 text-danger text-sm p-3 rounded-lg">
                                    <span className="font-semibold">Error:</span> {errorMsg}
                                </div>
                            )}

                            <Select label="Associated Trip (Optional)" name="trip_id" value={form.trip_id} onChange={handleChange} options={tripOptions} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <Select label="Category" name="category" value={form.category} onChange={handleChange} options={categoryOptions} required />
                                <Input label="Amount" name="amount" type="number" placeholder="e.g. 500" value={form.amount} onChange={handleChange} required />
                            </div>
                            
                            <Input label="Date" name="date" type="date" value={form.date} onChange={handleChange} required />
                            
                            <Input label="Description / Note" name="description" placeholder="e.g. Highway toll" value={form.description} onChange={handleChange} />

                            <Button type="submit" disabled={loading || !form.category || !form.amount || !form.date} className="mt-2 w-full">
                                {loading ? "Saving..." : "Log Expense"}
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Right Side: Log */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <h2 className="text-[10px] uppercase tracking-widest text-muted font-bold ml-1">Expense Log</h2>
                    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-border bg-sidebar">
                                        <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Category</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Trip ID</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {expenses.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-muted text-sm">No expenses found.</td>
                                        </tr>
                                    ) : (
                                        expenses.map((exp) => (
                                            <tr key={exp.id} className="hover:bg-primary/[0.02] transition-colors group">
                                                <td className="px-6 py-4 text-sm text-secondary">{formatDate(exp.date)}</td>
                                                <td className="px-6 py-4 text-sm">
                                                    <span className="bg-[#4B5563] text-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md">
                                                        {exp.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-secondary font-medium">{exp.description || "—"}</td>
                                                <td className="px-6 py-4 text-sm text-secondary">{exp.trip_id ? `TR-${String(exp.trip_id).substring(0,5).toUpperCase()}` : "—"}</td>
                                                <td className="px-6 py-4 text-sm text-primary font-semibold">{formatCurrency(exp.amount)}</td>
                                                <td className="px-6 py-4 text-sm text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleDelete(exp.id)} className="p-1.5 text-secondary hover:text-danger hover:bg-red-400/10 rounded transition-colors" title="Delete">
                                                            <HiOutlineTrash className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Expenses;