import { useEffect, useState } from "react";
import { HiOutlineSearch, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from "react-icons/hi";
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from "../../api/vehicle.api";
import { Button, Input, Select, Badge, Modal } from "../../components/common";

const initialForm = {
    registration_no: "",
    vehicle_name: "",
    vehicle_type: "Van",
    max_load_capacity: "",
    odometer: "",
    acquisition_cost: "",
    status: "Available"
};

const VehiclePage = () => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [form, setForm] = useState(initialForm);
    const [currentId, setCurrentId] = useState(null);
    const [formError, setFormError] = useState("");

    const fetchVehicles = async () => {
        try {
            const res = await getVehicles();
            setVehicles(res.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchVehicles();
    }, []);

    const handleOpenModal = (mode = "create", vehicle = null) => {
        setModalMode(mode);
        setFormError("");
        if (mode === "edit" && vehicle) {
            setCurrentId(vehicle.id);
            setForm({
                registration_no: vehicle.registration_no || "",
                vehicle_name: vehicle.vehicle_name || "",
                vehicle_type: vehicle.vehicle_type || "Van",
                max_load_capacity: vehicle.max_load_capacity || "",
                odometer: vehicle.odometer || "",
                acquisition_cost: vehicle.acquisition_cost || "",
                status: vehicle.status || "Available"
            });
        } else {
            setCurrentId(null);
            setForm(initialForm);
        }
        setIsModalOpen(true);
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

            const payload = {
                ...form,
                max_load_capacity: form.max_load_capacity ? Number(form.max_load_capacity) : null,
                odometer: form.odometer ? Number(form.odometer) : 0,
                acquisition_cost: form.acquisition_cost ? Number(form.acquisition_cost) : null,
            };

            if (modalMode === "create") {
                await createVehicle(payload);
            } else {
                await updateVehicle(currentId, payload);
            }

            setIsModalOpen(false);
            fetchVehicles();
        } catch (err) {
            const msg = err.response?.data?.message || "Something went wrong";
            setFormError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this vehicle?")) return;
        try {
            await deleteVehicle(id);
            fetchVehicles();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to delete");
        }
    };

    const filteredVehicles = vehicles.filter(v => {
        const matchesSearch = v.registration_no?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              v.vehicle_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === "All" || v.vehicle_type === typeFilter;
        const matchesStatus = statusFilter === "All" || v.status === statusFilter;
        return (matchesSearch || !searchTerm) && matchesType && matchesStatus;
    });

    const formatCurrency = (val) => val ? Number(val).toLocaleString() : "—";
    const formatNumber = (val) => val ? Number(val).toLocaleString() : "—";

    return (
        <div className="animate-fade-in-up space-y-6 max-w-[1600px] mx-auto text-white">
            
            {/* Top Bar: Filters & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1B1F24] p-4 rounded-xl border border-[#2B3038] shadow-sm">
                
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <Select 
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        options={[
                            { label: "Type: All", value: "All" },
                            { label: "Van", value: "Van" },
                            { label: "Truck", value: "Truck" },
                            { label: "Mini", value: "Mini" },
                        ]}
                        className="w-[140px]"
                    />
                    <Select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        options={[
                            { label: "Status: All", value: "All" },
                            { label: "Available", value: "Available" },
                            { label: "On Trip", value: "On Trip" },
                            { label: "In Shop", value: "In Shop" },
                            { label: "Retired", value: "Retired" },
                        ]}
                        className="w-[140px]"
                    />
                    <div className="relative flex-1 min-w-[200px]">
                        <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search reg. no..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-[#0E0F13] border border-[#2B3038] text-sm text-white rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-[#C98A1C] transition-colors w-full placeholder-gray-600"
                        />
                    </div>
                </div>

                <Button onClick={() => handleOpenModal("create")} className="whitespace-nowrap">
                    <HiOutlinePlus className="w-4 h-4" /> Add Vehicle
                </Button>
            </div>

            {/* Table Card */}
            <div className="bg-[#1B1F24] border border-[#2B3038] rounded-2xl overflow-hidden flex flex-col shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-[#2B3038] bg-[#15181D]">
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Reg. No. (Unique)</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Name/Model</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Capacity</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Odometer</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Acq. Cost</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2B3038]">
                            {filteredVehicles.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500 text-sm">
                                        No vehicles found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredVehicles.map((vehicle) => (
                                    <tr key={vehicle.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4 text-sm font-semibold text-gray-200">{vehicle.registration_no}</td>
                                        <td className="px-6 py-4 text-sm text-gray-400">{vehicle.vehicle_name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-400">{vehicle.vehicle_type}</td>
                                        <td className="px-6 py-4 text-sm text-gray-400">{vehicle.max_load_capacity ? `${vehicle.max_load_capacity} kg` : "—"}</td>
                                        <td className="px-6 py-4 text-sm text-gray-400">{formatNumber(vehicle.odometer)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-400">{formatCurrency(vehicle.acquisition_cost)}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <Badge status={vehicle.status}>{vehicle.status}</Badge>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleOpenModal("edit", vehicle)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                                                    title="Edit"
                                                >
                                                    <HiOutlinePencil className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(vehicle.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                                    title="Delete"
                                                >
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
                <div className="px-6 py-4 border-t border-[#2B3038] bg-[#15181D]">
                    <p className="text-xs text-[#C98A1C] font-medium">
                        Rule: Registration No. must be unique • Retired/In Shop vehicles are hidden from Trip Dispatcher
                    </p>
                </div>
            </div>

            {/* Create / Edit Modal */}
            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                title={modalMode === "create" ? "Add New Vehicle" : "Edit Vehicle"}
            >
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {formError && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg flex items-start gap-2">
                            <span className="font-semibold">Error:</span> {formError}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label="Registration No." 
                            name="registration_no" 
                            placeholder="e.g. GJ01AB4523" 
                            value={form.registration_no} 
                            onChange={handleChange} 
                            required 
                            error={formError.toLowerCase().includes("unique") ? "Already exists" : ""}
                        />
                        <Input 
                            label="Vehicle Name/Model" 
                            name="vehicle_name" 
                            placeholder="e.g. VAN-05" 
                            value={form.vehicle_name} 
                            onChange={handleChange} 
                            required 
                        />
                        <Select 
                            label="Vehicle Type" 
                            name="vehicle_type" 
                            value={form.vehicle_type} 
                            onChange={handleChange}
                            options={[
                                { label: "Van", value: "Van" },
                                { label: "Truck", value: "Truck" },
                                { label: "Mini", value: "Mini" }
                            ]}
                        />
                        <Input 
                            label="Capacity (kg)" 
                            name="max_load_capacity" 
                            type="number" 
                            placeholder="e.g. 500" 
                            value={form.max_load_capacity} 
                            onChange={handleChange} 
                        />
                        <Input 
                            label="Odometer (km)" 
                            name="odometer" 
                            type="number" 
                            placeholder="e.g. 74000" 
                            value={form.odometer} 
                            onChange={handleChange} 
                        />
                        <Input 
                            label="Acquisition Cost" 
                            name="acquisition_cost" 
                            type="number" 
                            placeholder="e.g. 620000" 
                            value={form.acquisition_cost} 
                            onChange={handleChange} 
                        />
                        {modalMode === "edit" && (
                            <Select 
                                label="Status" 
                                name="status" 
                                value={form.status} 
                                onChange={handleChange}
                                options={[
                                    { label: "Available", value: "Available" },
                                    { label: "On Trip", value: "On Trip" },
                                    { label: "In Shop", value: "In Shop" },
                                    { label: "Retired", value: "Retired" }
                                ]}
                                className="md:col-span-2"
                            />
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-4 pt-5 border-t border-[#2B3038]">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : modalMode === "create" ? "Add Vehicle" : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </Modal>

        </div>
    );
};

export default VehiclePage;