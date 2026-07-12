import { useEffect, useState, useMemo } from "react";
import { HiOutlineSearch, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineDownload, HiOutlinePrinter, HiX, HiOutlineChevronDown, HiOutlineChevronUp, HiOutlineDocumentReport, HiOutlineUser } from "react-icons/hi";
import { getDrivers, createDriver, updateDriver, deleteDriver, bulkDeleteDrivers, bulkUpdateDriverStatus } from "../../api/driver.api";
import { Button, Input, Select, Badge, Modal } from "../../components/common";

const initialForm = {
    name: "",
    license_number: "",
    license_category: "Commercial",
    contact_number: "",
    license_expiry: "",
    safety_score: 100,
    status: "Available"
};

const Drivers = () => {
    const [drivers, setDrivers] = useState([]);
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
    const [modalMode, setModalMode] = useState("create"); // create, edit, details
    const [form, setForm] = useState(initialForm);
    const [currentId, setCurrentId] = useState(null);
    const [formError, setFormError] = useState("");
    const [selectedDriverDetails, setSelectedDriverDetails] = useState(null);

    const fetchDrivers = async () => {
        try {
            const res = await getDrivers();
            setDrivers(res.data || []);
            setSelectedIds([]);
        } catch (err) {
            console.error("Fetch drivers error:", err);
        }
    };

    useEffect(() => {
        fetchDrivers();
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
                                  d.license_number?.toLowerCase().includes(searchTerm.toLowerCase());
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
                status: driver.status || "Available"
            });
            setIsModalOpen(true);
        } else if (mode === "create") {
            setCurrentId(null);
            setForm(initialForm);
            setIsModalOpen(true);
        } else if (mode === "details" && driver) {
            setSelectedDriverDetails(driver);
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
                safety_score: Number(form.safety_score),
            };

            if (modalMode === "create") {
                await createDriver(payload);
            } else {
                await updateDriver(currentId, payload);
            }

            setIsModalOpen(false);
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
            alert(err.response?.data?.message || "Failed to delete");
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
        if (!window.confirm(`Delete ${selectedIds.length} drivers?`)) return;
        try {
            await bulkDeleteDrivers(selectedIds);
            fetchDrivers();
        } catch (err) {
            alert(err.response?.data?.message || "Bulk delete failed");
        }
    };

    const handleBulkStatusChange = async () => {
        if (!bulkStatus) return;
        if (!window.confirm(`Change status of ${selectedIds.length} drivers to ${bulkStatus}?`)) return;
        try {
            await bulkUpdateDriverStatus(selectedIds, bulkStatus);
            setBulkStatus("");
            fetchDrivers();
        } catch (err) {
            alert(err.response?.data?.message || "Bulk update failed");
        }
    };

    // Export Handlers
    const handleExportCSV = () => {
        const headers = ["ID", "Name", "License No", "Category", "Phone", "Safety Score", "Status", "Expiry Date"];
        const rows = processedDrivers.map(d => [
            d.id, `"${d.name}"`, d.license_number, d.license_category, 
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
                    <Select value={statusFilter} onChange={(e) => {setStatusFilter(e.target.value); setCurrentPage(1);}} options={[{ label: "Status: All", value: "All" }, { label: "Available", value: "Available" }, { label: "On Trip", value: "On Trip" }, { label: "Off Duty", value: "Off Duty" }, { label: "Suspended", value: "Suspended" }]} className="w-[140px]" />
                    <div className="relative flex-1 min-w-[200px]">
                        <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                        <input type="text" placeholder="Search name or license..." value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} className="bg-main border border-border text-sm text-primary rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-accent transition-colors w-full placeholder-gray-500" />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="secondary" onClick={handleExportCSV} title="Export CSV"><HiOutlineDownload className="w-4 h-4" /></Button>
                    <Button variant="secondary" onClick={handlePrint} title="Print/Export PDF"><HiOutlinePrinter className="w-4 h-4" /></Button>
                    <Button onClick={() => handleOpenModal("create")} className="whitespace-nowrap"><HiOutlinePlus className="w-4 h-4" /> Add Driver</Button>
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
                            className="bg-card border border-border text-sm text-primary rounded-lg px-3 py-1.5 focus:border-accent outline-none"
                        >
                            <option value="">Change Status...</option>
                            <option value="Available">Available</option>
                            <option value="Off Duty">Off Duty</option>
                            <option value="Suspended">Suspended</option>
                        </select>
                        <Button variant="secondary" onClick={handleBulkStatusChange} disabled={!bulkStatus} className="py-1.5 text-sm">Update</Button>
                        <Button variant="secondary" onClick={handleBulkDelete} className="py-1.5 text-sm text-danger border-danger/30 hover:bg-danger/10">Delete Selected</Button>
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
                                    <td colSpan={9} className="px-6 py-12 text-center text-muted text-sm">
                                        No drivers found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedDrivers.map((driver) => {
                                    const isExpired = driver.license_expiry && new Date(driver.license_expiry) < new Date();
                                    return (
                                    <tr key={driver.id} className={`hover:bg-primary/[0.02] transition-colors group ${selectedIds.includes(driver.id) ? 'bg-accent/5' : ''}`}>
                                        <td className="px-4 py-4 text-center print:hidden">
                                            <input type="checkbox" checked={selectedIds.includes(driver.id)} onChange={() => toggleSelectOne(driver.id)} className="accent-accent cursor-pointer" />
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-accent cursor-pointer hover:underline" onClick={() => handleOpenModal("details", driver)}>{driver.name}</td>
                                        <td className="px-6 py-4 text-sm text-primary">{driver.license_number}</td>
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
                                            <Badge status={isExpired ? "Suspended" : driver.status}>{isExpired ? "Expired" : driver.status}</Badge>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right print:hidden">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleOpenModal("details", driver)} className="p-1.5 text-muted hover:text-info hover:bg-info/10 rounded transition-colors" title="View Details">
                                                    <HiOutlineDocumentReport className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleOpenModal("edit", driver)} className="p-1.5 text-muted hover:text-accent hover:bg-accent/10 rounded transition-colors" title="Edit">
                                                    <HiOutlinePencil className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(driver.id)} className="p-1.5 text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors" title="Delete">
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

            {/* Create / Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalMode === "create" ? "Add New Driver" : "Edit Driver"}>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {formError && (
                        <div className="bg-danger/10 border border-danger/20 text-danger text-sm p-3 rounded-lg font-medium">
                            {formError}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Input label="Full Name" name="name" placeholder="e.g. John Doe" value={form.name} onChange={handleChange} required />
                        <Input label="License No." name="license_number" placeholder="e.g. DL-12345678" value={form.license_number} onChange={handleChange} required error={formError.toLowerCase().includes("unique") ? "License number already exists" : ""} />
                        <Select label="License Category" name="license_category" value={form.license_category} onChange={handleChange} options={[{ label: "Commercial", value: "Commercial" }, { label: "Heavy Duty", value: "Heavy Duty" }, { label: "Standard", value: "Standard" }]} />
                        <Input label="License Expiry" name="license_expiry" type="date" value={form.license_expiry} onChange={handleChange} required />
                        <Input label="Phone Number" name="contact_number" type="tel" placeholder="e.g. +1 234 567 8900" value={form.contact_number} onChange={handleChange} />
                        <Input label="Safety Score" name="safety_score" type="number" min="0" max="100" value={form.safety_score} onChange={handleChange} />
                        
                        {modalMode === "edit" && (
                            <Select label="Status" name="status" value={form.status} onChange={handleChange} options={[{ label: "Available", value: "Available" }, { label: "On Trip", value: "On Trip" }, { label: "Off Duty", value: "Off Duty" }, { label: "Suspended", value: "Suspended" }]} className="md:col-span-2" />
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-4 pt-5 border-t border-border">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>{loading ? "Saving..." : modalMode === "create" ? "Add Driver" : "Save Changes"}</Button>
                    </div>
                </form>
            </Modal>

            {/* Driver Details Drawer */}
            {selectedDriverDetails && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={() => setSelectedDriverDetails(null)}></div>
                    <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-sidebar border-l border-border shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${selectedDriverDetails ? 'translate-x-0' : 'translate-x-full'}`}>
                        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0 bg-card">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-accent/20 border border-accent/40 flex flex-shrink-0 items-center justify-center text-accent overflow-hidden">
                                    <HiOutlineUser className="w-7 h-7" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-lg text-primary leading-tight">{selectedDriverDetails.name}</h2>
                                    <p className="text-xs text-secondary font-medium mt-0.5">{selectedDriverDetails.email || "No email linked"}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedDriverDetails(null)} className="p-2 text-muted hover:text-primary bg-border/50 hover:bg-border rounded-full transition-colors">
                                <HiX className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest border-b border-border pb-2">Status & Contact</h3>
                                <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border">
                                    <span className="text-sm text-secondary">Current Status</span>
                                    <Badge status={selectedDriverDetails.status}>{selectedDriverDetails.status}</Badge>
                                </div>
                                <div className="bg-card p-4 rounded-xl border border-border">
                                    <p className="text-xs text-muted mb-1">Phone Number</p>
                                    <p className="text-sm font-semibold text-primary">{selectedDriverDetails.contact_number || "—"}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest border-b border-border pb-2">License Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-card p-4 rounded-xl border border-border">
                                        <p className="text-xs text-muted mb-1">License No.</p>
                                        <p className="text-sm font-semibold text-primary">{selectedDriverDetails.license_number}</p>
                                    </div>
                                    <div className="bg-card p-4 rounded-xl border border-border">
                                        <p className="text-xs text-muted mb-1">Category</p>
                                        <p className="text-sm font-semibold text-primary">{selectedDriverDetails.license_category || "—"}</p>
                                    </div>
                                    <div className="bg-card p-4 rounded-xl border border-border col-span-2">
                                        <p className="text-xs text-muted mb-1">Expiry Date</p>
                                        <p className="text-sm font-semibold text-primary">
                                            {selectedDriverDetails.license_expiry ? new Date(selectedDriverDetails.license_expiry).toLocaleDateString() : "—"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest border-b border-border pb-2">Performance & Assignment</h3>
                                <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border">
                                    <span className="text-sm text-secondary">Safety Score</span>
                                    <span className={`px-3 py-1 rounded-lg text-sm font-bold ${Number(selectedDriverDetails.safety_score) >= 90 ? 'bg-success/10 text-success' : Number(selectedDriverDetails.safety_score) >= 70 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>
                                        {selectedDriverDetails.safety_score} / 100
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-card p-4 rounded-xl border border-border">
                                        <p className="text-xs text-muted mb-1">Trips Completed</p>
                                        <p className="text-sm font-semibold text-primary">{selectedDriverDetails.trip_count || 0}</p>
                                    </div>
                                    <div className="bg-card p-4 rounded-xl border border-border">
                                        <p className="text-xs text-muted mb-1">Assigned Vehicle</p>
                                        <p className="text-sm font-semibold text-info">{selectedDriverDetails.assigned_vehicle || "None"}</p>
                                    </div>
                                </div>
                                <div className="bg-card p-4 rounded-xl border border-border flex justify-between">
                                    <div>
                                        <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Created At</p>
                                        <p className="text-xs font-semibold text-secondary">{new Date(selectedDriverDetails.created_at || Date.now()).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Updated At</p>
                                        <p className="text-xs font-semibold text-secondary">{new Date(selectedDriverDetails.updated_at || Date.now()).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-border bg-card shrink-0">
                            <Button 
                                className="w-full justify-center" 
                                onClick={() => {
                                    const driver = selectedDriverDetails;
                                    setSelectedDriverDetails(null);
                                    handleOpenModal("edit", driver);
                                }}
                            >
                                Edit Driver Profile
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Drivers;