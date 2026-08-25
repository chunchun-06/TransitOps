import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
    HiOutlineSearch, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, 
    HiOutlineDownload, HiOutlinePrinter, HiX, HiOutlineChevronDown, 
    HiOutlineChevronUp, HiOutlineDocumentReport, HiOutlineUser,
    HiOutlineEye, HiOutlineSwitchHorizontal, HiOutlineTruck
} from "react-icons/hi";
import { 
    getDrivers, createDriver, updateDriver, deleteDriver, 
    bulkDeleteDrivers, bulkUpdateDriverStatus, updateDriverStatus 
} from "../../api/driver.api";
import { getVehicles } from "../../api/vehicle.api";
import { Button, Input, Select, Badge, Modal } from "../../components/common";

const initialForm = {
    name: "",
    license_number: "",
    license_category: "Commercial",
    contact_number: "",
    license_expiry: "",
    safety_score: 100,
    status: "Available",
    // Vehicle mapping & co-registration options
    vehicle_option: "existing", // "existing" | "new" | "none"
    assigned_vehicle_id: "",
    vehicle_registration_no: "",
    vehicle_name: "",
    vehicle_type: "Van",
    fuel_type: "Diesel"
};

const Drivers = () => {
    const navigate = useNavigate();
    const [drivers, setDrivers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filters & Search
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
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
            const [dRes, vRes] = await Promise.all([getDrivers(), getVehicles()]);
            setDrivers(dRes.data || []);
            setVehicles(vRes.data || []);
            setSelectedIds([]);
        } catch (err) {
            console.error("Fetch data error:", err);
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
    const processedDrivers = useMemo(() => {
        let filtered = drivers.filter(d => {
            const matchesSearch = d.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  d.license_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  d.assigned_vehicle?.toLowerCase().includes(searchTerm.toLowerCase());
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

    // Form Handlers
    const handleOpenModal = (mode = "create", driver = null) => {
        setModalMode(mode);
        setFormError("");
        if (mode === "edit" && driver) {
            setCurrentId(driver.id);
            setForm({
                name: driver.name || "",
                license_number: driver.license_number || "",
                license_category: driver.license_category || "Commercial",
                contact_number: driver.contact_number || "",
                license_expiry: driver.license_expiry ? new Date(driver.license_expiry).toISOString().split('T')[0] : "",
                safety_score: driver.safety_score || 100,
                status: driver.status || "Available",
                vehicle_option: driver.assigned_vehicle_id ? "existing" : "none",
                assigned_vehicle_id: driver.assigned_vehicle_id || "",
                vehicle_registration_no: "",
                vehicle_name: "",
                vehicle_type: "Van",
                fuel_type: "Diesel"
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
                name: form.name,
                license_number: form.license_number,
                license_category: form.license_category,
                license_expiry: form.license_expiry,
                contact_number: form.contact_number,
                safety_score: Number(form.safety_score),
                status: form.status,
            };

            if (form.vehicle_option === "existing") {
                payload.assigned_vehicle_id = form.assigned_vehicle_id || null;
            } else if (form.vehicle_option === "new") {
                if (!form.vehicle_registration_no) {
                    setFormError("Vehicle Registration Number is required to register vehicle together.");
                    setLoading(false);
                    return;
                }
                payload.vehicle_registration_no = form.vehicle_registration_no;
                payload.vehicle_name = form.vehicle_name;
                payload.vehicle_type = form.vehicle_type;
                payload.fuel_type = form.fuel_type;
            } else if (form.vehicle_option === "none") {
                payload.assigned_vehicle_id = null;
            }

            if (modalMode === "create") {
                await createDriver(payload);
            } else {
                await updateDriver(currentId, payload);
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

    // Soft Deactivation / Status Toggle Handler
    const handleToggleStatus = async (driver) => {
        const nextStatus = driver.status === "Inactive" ? "Available" : "Inactive";
        const promptMsg = driver.status === "Inactive"
            ? `Reactivate driver ${driver.name}?`
            : `Deactivate driver ${driver.name}? (Will set status to Inactive without losing trip history)`;
        
        if (!window.confirm(promptMsg)) return;

        try {
            await updateDriverStatus(driver.id, nextStatus);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update status");
        }
    };

    // Explicit Status Change Handler from Table Dropdown
    const handleQuickStatusChange = async (driverId, newStatus) => {
        try {
            await updateDriverStatus(driverId, newStatus);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to change status");
        }
    };

    // Bulk Actions Handlers
    const toggleSelectAll = (e) => {
        if (e.target.checked) setSelectedIds(paginatedDrivers.map(d => d.id));
        else setSelectedIds([]);
    };

    const toggleSelectOne = (id) => {
        if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
        else setSelectedIds([...selectedIds, id]);
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Deactivate ${selectedIds.length} driver(s)?`)) return;
        try {
            await bulkDeleteDrivers(selectedIds);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || "Bulk deactivation failed");
        }
    };

    const handleBulkStatusChange = async () => {
        if (!bulkStatus) return;
        if (!window.confirm(`Change status of ${selectedIds.length} driver(s) to ${bulkStatus}?`)) return;
        try {
            await bulkUpdateDriverStatus(selectedIds, bulkStatus);
            setBulkStatus("");
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || "Bulk update failed");
        }
    };

    // Export Handlers
    const handleExportCSV = () => {
        const headers = ["ID", "Name", "Assigned Vehicle", "License No", "Category", "Phone", "Safety Score", "Status", "Expiry Date"];
        const rows = processedDrivers.map(d => [
            d.id, `"${d.name}"`, `"${d.assigned_vehicle || 'None'}"`, d.license_number, d.license_category, 
            d.contact_number, d.safety_score, d.status, d.license_expiry ? new Date(d.license_expiry).toLocaleDateString() : "—"
        ]);
        
        let csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "transitops_drivers.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        window.print();
    };

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return <HiOutlineChevronDown className="w-3 h-3 opacity-30 inline ml-1" />;
        return sortConfig.direction === "asc" ? <HiOutlineChevronUp className="w-3 h-3 text-accent inline ml-1" /> : <HiOutlineChevronDown className="w-3 h-3 text-accent inline ml-1" />;
    };

    return (
        <div className="animate-fade-in-up space-y-6 max-w-[1600px] mx-auto text-primary">
            
            {/* Top Bar: Actions & Filters */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm print:hidden">
                
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    <Select value={categoryFilter} onChange={(e) => {setCategoryFilter(e.target.value); setCurrentPage(1);}} options={[{ label: "Category: All", value: "All" }, { label: "Commercial", value: "Commercial" }, { label: "Heavy Duty", value: "Heavy Duty" }, { label: "Standard", value: "Standard" }]} className="w-[150px]" />
                    <Select value={statusFilter} onChange={(e) => {setStatusFilter(e.target.value); setCurrentPage(1);}} options={[{ label: "Status: All", value: "All" }, { label: "Available", value: "Available" }, { label: "On Trip", value: "On Trip" }, { label: "Off Duty", value: "Off Duty" }, { label: "Suspended", value: "Suspended" }, { label: "Inactive", value: "Inactive" }]} className="w-[140px]" />
                    <div className="relative flex-1 min-w-[200px]">
                        <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                        <input type="text" placeholder="Search name, vehicle or license..." value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} className="form-input border text-sm rounded-lg pl-10 pr-4 py-2.5 outline-none transition-colors w-full" />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="secondary" onClick={handleExportCSV} title="Export CSV"><HiOutlineDownload className="w-4 h-4" /></Button>
                    <Button variant="secondary" onClick={handlePrint} title="Print/Export PDF"><HiOutlinePrinter className="w-4 h-4" /></Button>
                    <Button onClick={() => handleOpenModal("create")} className="whitespace-nowrap"><HiOutlinePlus className="w-4 h-4" /> Add Driver & Vehicle</Button>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="bg-accent/10 border border-accent/30 p-3 rounded-lg flex flex-wrap items-center justify-between gap-4 animate-fade-in-up print:hidden">
                    <span className="text-sm font-semibold text-accent">{selectedIds.length} driver(s) selected</span>
                    <div className="flex items-center gap-3">
                        <select 
                            value={bulkStatus}
                            onChange={(e) => setBulkStatus(e.target.value)}
                            className="form-input border text-sm rounded-lg px-3 py-1.5 outline-none"
                        >
                            <option value="">Change Status...</option>
                            <option value="Available">Available</option>
                            <option value="Off Duty">Off Duty</option>
                            <option value="Suspended">Suspended</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                        <Button variant="secondary" onClick={handleBulkStatusChange} disabled={!bulkStatus} className="py-1.5 text-sm">Update</Button>
                        <Button variant="secondary" onClick={handleBulkDelete} className="py-1.5 text-sm text-danger border-danger/30 hover:bg-danger/10">Deactivate Selected</Button>
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
                                    <input type="checkbox" checked={selectedIds.length === paginatedDrivers.length && paginatedDrivers.length > 0} onChange={toggleSelectAll} className="accent-accent cursor-pointer" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort("name")}>
                                    Driver Name <SortIcon column="name" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">
                                    Mapped Vehicle
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort("license_number")}>
                                    License No. <SortIcon column="license_number" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort("license_category")}>
                                    Category <SortIcon column="license_category" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">
                                    Phone
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort("safety_score")}>
                                    Safety Score <SortIcon column="safety_score" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort("license_expiry")}>
                                    Expiry Date <SortIcon column="license_expiry" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort("status")}>
                                    Status <SortIcon column="status" />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider text-right print:hidden">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {paginatedDrivers.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-6 py-12 text-center text-muted text-sm">
                                        No drivers found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedDrivers.map((driver) => {
                                    const expDate = driver.license_expiry ? new Date(driver.license_expiry) : null;
                                    if (expDate) expDate.setHours(23,59,59,999);
                                    const isExpired = expDate && expDate < new Date();

                                    return (
                                    <tr key={driver.id} className={`hover:bg-primary/[0.02] transition-colors group ${selectedIds.includes(driver.id) ? 'bg-accent/5' : ''} ${driver.status === 'Inactive' ? 'opacity-60 bg-sidebar/50' : ''}`}>
                                        <td className="px-4 py-4 text-center print:hidden">
                                            <input type="checkbox" checked={selectedIds.includes(driver.id)} onChange={() => toggleSelectOne(driver.id)} className="accent-accent cursor-pointer" />
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-accent cursor-pointer hover:underline" onClick={() => navigate(`/drivers/${driver.id}`)}>
                                            <div className="flex items-center gap-3">
                                                {driver.photo_url ? (
                                                    <img src={driver.photo_url} alt={driver.name} className="w-8 h-8 rounded-full object-cover border border-border" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-sidebar border border-border flex items-center justify-center text-muted">
                                                        <HiOutlineUser className="w-4 h-4" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-bold text-primary hover:text-accent">{driver.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary">
                                            {driver.assigned_vehicle ? (
                                                <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg text-blue-400 font-medium text-xs">
                                                    {driver.assigned_vehicle_photo ? (
                                                        <img src={driver.assigned_vehicle_photo} alt={driver.assigned_vehicle} className="w-5 h-5 rounded object-cover" />
                                                    ) : (
                                                        <HiOutlineTruck className="w-4 h-4 shrink-0" />
                                                    )}
                                                    <div>
                                                        <span className="font-bold">{driver.assigned_vehicle}</span>
                                                        {driver.assigned_vehicle_name && <span className="text-[10px] text-muted ml-1">({driver.assigned_vehicle_name})</span>}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-muted italic text-xs">No Vehicle Assigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-primary font-mono">{driver.license_number}</td>
                                        <td className="px-6 py-4 text-sm text-secondary">{driver.license_category || "—"}</td>
                                        <td className="px-6 py-4 text-sm text-secondary">{driver.contact_number || "—"}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${Number(driver.safety_score) >= 90 ? 'bg-success/10 text-success' : Number(driver.safety_score) >= 70 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>
                                                {driver.safety_score}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={isExpired ? 'text-danger font-semibold' : 'text-secondary'}>
                                                {driver.license_expiry ? new Date(driver.license_expiry).toLocaleDateString() : "—"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <select
                                                value={isExpired ? "Suspended" : driver.status}
                                                onChange={(e) => handleQuickStatusChange(driver.id, e.target.value)}
                                                disabled={isExpired}
                                                className="bg-sidebar border border-border text-xs rounded-lg px-2 py-1 outline-none text-primary font-semibold cursor-pointer"
                                            >
                                                <option value="Available">Available</option>
                                                <option value="On Trip">On Trip</option>
                                                <option value="Off Duty">Off Duty</option>
                                                <option value="Suspended">Suspended</option>
                                                <option value="Inactive">Inactive</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right print:hidden">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => navigate(`/drivers/${driver.id}`)} className="p-1.5 text-muted hover:text-info hover:bg-info/10 rounded transition-colors" title="View Full Details">
                                                    <HiOutlineEye className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleOpenModal("edit", driver)} className="p-1.5 text-muted hover:text-accent hover:bg-accent/10 rounded transition-colors" title="Edit">
                                                    <HiOutlinePencil className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleToggleStatus(driver)} 
                                                    className={`p-1.5 rounded transition-colors ${
                                                        driver.status === "Inactive" 
                                                            ? "text-emerald-400 hover:bg-emerald-400/10" 
                                                            : "text-amber-400 hover:bg-amber-400/10"
                                                    }`} 
                                                    title={driver.status === "Inactive" ? "Reactivate Driver" : "Deactivate Driver"}
                                                >
                                                    <HiOutlineSwitchHorizontal className="w-4 h-4" />
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

                {/* Pagination Footer */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-border bg-sidebar flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
                        <span className="text-xs text-secondary">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, processedDrivers.length)} of {processedDrivers.length} entries
                        </span>
                        <div className="flex gap-2">
                            <Button variant="secondary" className="px-3 py-1 text-xs" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
                            <span className="px-3 py-1 text-xs text-primary bg-border rounded-md border border-border">{currentPage} / {totalPages}</span>
                            <Button variant="secondary" className="px-3 py-1 text-xs" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create / Edit Modal with Co-Registration */}
            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title={modalMode === "create" ? "Register Driver & Map Vehicle" : "Edit Driver Profile"}
                footer={
                    <div className="flex items-center justify-end gap-3 w-full">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" form="driver-form" disabled={loading}>{loading ? "Saving..." : modalMode === "create" ? "Register Driver & Vehicle" : "Save Changes"}</Button>
                    </div>
                }
            >
                <form id="driver-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {formError && (
                        <div className="bg-danger/10 border border-danger/20 text-danger text-sm p-3 rounded-lg font-medium">
                            {formError}
                        </div>
                    )}
                    
                    {/* Section 1: Driver Information */}
                    <div>
                        <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-3">Driver Personal & License Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Full Name" name="name" placeholder="e.g. John Doe" value={form.name} onChange={handleChange} required />
                            <Input label="License No." name="license_number" placeholder="e.g. DL-12345678" value={form.license_number} onChange={handleChange} required />
                            <Select label="License Category" name="license_category" value={form.license_category} onChange={handleChange} options={[{ label: "Commercial", value: "Commercial" }, { label: "Heavy Duty", value: "Heavy Duty" }, { label: "Standard", value: "Standard" }]} />
                            <Input label="License Expiry" name="license_expiry" type="date" value={form.license_expiry} onChange={handleChange} required />
                            <Input label="Phone Number" name="contact_number" type="tel" placeholder="e.g. +91 98765 43210" value={form.contact_number} onChange={handleChange} />
                            <Input label="Safety Score (0-100)" name="safety_score" type="number" min="0" max="100" value={form.safety_score} onChange={handleChange} />
                            
                            {modalMode === "edit" && (
                                <Select label="Status" name="status" value={form.status} onChange={handleChange} options={[{ label: "Available", value: "Available" }, { label: "On Trip", value: "On Trip" }, { label: "Off Duty", value: "Off Duty" }, { label: "Suspended", value: "Suspended" }, { label: "Inactive", value: "Inactive" }]} className="md:col-span-2" />
                            )}
                        </div>
                    </div>

                    {/* Section 2: Driver-Vehicle Mapping & Co-Registration */}
                    <div className="border-t border-border pt-4">
                        <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-3 flex items-center gap-2">
                            <HiOutlineTruck className="w-4 h-4 text-accent" /> Vehicle Mapping & Co-Registration
                        </h4>
                        
                        <div className="flex gap-4 mb-4">
                            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="vehicle_option" 
                                    value="existing" 
                                    checked={form.vehicle_option === "existing"} 
                                    onChange={handleChange}
                                    className="accent-accent"
                                />
                                Map Existing Vehicle
                            </label>
                            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="vehicle_option" 
                                    value="new" 
                                    checked={form.vehicle_option === "new"} 
                                    onChange={handleChange}
                                    className="accent-accent"
                                />
                                Register New Vehicle Together
                            </label>
                            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="vehicle_option" 
                                    value="none" 
                                    checked={form.vehicle_option === "none"} 
                                    onChange={handleChange}
                                    className="accent-accent"
                                />
                                No Vehicle Now
                            </label>
                        </div>

                        {form.vehicle_option === "existing" && (
                            <Select 
                                label="Select Vehicle to Assign" 
                                name="assigned_vehicle_id" 
                                value={form.assigned_vehicle_id} 
                                onChange={handleChange} 
                                options={[
                                    { label: "-- Select Vehicle from Fleet --", value: "" },
                                    ...vehicles.map(v => ({
                                        label: `${v.registration_no} - ${v.vehicle_name} (${v.vehicle_type}) ${v.current_driver_name ? `[Current Driver: ${v.current_driver_name}]` : '[Unassigned]'}`,
                                        value: v.id
                                    }))
                                ]}
                            />
                        )}

                        {form.vehicle_option === "new" && (
                            <div className="bg-sidebar p-4 rounded-xl border border-border space-y-3">
                                <p className="text-xs text-muted font-medium">Create a new vehicle record and map it directly to this driver in a single step:</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Input label="Vehicle Reg No." name="vehicle_registration_no" placeholder="e.g. MH02CD9999" value={form.vehicle_registration_no} onChange={handleChange} required />
                                    <Input label="Vehicle Name/Model" name="vehicle_name" placeholder="e.g. Express Hauler 01" value={form.vehicle_name} onChange={handleChange} />
                                    <Select label="Vehicle Type" name="vehicle_type" value={form.vehicle_type} onChange={handleChange} options={[{ label: "Van", value: "Van" }, { label: "Truck", value: "Truck" }, { label: "Mini", value: "Mini" }]} />
                                    <Select label="Fuel Type" name="fuel_type" value={form.fuel_type} onChange={handleChange} options={[{ label: "Diesel", value: "Diesel" }, { label: "Petrol", value: "Petrol" }, { label: "Electric", value: "Electric" }, { label: "CNG", value: "CNG" }]} />
                                </div>
                            </div>
                        )}
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Drivers;Drivers;