import { useEffect, useState } from "react";
import { HiOutlineSearch, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiX } from "react-icons/hi";
import { getDrivers, createDriver, updateDriver, deleteDriver } from "../../api/driver.api";
import { Button, Input, Select, Badge } from "../../components/common";

const Drawer = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full max-w-md bg-[#15181D] border-l border-[#2B3038] shadow-2xl h-full flex flex-col animate-slide-in-right">
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#2B3038]">
                    <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] p-1.5 rounded-lg transition-colors">
                        <HiX className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 flex-1 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

const initialForm = {
    name: "",
    license_no: "",
    license_category: "LMV",
    license_expiry: "",
    contact_no: "",
    status: "Available"
};

const Drivers = () => {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    // Drawer State
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerMode, setDrawerMode] = useState("create");
    const [form, setForm] = useState(initialForm);
    const [currentId, setCurrentId] = useState(null);
    const [formError, setFormError] = useState("");

    const fetchDrivers = async () => {
        try {
            const res = await getDrivers();
            setDrivers(res.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchDrivers();
    }, []);

    const handleOpenDrawer = (mode = "create", driver = null) => {
        setDrawerMode(mode);
        setFormError("");
        if (mode === "edit" && driver) {
            setCurrentId(driver.id);
            // Format date to YYYY-MM-DD for input type="date" if possible
            const expiry = driver.license_expiry ? new Date(driver.license_expiry).toISOString().split('T')[0] : "";
            setForm({
                name: driver.name || "",
                license_no: driver.license_no || "",
                license_category: driver.license_category || "LMV",
                license_expiry: expiry,
                contact_no: driver.contact_no || "",
                status: driver.status || "Available"
            });
        } else {
            setCurrentId(null);
            setForm(initialForm);
        }
        setIsDrawerOpen(true);
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setFormError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setFormError("");
            const payload = { ...form };
            if (drawerMode === "create") {
                await createDriver(payload);
            } else {
                await updateDriver(currentId, payload);
            }
            setIsDrawerOpen(false);
            fetchDrivers();
        } catch (err) {
            const msg = err.response?.data?.message || "Something went wrong";
            setFormError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this driver?")) return;
        try {
            await deleteDriver(id);
            fetchDrivers();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to delete");
        }
    };

    const filteredDrivers = drivers.filter(d => {
        const matchSearch = d.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            d.license_no?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === "All" || d.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const isExpired = (dateString) => {
        if (!dateString) return false;
        return new Date(dateString) < new Date();
    };

    const formatDate = (dateString) => {
        if (!dateString) return "—";
        const d = new Date(dateString);
        return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };

    return (
        <div className="animate-fade-in-up space-y-6 max-w-[1600px] mx-auto text-white">
            
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1B1F24] p-4 rounded-xl border border-[#2B3038] shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search drivers by name or license..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-[#0E0F13] border border-[#2B3038] text-sm text-white rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-[#C98A1C] transition-colors w-full placeholder-gray-600"
                    />
                </div>
                <Button onClick={() => handleOpenDrawer("create")} className="whitespace-nowrap">
                    <HiOutlinePlus className="w-4 h-4" /> Add Driver
                </Button>
            </div>

            {/* Table */}
            <div className="bg-[#1B1F24] border border-[#2B3038] rounded-2xl overflow-hidden flex flex-col shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-[#2B3038] bg-[#15181D]">
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Driver</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">License No.</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Expiry</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Trip Compl.</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Safety</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2B3038]">
                            {filteredDrivers.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500 text-sm">
                                        No drivers found.
                                    </td>
                                </tr>
                            ) : (
                                filteredDrivers.map((driver) => {
                                    const expired = isExpired(driver.license_expiry);
                                    // Dummy random percentages for UI showcase if backend doesn't provide them
                                    const safety = driver.safety_score || Math.floor(Math.random() * 20 + 80);
                                    const compl = driver.trip_completed || Math.floor(Math.random() * 20 + 80);

                                    let safetyStatus = "Available";
                                    if (safety < 85) safetyStatus = "Suspended";
                                    else if (safety < 90) safetyStatus = "On Trip";

                                    return (
                                        <tr key={driver.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-4 text-sm font-semibold text-gray-200">{driver.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-400">{driver.license_no}</td>
                                            <td className="px-6 py-4 text-sm text-gray-400">{driver.license_category}</td>
                                            <td className="px-6 py-4 text-sm text-gray-400">
                                                <span className={expired ? "text-red-400 font-bold" : ""}>
                                                    {formatDate(driver.license_expiry)} {expired && "EXPIRE"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-400">{driver.contact_no}</td>
                                            <td className="px-6 py-4 text-sm text-gray-400">{compl}%</td>
                                            <td className="px-6 py-4 text-sm">
                                                <Badge status={safetyStatus}>{safetyStatus}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <Badge status={driver.status}>{driver.status}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => handleOpenDrawer("edit", driver)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                                                        title="Edit Profile"
                                                    >
                                                        <HiOutlinePencil className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(driver.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
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

                <div className="px-6 py-5 border-t border-[#2B3038] bg-[#15181D]">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">Toggle Status</p>
                            <div className="flex flex-wrap gap-2">
                                {["All", "Available", "On Trip", "Off Duty", "Suspended"].map(status => (
                                    <button 
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                                            statusFilter === status 
                                            ? status === "Available" ? "bg-[#10B981] text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                            : status === "On Trip" ? "bg-[#3B82F6] text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                                            : status === "Suspended" ? "bg-[#F59E0B] text-white shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                                            : status === "Off Duty" ? "bg-[#4B5563] text-white"
                                            : "bg-[#C98A1C] text-[#111]"
                                            : "bg-transparent border border-[#2B3038] text-gray-400 hover:border-gray-500"
                                        }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <p className="text-xs text-[#C98A1C] font-medium max-w-sm text-right">
                            Rule: Expired license or Suspended status → blocked from trip assignment
                        </p>
                    </div>
                </div>
            </div>

            {/* Profile Drawer */}
            <Drawer 
                isOpen={isDrawerOpen} 
                onClose={() => setIsDrawerOpen(false)}
                title={drawerMode === "create" ? "Add New Driver" : "Driver Profile"}
            >
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 h-full">
                    {formError && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg">
                            <span className="font-semibold">Error:</span> {formError}
                        </div>
                    )}
                    
                    <div className="space-y-4 flex-1">
                        <Input 
                            label="Driver Name" 
                            name="name" 
                            placeholder="e.g. Alex" 
                            value={form.name} 
                            onChange={handleChange} 
                            required 
                        />
                        <Input 
                            label="License No." 
                            name="license_no" 
                            placeholder="e.g. DL-88213" 
                            value={form.license_no} 
                            onChange={handleChange} 
                            required 
                        />
                        <Select 
                            label="License Category" 
                            name="license_category" 
                            value={form.license_category} 
                            onChange={handleChange}
                            options={[
                                { label: "LMV", value: "LMV" },
                                { label: "HMV", value: "HMV" },
                                { label: "Commercial", value: "Commercial" }
                            ]}
                        />
                        <Input 
                            label="License Expiry" 
                            name="license_expiry" 
                            type="date" 
                            value={form.license_expiry} 
                            onChange={handleChange} 
                            required
                        />
                        <Input 
                            label="Contact No." 
                            name="contact_no" 
                            placeholder="e.g. 9876543210" 
                            value={form.contact_no} 
                            onChange={handleChange} 
                            required
                        />
                        {drawerMode === "edit" && (
                            <div className="pt-4 mt-4 border-t border-[#2B3038]">
                                <Select 
                                    label="Status (Suspend / Off Duty)" 
                                    name="status" 
                                    value={form.status} 
                                    onChange={handleChange}
                                    options={[
                                        { label: "Available", value: "Available" },
                                        { label: "On Trip", value: "On Trip" },
                                        { label: "Off Duty", value: "Off Duty" },
                                        { label: "Suspended", value: "Suspended" }
                                    ]}
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Setting a driver to <strong>Suspended</strong> will immediately block them from active dispatching.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="pt-6 mt-4 border-t border-[#2B3038] flex gap-3">
                        <Button type="button" variant="secondary" onClick={() => setIsDrawerOpen(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="flex-1">
                            {loading ? "Saving..." : drawerMode === "create" ? "Add Driver" : "Save Profile"}
                        </Button>
                    </div>
                </form>
            </Drawer>

        </div>
    );
};

export default Drivers;