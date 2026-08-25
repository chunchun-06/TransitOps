import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
    HiOutlineSearch, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, 
    HiOutlineDownload, HiOutlinePrinter, HiX, HiOutlineChevronDown, 
    HiOutlineChevronUp, HiOutlineDocumentReport, HiOutlineTruck,
    HiOutlineEye, HiOutlineSwitchHorizontal, HiOutlineUser
} from "react-icons/hi";
import { 
    getVehicles, createVehicle, updateVehicle, deleteVehicle, 
    bulkDeleteVehicles, bulkUpdateVehicleStatus, updateVehicleStatus 
} from "../../api/vehicle.api";
import { getAvailableDrivers } from "../../api/driver.api";
import { Button, Input, Select, Badge, Modal } from "../../components/common";

const initialForm = {
    registration_no: "",
    vehicle_name: "",
    vehicle_type: "Van",
    max_load_capacity: "",
    odometer: "",
    acquisition_cost: "",
    status: "Available",
    fuel_type: "Diesel",
    fuel_efficiency_kmpl: "",
    fuel_tank_capacity_liters: "",
    current_fuel_level_liters: "",
    engine_cc: "",
    purchase_year: "",
    current_driver_id: ""
};

const VehiclePage = () => {
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");

    // Sorting
    const [sortConfig, setSortConfig] = useState({ key: "created_at", direction: "desc" });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Bulk Actions
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkStatus, setBulkStatus] = useState("");

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [form, setForm] = useState(initialForm);
    const [currentId, setCurrentId] = useState(null);
    const [formError, setFormError] = useState("");

    const fetchData = async () => {
        try {
            const [vRes, dRes] = await Promise.all([getVehicles(), getAvailableDrivers()]);
            setVehicles(vRes.data || []);
            setDrivers(dRes.data || []);
            setSelectedIds([]);
        } catch (err) {
            console.error("Fetch vehicles error:", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSort = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    // Filter, Sort, and Paginate Data
    const processedVehicles = useMemo(() => {
        let filtered = vehicles.filter(v => {
            const matchesSearch = v.registration_no?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  v.vehicle_name?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = typeFilter === "All" || v.vehicle_type === typeFilter;
            const matchesStatus = statusFilter === "All" || v.status === statusFilter;
            return (matchesSearch || !searchTerm) && matchesType && matchesStatus;
        });

        filtered.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [vehicles, searchTerm, typeFilter, statusFilter, sortConfig]);

    const paginatedVehicles = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return processedVehicles.slice(start, start + itemsPerPage);
    }, [processedVehicles, currentPage]);

    const totalPages = Math.ceil(processedVehicles.length / itemsPerPage);

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
                status: vehicle.status || "Available",
                fuel_type: vehicle.fuel_type || "Diesel",
                fuel_efficiency_kmpl: vehicle.fuel_efficiency_kmpl || "",
                fuel_tank_capacity_liters: vehicle.fuel_tank_capacity_liters || "",
                current_fuel_level_liters: vehicle.current_fuel_level_liters || "",
                engine_cc: vehicle.engine_cc || "",
                purchase_year: vehicle.purchase_year || "",
                current_driver_id: vehicle.current_driver_id || ""
            });
            setIsModalOpen(true);
        } else if (mode === "create") {
            setCurrentId(null);
            setForm(initialForm);
            setIsModalOpen(true);
        }
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
                fuel_efficiency_kmpl: form.fuel_efficiency_kmpl ? Number(form.fuel_efficiency_kmpl) : null,
                fuel_tank_capacity_liters: form.fuel_tank_capacity_liters ? Number(form.fuel_tank_capacity_liters) : null,
                current_fuel_level_liters: form.current_fuel_level_liters ? Number(form.current_fuel_level_liters) : null,
                engine_cc: form.engine_cc ? Number(form.engine_cc) : null,
                purchase_year: form.purchase_year ? Number(form.purchase_year) : null,
                current_driver_id: form.current_driver_id || null
            };

            if (modalMode === "create") {
                await createVehicle(payload);
            } else {
                await updateVehicle(currentId, payload);
            }

            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            const msg = err.response?.data?.message || "Something went wrong";
            setFormError(msg);
        } finally {
            setLoading(false);
        }
    };

    // Soft Deactivation Toggle Handler
    const handleToggleStatus = async (vehicle) => {
        const isRetiredOrInactive = vehicle.status === "Retired" || vehicle.status === "Inactive";
        const nextStatus = isRetiredOrInactive ? "Available" : "Retired";
        const promptMsg = isRetiredOrInactive
            ? `Reactivate vehicle ${vehicle.registration_no}?`
            : `Retire vehicle ${vehicle.registration_no}? (Will mark as Retired, preserving all historical records)`;
        
        if (!window.confirm(promptMsg)) return;

        try {
            await updateVehicleStatus(vehicle.id, nextStatus);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update vehicle status");
        }
    };

    // Bulk Actions Handlers
    const toggleSelectAll = (e) => {
        if (e.target.checked) setSelectedIds(paginatedVehicles.map(v => v.id));
        else setSelectedIds([]);
    };

    const toggleSelectOne = (id) => {
        if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
        else setSelectedIds([...selectedIds, id]);
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Deactivate ${selectedIds.length} selected vehicle(s)?`)) return;
        try {
            await bulkDeleteVehicles(selectedIds);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || "Bulk deactivation failed");
        }
    };

    const handleBulkStatusChange = async () => {
        if (!bulkStatus) return;
        if (!window.confirm(`Change status of ${selectedIds.length} vehicle(s) to ${bulkStatus}?`)) return;
        try {
            await bulkUpdateVehicleStatus(selectedIds, bulkStatus);
            setBulkStatus("");
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || "Bulk status update failed");
        }
    };

    // Export Handlers
    const handleExportCSV = () => {
        const headers = ["ID", "Reg. No", "Name", "Type", "Capacity", "Odometer", "Status", "Acq. Cost"];
        const rows = processedVehicles.map(v => [
            v.id, v.registration_no, v.vehicle_name, v.vehicle_type, 
            v.max_load_capacity || 0, v.odometer || 0, v.status, v.acquisition_cost || 0
        ]);
        
        let csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "transitops_vehicles.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        window.print();
    };

    const formatNumber = (val) => val ? Number(val).toLocaleString() : "—";

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return <HiOutlineChevronDown className="w-3 h-3 opacity-30 inline ml-1" />;
        return sortConfig.direction === "asc" ? <HiOutlineChevronUp className="w-3 h-3 text-accent inline ml-1" /> : <HiOutlineChevronDown className="w-3 h-3 text-accent inline ml-1" />;
    };

    return (
        <div className="animate-fade-in-up space-y-6 max-w-[1600px] mx-auto text-primary">
            
            {/* Top Bar: Actions & Filters */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm print:hidden">
                
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    <Select value={typeFilter} onChange={(e) => {setTypeFilter(e.target.value); setCurrentPage(1);}} options={[{ label: "Type: All", value: "All" }, { label: "Van", value: "Van" }, { label: "Truck", value: "Truck" }, { label: "Mini", value: "Mini" }]} className="w-[140px]" />
                    <Select value={statusFilter} onChange={(e) => {setStatusFilter(e.target.value); setCurrentPage(1);}} options={[{ label: "Status: All", value: "All" }, { label: "Available", value: "Available" }, { label: "On Trip", value: "On Trip" }, { label: "In Shop", value: "In Shop" }, { label: "Retired", value: "Retired" }, { label: "Inactive", value: "Inactive" }]} className="w-[140px]" />
                    <div className="relative flex-1 min-w-[200px]">
                        <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                        <input type="text" placeholder="Search reg. no or model..." value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} className="form-input border text-sm rounded-lg pl-10 pr-4 py-2.5 outline-none transition-colors w-full" />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="secondary" onClick={handleExportCSV} title="Export CSV"><HiOutlineDownload className="w-4 h-4" /></Button>
                    <Button variant="secondary" onClick={handlePrint} title="Print/Export PDF"><HiOutlinePrinter className="w-4 h-4" /></Button>
                    <Button onClick={() => handleOpenModal("create")} className="whitespace-nowrap"><HiOutlinePlus className="w-4 h-4" /> Add Vehicle</Button>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="bg-accent/10 border border-accent/30 p-3 rounded-lg flex flex-wrap items-center justify-between gap-4 animate-fade-in-up print:hidden">
                    <span className="text-sm font-semibold text-accent">{selectedIds.length} vehicle(s) selected</span>
                    <div className="flex items-center gap-3">
                        <select 
                            value={bulkStatus}
                            onChange={(e) => setBulkStatus(e.target.value)}
                            className="form-input border text-sm rounded-lg px-3 py-1.5 outline-none"
                        >
                            <option value="">Change Status...</option>
                            <option value="Available">Available</option>
                            <option value="In Shop">In Shop</option>
                            <option value="Retired">Retired</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                        <Button variant="secondary" onClick={handleBulkStatusChange} disabled={!bulkStatus} className="py-1.5 text-sm">Update</Button>
                        <Button variant="secondary" onClick={handleBulkDelete} className="py-1.5 text-sm text-danger border-red-500/30 hover:bg-danger/10">Deactivate Selected</Button>
                    </div>
                </div>
            )}

            {/* Table Card */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-border bg-sidebar">
                                <th className="px-4 py-4 w-12 text-center print:hidden">
                                    <input type="checkbox" checked={selectedIds.length === paginatedVehicles.length && paginatedVehicles.length > 0} onChange={toggleSelectAll} className="accent-[#C98A1C] cursor-pointer" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-secondary transition-colors" onClick={() => handleSort("registration_no")}>
                                    Reg. No. <SortIcon column="registration_no" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-secondary transition-colors" onClick={() => handleSort("vehicle_name")}>
                                    Name/Model <SortIcon column="vehicle_name" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">
                                    Assigned Driver
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-secondary transition-colors" onClick={() => handleSort("vehicle_type")}>
                                    Type <SortIcon column="vehicle_type" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-secondary transition-colors" onClick={() => handleSort("max_load_capacity")}>
                                    Capacity <SortIcon column="max_load_capacity" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-secondary transition-colors" onClick={() => handleSort("odometer")}>
                                    Odometer <SortIcon column="odometer" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-secondary transition-colors" onClick={() => handleSort("status")}>
                                    Status <SortIcon column="status" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider text-right print:hidden">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {paginatedVehicles.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-muted text-sm">
                                        No vehicles found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedVehicles.map((vehicle) => (
                                    <tr key={vehicle.id} className={`hover:bg-primary/[0.02] transition-colors group ${selectedIds.includes(vehicle.id) ? 'bg-accent/5' : ''} ${vehicle.status === 'Inactive' ? 'opacity-60 bg-sidebar/50' : ''}`}>
                                        <td className="px-4 py-4 text-center print:hidden">
                                            <input type="checkbox" checked={selectedIds.includes(vehicle.id)} onChange={() => toggleSelectOne(vehicle.id)} className="accent-[#C98A1C] cursor-pointer" />
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-accent cursor-pointer hover:underline" onClick={() => navigate(`/vehicles/${vehicle.id}`)}>
                                            <div className="flex items-center gap-3">
                                                {vehicle.photo_url ? (
                                                    <img src={vehicle.photo_url} alt={vehicle.registration_no} className="w-8 h-8 rounded-lg object-cover border border-border" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-sidebar border border-border flex items-center justify-center text-muted">
                                                        <HiOutlineTruck className="w-4 h-4" />
                                                    </div>
                                                )}
                                                <span>{vehicle.registration_no}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary font-medium">{vehicle.vehicle_name}</td>
                                        <td className="px-6 py-4 text-sm text-secondary">
                                            {vehicle.current_driver_name ? (
                                                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                                                    <HiOutlineUser className="w-4 h-4 shrink-0" />
                                                    <span>{vehicle.current_driver_name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted italic">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary">{vehicle.vehicle_type}</td>
                                        <td className="px-6 py-4 text-sm text-secondary">{vehicle.max_load_capacity ? `${vehicle.max_load_capacity} kg` : "—"}</td>
                                        <td className="px-6 py-4 text-sm text-secondary">{formatNumber(vehicle.odometer)} km</td>
                                        <td className="px-6 py-4 text-sm">
                                            <Badge status={vehicle.status}>{vehicle.status}</Badge>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right print:hidden">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => navigate(`/vehicles/${vehicle.id}`)} className="p-1.5 text-secondary hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors" title="View Full Details">
                                                    <HiOutlineEye className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleOpenModal("edit", vehicle)} className="p-1.5 text-secondary hover:text-accent hover:bg-accent/10 rounded transition-colors" title="Edit">
                                                    <HiOutlinePencil className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleToggleStatus(vehicle)} 
                                                    className={`p-1.5 rounded transition-colors ${
                                                        vehicle.status === "Inactive" 
                                                            ? "text-emerald-400 hover:bg-emerald-400/10" 
                                                            : "text-amber-400 hover:bg-amber-400/10"
                                                    }`} 
                                                    title={vehicle.status === "Inactive" ? "Reactivate Vehicle" : "Deactivate Vehicle"}
                                                >
                                                    <HiOutlineSwitchHorizontal className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-border bg-sidebar flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
                        <span className="text-xs text-secondary">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, processedVehicles.length)} of {processedVehicles.length} entries
                        </span>
                        <div className="flex gap-2">
                            <Button variant="secondary" className="px-3 py-1 text-xs" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
                            <span className="px-3 py-1 text-xs text-primary bg-[#2B3038] rounded-md border border-border">{currentPage} / {totalPages}</span>
                            <Button variant="secondary" className="px-3 py-1 text-xs" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create / Edit Modal */}
            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title={modalMode === "create" ? "Add New Vehicle" : "Edit Vehicle"}
                footer={
                    <div className="flex items-center justify-end gap-3 w-full">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" form="vehicle-form" disabled={loading}>{loading ? "Saving..." : modalMode === "create" ? "Add Vehicle" : "Save Changes"}</Button>
                    </div>
                }
            >
                <form id="vehicle-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {formError && (
                        <div className="bg-danger/10 border border-red-500/20 text-danger text-sm p-3 rounded-lg font-medium">
                            {formError}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Registration No." name="registration_no" placeholder="e.g. GJ01AB4523" value={form.registration_no} onChange={handleChange} required error={formError.toLowerCase().includes("unique") ? "Registration number already exists in the system" : ""} />
                        <Input label="Vehicle Name/Model" name="vehicle_name" placeholder="e.g. Express Van 05" value={form.vehicle_name} onChange={handleChange} required />
                        
                        <Select 
                            label="Map Driver Immediately" 
                            name="current_driver_id" 
                            value={form.current_driver_id} 
                            onChange={handleChange} 
                            options={[
                                { label: "-- Select Driver --", value: "" },
                                ...drivers.map(d => ({
                                    label: `${d.name} (${d.license_number}) ${d.current_vehicle ? `[Assigned: ${d.current_vehicle}]` : '[Unassigned]'}`,
                                    value: d.id
                                }))
                            ]}
                        />

                        <Select label="Vehicle Type" name="vehicle_type" value={form.vehicle_type} onChange={handleChange} options={[{ label: "Van", value: "Van" }, { label: "Truck", value: "Truck" }, { label: "Mini", value: "Mini" }]} />
                        <Select label="Fuel Type" name="fuel_type" value={form.fuel_type} onChange={handleChange} options={[{ label: "Diesel", value: "Diesel" }, { label: "Petrol", value: "Petrol" }, { label: "Electric", value: "Electric" }, { label: "CNG", value: "CNG" }]} />
                        <Input label="Capacity (kg)" name="max_load_capacity" type="number" placeholder="e.g. 500" value={form.max_load_capacity} onChange={handleChange} />
                        <Input label="Odometer (km)" name="odometer" type="number" placeholder="e.g. 74000" value={form.odometer} onChange={handleChange} />
                        <Input label="Fuel Efficiency (km/L)" name="fuel_efficiency_kmpl" type="number" step="0.1" placeholder="e.g. 15.4" value={form.fuel_efficiency_kmpl} onChange={handleChange} />
                        <Input label="Fuel Tank Capacity (L)" name="fuel_tank_capacity_liters" type="number" placeholder="e.g. 80" value={form.fuel_tank_capacity_liters} onChange={handleChange} />
                        <Input label="Current Fuel Level (L)" name="current_fuel_level_liters" type="number" placeholder="e.g. 45" value={form.current_fuel_level_liters} onChange={handleChange} />
                        <Input label="Acquisition Cost" name="acquisition_cost" type="number" placeholder="e.g. 620000" value={form.acquisition_cost} onChange={handleChange} />
                        <Input label="Engine CC" name="engine_cc" type="number" placeholder="e.g. 1500" value={form.engine_cc} onChange={handleChange} min="1" />
                        <Input label="Purchase Year" name="purchase_year" type="number" placeholder="e.g. 2022" value={form.purchase_year} onChange={handleChange} min="1900" max={new Date().getFullYear() + 1} />
                        {modalMode === "edit" && (
                            <Select label="Status" name="status" value={form.status} onChange={handleChange} options={[{ label: "Available", value: "Available" }, { label: "On Trip", value: "On Trip" }, { label: "In Shop", value: "In Shop" }, { label: "Retired", value: "Retired" }, { label: "Inactive", value: "Inactive" }]} />
                        )}
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default VehiclePage;