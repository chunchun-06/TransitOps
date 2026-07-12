import { useEffect, useState } from "react";
import { HiOutlineTrash } from "react-icons/hi";
import { getFuelLogs, createFuelLog, deleteFuelLog } from "../../api/fuel.api";
import { getVehicles } from "../../api/vehicle.api";
import { getTrips } from "../../api/trip.api";
import { Input, Select, Button } from "../../components/common";

const initialForm = {
    vehicle_id: "",
    trip_id: "",
    fuel_amount: "",
    cost: "",
    date: ""
};

const Fuel = () => {
    const [logs, setLogs] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [trips, setTrips] = useState([]);
    
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const fetchData = async () => {
        try {
            const [logsRes, vehiclesRes, tripsRes] = await Promise.all([
                getFuelLogs().catch(() => ({ data: [] })),
                getVehicles().catch(() => ({ data: [] })),
                getTrips().catch(() => ({ data: [] }))
            ]);
            setLogs(logsRes.data || []);
            setVehicles(vehiclesRes.data || []);
            setTrips(tripsRes.data || []);
        } catch (err) {
            console.error("Error fetching fuel data:", err);
        }
    };

    useEffect(() => {
        fetchData();
        setForm(f => ({ ...f, date: new Date().toISOString().split('T')[0] }));
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setErrorMsg("");
            
            const payload = {
                ...form,
                vehicle_id: Number(form.vehicle_id),
                trip_id: form.trip_id ? Number(form.trip_id) : null,
                fuel_amount: Number(form.fuel_amount),
                cost: Number(form.cost),
            };

            await createFuelLog(payload);
            setForm({ ...initialForm, date: new Date().toISOString().split('T')[0] });
            fetchData();
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Failed to save record");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this fuel log?")) return;
        try {
            await deleteFuelLog(id);
            fetchData();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to delete");
        }
    };

    const vehicleOptions = [
        { label: "Select Vehicle...", value: "" },
        ...vehicles.map(v => ({ label: v.registration_no, value: v.id }))
    ];

    const tripOptions = [
        { label: "None (General Fill-up)", value: "" },
        ...trips.map(t => ({ label: `TR${String(t.id).padStart(3, '0')} - ${t.source} to ${t.destination}`, value: t.id }))
    ];

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
                        <h2 className="text-[10px] uppercase tracking-widest text-muted font-bold mb-6">Log Fuel Fill-up</h2>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            {errorMsg && (
                                <div className="bg-danger/10 border border-red-500/20 text-danger text-sm p-3 rounded-lg">
                                    <span className="font-semibold">Error:</span> {errorMsg}
                                </div>
                            )}

                            <Select label="Vehicle" name="vehicle_id" value={form.vehicle_id} onChange={handleChange} options={vehicleOptions} required />
                            <Select label="Associated Trip (Optional)" name="trip_id" value={form.trip_id} onChange={handleChange} options={tripOptions} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Volume (L)" name="fuel_amount" type="number" step="0.1" placeholder="e.g. 45.5" value={form.fuel_amount} onChange={handleChange} required />
                                <Input label="Total Cost" name="cost" type="number" placeholder="e.g. 4500" value={form.cost} onChange={handleChange} required />
                            </div>
                            
                            <Input label="Date" name="date" type="date" value={form.date} onChange={handleChange} required />

                            <Button type="submit" disabled={loading || !form.vehicle_id || !form.fuel_amount || !form.cost || !form.date} className="mt-2 w-full">
                                {loading ? "Saving..." : "Log Fuel"}
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Right Side: Log */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <h2 className="text-[10px] uppercase tracking-widest text-muted font-bold ml-1">Fuel Log</h2>
                    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-border bg-sidebar">
                                        <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Vehicle</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Trip ID</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Volume (L)</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Cost</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#2B3038]">
                                    {logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-muted text-sm">No fuel logs found.</td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => {
                                            const v = vehicles.find(veh => veh.id === log.vehicle_id);
                                            return (
                                                <tr key={log.id} className="hover:bg-primary/[0.02] transition-colors group">
                                                    <td className="px-6 py-4 text-sm font-semibold text-primary">{v?.registration_no || "—"}</td>
                                                    <td className="px-6 py-4 text-sm text-secondary">{log.trip_id ? `TR${String(log.trip_id).padStart(3, '0')}` : "—"}</td>
                                                    <td className="px-6 py-4 text-sm text-secondary">{log.fuel_amount} L</td>
                                                    <td className="px-6 py-4 text-sm text-secondary">{formatCurrency(log.cost)}</td>
                                                    <td className="px-6 py-4 text-sm text-secondary">{formatDate(log.date)}</td>
                                                    <td className="px-6 py-4 text-sm text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => handleDelete(log.id)} className="p-1.5 text-secondary hover:text-danger hover:bg-red-400/10 rounded transition-colors" title="Delete">
                                                                <HiOutlineTrash className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
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

export default Fuel;