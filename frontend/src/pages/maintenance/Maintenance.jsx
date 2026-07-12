import { useEffect, useState } from "react";
import { HiOutlineArrowRight, HiOutlinePencil, HiOutlineTrash, HiX } from "react-icons/hi";
import { getMaintenanceLogs, createMaintenanceLog, updateMaintenanceLog, deleteMaintenanceLog } from "../../api/maintenance.api";
import { getVehicles } from "../../api/vehicle.api";
import { Input, Select, Button, Badge } from "../../components/common";

const initialForm = {
    vehicle_id: "",
    service_type: "",
    cost: "",
    service_date: "",
    status: "In Shop"
};

const Maintenance = () => {
    const [logs, setLogs] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [editingId, setEditingId] = useState(null);

    const fetchData = async () => {
        try {
            const [logsRes, vehiclesRes] = await Promise.all([
                getMaintenanceLogs().catch(() => ({ data: [] })),
                getVehicles().catch(() => ({ data: [] }))
            ]);
            setLogs(logsRes.data || []);
            setVehicles(vehiclesRes.data || []);
        } catch (err) {
            console.error("Error fetching maintenance data:", err);
        }
    };

    useEffect(() => {
        fetchData();
        // Default date to today
        setForm(f => ({ ...f, service_date: new Date().toISOString().split('T')[0] }));
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleEdit = (log) => {
        setEditingId(log.id);
        const logDate = log.service_date ? new Date(log.service_date).toISOString().split('T')[0] : "";
        setForm({
            vehicle_id: log.vehicle_id || "",
            service_type: log.service_type || "",
            cost: log.cost || "",
            service_date: logDate,
            status: log.status || "In Shop"
        });
        setErrorMsg("");
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setForm({ ...initialForm, service_date: new Date().toISOString().split('T')[0] });
        setErrorMsg("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setErrorMsg("");
            
            const payload = {
                ...form,
                vehicle_id: form.vehicle_id,
                cost: Number(form.cost || 0),
            };

            if (editingId) {
                await updateMaintenanceLog(editingId, payload);
            } else {
                await createMaintenanceLog(payload);
            }
            
            handleCancelEdit();
            fetchData();
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Failed to save record");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this maintenance record?")) return;
        try {
            await deleteMaintenanceLog(id);
            fetchData();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to delete");
        }
    };

    const vehicleOptions = [
        { label: "Select Vehicle...", value: "" },
        ...vehicles.map(v => ({
            label: v.registration_no,
            value: v.id
        }))
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
                
                {/* Left Side: Log Form */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm relative">
                        {editingId && (
                            <div className="absolute top-6 right-6">
                                <button onClick={handleCancelEdit} className="text-secondary hover:text-primary bg-primary/[0.05] hover:bg-primary/[0.1] p-1.5 rounded-lg transition-colors" title="Cancel Edit">
                                    <HiX className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <h2 className="text-[10px] uppercase tracking-widest text-muted font-bold mb-6">
                            {editingId ? "Edit Service Record" : "Log Service Record"}
                        </h2>
                        
                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            {errorMsg && (
                                <div className="bg-danger/10 border border-red-500/20 text-danger text-sm p-3 rounded-lg">
                                    <span className="font-semibold">Error:</span> {errorMsg}
                                </div>
                            )}

                            <Select 
                                label="Vehicle" 
                                name="vehicle_id" 
                                value={form.vehicle_id} 
                                onChange={handleChange}
                                options={vehicleOptions}
                                required
                            />
                            
                            <Input 
                                label="Service Type" 
                                name="service_type" 
                                placeholder="e.g. Oil Change" 
                                value={form.service_type} 
                                onChange={handleChange} 
                                required
                            />
                            
                            <Input 
                                label="Cost" 
                                name="cost" 
                                type="number" 
                                placeholder="e.g. 2500" 
                                value={form.cost} 
                                onChange={handleChange} 
                                required
                            />
                            
                            <Input 
                                label="Date" 
                                name="service_date" 
                                type="date" 
                                value={form.service_date} 
                                onChange={handleChange} 
                                required
                            />
                            
                            <Select 
                                label="Status" 
                                name="status" 
                                value={form.status} 
                                onChange={handleChange}
                                options={[
                                    { label: "In Shop", value: "In Shop" },
                                    { label: "Completed", value: "Completed" }
                                ]}
                            />

                            <Button type="submit" disabled={loading || !form.vehicle_id || !form.service_type || !form.cost || !form.service_date} className="mt-2 w-full">
                                {loading ? "Saving..." : editingId ? "Update Record" : "Save Record"}
                            </Button>
                        </form>

                        {/* Lifecycle Rules block exactly as in wireframe */}
                        <div className="mt-8 pt-6 border-t border-border text-xs font-semibold tracking-wide space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="text-success">Available</span>
                                <div className="flex-1 border-t border-dashed border-gray-600 relative flex justify-center">
                                    <span className="absolute -top-2.5 bg-card px-2 text-muted text-[10px]">creating active record</span>
                                    <HiOutlineArrowRight className="absolute right-0 -top-1.5 text-gray-600 w-3 h-3 bg-card" />
                                </div>
                                <span className="text-warning">In Shop</span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <span className="text-warning">In Shop</span>
                                <div className="flex-1 border-t border-dashed border-gray-600 relative flex justify-center">
                                    <span className="absolute -top-2.5 bg-card px-2 text-muted text-[10px]">closing record (not retired)</span>
                                    <HiOutlineArrowRight className="absolute right-0 -top-1.5 text-gray-600 w-3 h-3 bg-card" />
                                </div>
                                <span className="text-success">Available</span>
                            </div>
                            
                            <p className="text-accent mt-4 pt-2">
                                Note: In Shop vehicles are removed from the dispatch pool.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Side: Service Log */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <h2 className="text-[10px] uppercase tracking-widest text-muted font-bold ml-1">Service Log</h2>
                    
                    <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-border bg-sidebar">
                                        <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Vehicle</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Service</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Cost</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#2B3038]">
                                    {logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-muted text-sm">
                                                No service records found.
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => {
                                            const v = vehicles.find(veh => veh.id === log.vehicle_id);
                                            const vName = v ? v.registration_no : "—";
                                            return (
                                                <tr key={log.id} className="hover:bg-primary/[0.02] transition-colors group">
                                                    <td className="px-6 py-4 text-sm font-semibold text-primary">{vName}</td>
                                                    <td className="px-6 py-4 text-sm text-secondary">{log.service_type}</td>
                                                    <td className="px-6 py-4 text-sm text-secondary">{formatCurrency(log.cost)}</td>
                                                    <td className="px-6 py-4 text-sm text-secondary">{formatDate(log.service_date)}</td>
                                                    <td className="px-6 py-4 text-sm">
                                                        <Badge status={log.status}>{log.status}</Badge>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={() => handleEdit(log)}
                                                                className="p-1.5 text-secondary hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                                                                title="Edit"
                                                            >
                                                                <HiOutlinePencil className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDelete(log.id)}
                                                                className="p-1.5 text-secondary hover:text-danger hover:bg-red-400/10 rounded transition-colors"
                                                                title="Delete"
                                                            >
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

export default Maintenance;