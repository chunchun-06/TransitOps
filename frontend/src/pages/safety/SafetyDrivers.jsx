import { useEffect, useState, useMemo } from "react";
import { HiOutlineSearch, HiOutlineShieldCheck, HiX, HiOutlinePlus, HiOutlineTrash, HiOutlineChevronDown, HiOutlineChevronUp } from "react-icons/hi";
import { getDrivers } from "../../api/driver.api";
import { getAllDriverSafety, upsertDriverSafety } from "../../api/safety.api";
import { Badge, Select } from "../../components/common";

const emptyAccident = { date: "", description: "", driver_survived: "Survived", goods_damaged: false, goods_details: "" };

const SafetyDrivers = () => {
    const [drivers, setDrivers] = useState([]);
    const [safetyMap, setSafetyMap] = useState({});
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [selectedDriver, setSelectedDriver] = useState(null);
    const [safetyForm, setSafetyForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState("");

    const fetchAll = async () => {
        try {
            const [driversRes, safetyRes] = await Promise.all([
                getDrivers().catch(() => ({ data: [] })),
                getAllDriverSafety().catch(() => ({ data: [] })),
            ]);
            setDrivers(driversRes.data || []);
            const map = {};
            (safetyRes.data || []).forEach(s => { map[s.driver_id] = s; });
            setSafetyMap(map);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleSort = (key) => {
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc" }));
    };

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return <HiOutlineChevronDown className="w-3 h-3 opacity-30 inline ml-1" />;
        return sortConfig.direction === "asc"
            ? <HiOutlineChevronUp className="w-3 h-3 text-accent inline ml-1" />
            : <HiOutlineChevronDown className="w-3 h-3 text-accent inline ml-1" />;
    };

    const processed = useMemo(() => {
        let list = drivers.filter(d => {
            const s = searchTerm.toLowerCase();
            const match = !s || d.name?.toLowerCase().includes(s) || d.license_number?.toLowerCase().includes(s);
            const statusMatch = statusFilter === "All" || d.status === statusFilter;
            return match && statusMatch;
        });
        list.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
        return list;
    }, [drivers, searchTerm, statusFilter, sortConfig]);

    const paginated = useMemo(() => processed.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [processed, currentPage]);
    const totalPages = Math.ceil(processed.length / itemsPerPage) || 1;

    const openDrawer = (driver) => {
        setSelectedDriver(driver);
        setSaveMsg("");
        const existing = safetyMap[driver.id];
        setSafetyForm(existing ? {
            license_expiry_date: existing.license_expiry_date ? existing.license_expiry_date.split("T")[0] : "",
            trip_failures: existing.trip_failures || 0,
            total_accidents: existing.total_accidents || 0,
            accident_records: existing.accident_records || [],
            goods_damaged_incidents: existing.goods_damaged_incidents || 0,
            goods_damage_notes: existing.goods_damage_notes || "",
            notes: existing.notes || "",
        } : {
            license_expiry_date: driver.license_expiry ? driver.license_expiry.split("T")[0] : "",
            trip_failures: 0, total_accidents: 0,
            accident_records: [],
            goods_damaged_incidents: 0, goods_damage_notes: "", notes: "",
        });
    };

    const handleFormChange = (e) => {
        setSafetyForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const addAccident = () => {
        setSafetyForm(prev => ({ ...prev, accident_records: [...(prev.accident_records || []), { ...emptyAccident }] }));
    };

    const updateAccident = (idx, field, value) => {
        setSafetyForm(prev => {
            const records = [...prev.accident_records];
            records[idx] = { ...records[idx], [field]: value };
            return { ...prev, accident_records: records, total_accidents: records.length };
        });
    };

    const removeAccident = (idx) => {
        setSafetyForm(prev => {
            const records = prev.accident_records.filter((_, i) => i !== idx);
            return { ...prev, accident_records: records, total_accidents: records.length };
        });
    };

    const handleSave = async () => {
        if (!selectedDriver) return;
        setSaving(true); setSaveMsg("");
        try {
            await upsertDriverSafety({ driver_id: selectedDriver.id, ...safetyForm });
            await fetchAll();
            setSaveMsg("✅ Safety record saved successfully.");
        } catch (e) {
            setSaveMsg("❌ Failed to save. Please try again.");
        } finally { setSaving(false); }
    };

    const safetyScore = (driver) => {
        const s = safetyMap[driver.id];
        if (!s) return null;
        const accidents = Number(s.total_accidents || 0);
        const failures = Number(s.trip_failures || 0);
        const base = 100 - accidents * 10 - failures * 5;
        return Math.max(0, base);
    };

    return (
        <div className="animate-fade-in-up space-y-6 max-w-[1600px] mx-auto text-primary">

            {/* Header Banner */}
            <div className="bg-success/10 border border-success/20 rounded-xl px-5 py-3 flex items-center gap-3">
                <HiOutlineShieldCheck className="w-5 h-5 text-success flex-shrink-0" />
                <div>
                    <p className="text-xs font-bold text-success uppercase tracking-wider">Safety Officer — Driver Safety Module</p>
                    <p className="text-xs text-secondary mt-0.5">View all registered drivers and manage safety records, accident history, and license compliance.</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "Total Drivers", value: drivers.length, color: "text-primary" },
                    { label: "Safety Records", value: Object.keys(safetyMap).length, color: "text-success" },
                    { label: "Total Accidents", value: Object.values(safetyMap).reduce((s, r) => s + Number(r.total_accidents || 0), 0), color: "text-danger" },
                    { label: "Trip Failures", value: Object.values(safetyMap).reduce((s, r) => s + Number(r.trip_failures || 0), 0), color: "text-warning" },
                ].map(stat => (
                    <div key={stat.label} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                        <p className="text-xs text-muted uppercase tracking-wider font-bold mb-1">{stat.label}</p>
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    <Select
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                        options={[
                            { label: "Status: All", value: "All" },
                            { label: "Available", value: "Available" },
                            { label: "On Trip", value: "On Trip" },
                            { label: "Off Duty", value: "Off Duty" },
                            { label: "Suspended", value: "Suspended" },
                        ]}
                        className="w-[160px]"
                    />
                    <div className="relative flex-1 min-w-[220px]">
                        <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                        <input type="text" placeholder="Search driver name or license..." value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="form-input border text-sm rounded-lg pl-10 pr-4 py-2.5 outline-none transition-colors w-full" />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-border bg-sidebar">
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary" onClick={() => handleSort("name")}>Driver Name <SortIcon column="name" /></th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">License No.</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Category</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Phone</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider cursor-pointer hover:text-primary" onClick={() => handleSort("license_expiry")}>License Expiry <SortIcon column="license_expiry" /></th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Safety Score</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Accidents</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider text-right">Safety Record</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {paginated.length === 0 ? (
                                <tr><td colSpan={9} className="px-6 py-12 text-center text-muted text-sm">No drivers found.</td></tr>
                            ) : paginated.map(driver => {
                                const safety = safetyMap[driver.id];
                                const score = safetyScore(driver);
                                const isExpired = driver.license_expiry && new Date(driver.license_expiry) < new Date();
                                return (
                                    <tr key={driver.id} className="hover:bg-primary/[0.02] transition-colors">
                                        <td className="px-6 py-4 text-sm font-semibold text-accent cursor-pointer hover:underline" onClick={() => openDrawer(driver)}>{driver.name}</td>
                                        <td className="px-6 py-4 text-sm text-primary">{driver.license_number}</td>
                                        <td className="px-6 py-4 text-sm text-secondary">{driver.license_category || "—"}</td>
                                        <td className="px-6 py-4 text-sm text-secondary">{driver.contact_number || "—"}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={isExpired ? "text-danger font-semibold" : "text-secondary"}>
                                                {driver.license_expiry ? new Date(driver.license_expiry).toLocaleDateString() : "—"}
                                                {isExpired && <span className="ml-1 text-[10px] bg-danger/10 text-danger px-1.5 py-0.5 rounded font-bold">EXPIRED</span>}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm"><Badge status={driver.status}>{driver.status}</Badge></td>
                                        <td className="px-6 py-4 text-sm">
                                            {score !== null ? (
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${score >= 90 ? "bg-success/10 text-success" : score >= 70 ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger"}`}>{score}</span>
                                            ) : <span className="text-muted text-xs">Not assessed</span>}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary">{safety ? safety.total_accidents : "—"}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => openDrawer(driver)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-card hover:border-success/50 hover:bg-success/5 hover:text-success transition-colors ml-auto">
                                                <HiOutlineShieldCheck className="w-3.5 h-3.5" />
                                                {safety ? "View / Edit" : "Add Record"}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-border bg-sidebar flex items-center justify-between gap-4">
                        <span className="text-xs text-secondary">Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, processed.length)} of {processed.length}</span>
                        <div className="flex gap-2">
                            <button className="px-3 py-1 text-xs rounded-lg border border-border bg-card text-secondary hover:text-primary transition-colors disabled:opacity-40" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
                            <span className="px-3 py-1 text-xs text-primary bg-border rounded-md border border-border">{currentPage} / {totalPages}</span>
                            <button className="px-3 py-1 text-xs rounded-lg border border-border bg-card text-secondary hover:text-primary transition-colors disabled:opacity-40" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Safety Record Drawer */}
            {selectedDriver && safetyForm && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => { setSelectedDriver(null); setSafetyForm(null); }} />
                    <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-sidebar border-l border-border shadow-2xl z-50 flex flex-col animate-slide-in-left overflow-hidden">
                        
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-card shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-success/10 border border-success/30 flex items-center justify-center">
                                    <HiOutlineShieldCheck className="w-6 h-6 text-success" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-base text-primary">{selectedDriver.name}</h2>
                                    <p className="text-xs text-muted">{selectedDriver.license_number} · {selectedDriver.license_category}</p>
                                </div>
                            </div>
                            <button onClick={() => { setSelectedDriver(null); setSafetyForm(null); }} className="p-2 rounded-full text-muted hover:text-primary hover:bg-border/60 transition-colors">
                                <HiX className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Drawer Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-7">

                            {/* Admin-registered info — read-only */}
                            <section>
                                <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest border-b border-border pb-2 mb-4">Registered Driver Info (Admin)</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        ["Full Name", selectedDriver.name],
                                        ["Phone", selectedDriver.contact_number || "—"],
                                        ["License No.", selectedDriver.license_number],
                                        ["Category", selectedDriver.license_category || "—"],
                                        ["Admin Safety Score", `${selectedDriver.safety_score} / 100`],
                                        ["Status", selectedDriver.status],
                                        ["License Expiry (Admin)", selectedDriver.license_expiry ? new Date(selectedDriver.license_expiry).toLocaleDateString() : "—"],
                                        ["Trips Completed", selectedDriver.trip_count || 0],
                                    ].map(([label, val]) => (
                                        <div key={label} className="bg-card border border-border rounded-xl p-3">
                                            <p className="text-[10px] text-muted font-semibold uppercase tracking-wider mb-1">{label}</p>
                                            <p className="text-sm font-semibold text-primary">{val}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Safety Officer Fields */}
                            <section>
                                <h3 className="text-[10px] font-bold text-success uppercase tracking-widest border-b border-success/30 pb-2 mb-4">Safety Officer Assessment</h3>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="text-xs font-semibold text-secondary block mb-1">License Expiry Date</label>
                                        <input type="date" name="license_expiry_date" value={safetyForm.license_expiry_date}
                                            onChange={handleFormChange}
                                            className="form-input border text-sm rounded-lg px-3 py-2 outline-none w-full" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-secondary block mb-1">Trip Failures</label>
                                        <input type="number" name="trip_failures" min="0" value={safetyForm.trip_failures}
                                            onChange={handleFormChange}
                                            className="form-input border text-sm rounded-lg px-3 py-2 outline-none w-full" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-secondary block mb-1">Goods Damaged Incidents</label>
                                        <input type="number" name="goods_damaged_incidents" min="0" value={safetyForm.goods_damaged_incidents}
                                            onChange={handleFormChange}
                                            className="form-input border text-sm rounded-lg px-3 py-2 outline-none w-full" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-secondary block mb-1">Total Accidents</label>
                                        <input type="number" name="total_accidents" min="0" value={safetyForm.total_accidents}
                                            onChange={handleFormChange}
                                            className="form-input border text-sm rounded-lg px-3 py-2 outline-none w-full" />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="text-xs font-semibold text-secondary block mb-1">Goods Damage Notes</label>
                                    <textarea name="goods_damage_notes" rows={2} value={safetyForm.goods_damage_notes}
                                        onChange={handleFormChange} placeholder="Describe any goods damage incidents..."
                                        className="form-input border text-sm rounded-lg px-3 py-2 outline-none w-full resize-none" />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-secondary block mb-1">General Safety Notes</label>
                                    <textarea name="notes" rows={2} value={safetyForm.notes}
                                        onChange={handleFormChange} placeholder="Any additional safety observations..."
                                        className="form-input border text-sm rounded-lg px-3 py-2 outline-none w-full resize-none" />
                                </div>
                            </section>

                            {/* Accident Records */}
                            <section>
                                <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
                                    <h3 className="text-[10px] font-bold text-danger uppercase tracking-widest">Accident Records</h3>
                                    <button onClick={addAccident}
                                        className="flex items-center gap-1 text-xs font-semibold text-accent border border-accent/30 bg-accent/5 hover:bg-accent/10 px-3 py-1.5 rounded-lg transition-colors">
                                        <HiOutlinePlus className="w-3.5 h-3.5" /> Add Accident
                                    </button>
                                </div>

                                {(safetyForm.accident_records || []).length === 0 ? (
                                    <p className="text-xs text-muted text-center py-6 bg-card rounded-xl border border-border">No accident records logged for this driver.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {safetyForm.accident_records.map((acc, idx) => (
                                            <div key={idx} className="bg-card border border-danger/20 rounded-xl p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-danger uppercase tracking-wider">Accident #{idx + 1}</span>
                                                    <button onClick={() => removeAccident(idx)} className="text-muted hover:text-danger p-1 rounded transition-colors">
                                                        <HiOutlineTrash className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[10px] text-muted font-semibold uppercase block mb-1">Date</label>
                                                        <input type="date" value={acc.date} onChange={e => updateAccident(idx, "date", e.target.value)}
                                                            className="form-input border text-sm rounded-lg px-3 py-2 outline-none w-full" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-muted font-semibold uppercase block mb-1">Driver Outcome</label>
                                                        <select value={acc.driver_survived} onChange={e => updateAccident(idx, "driver_survived", e.target.value)}
                                                            className="form-input border text-sm rounded-lg px-3 py-2 outline-none w-full">
                                                            <option value="Survived">Survived</option>
                                                            <option value="Injured">Injured</option>
                                                            <option value="Deceased">Deceased</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-muted font-semibold uppercase block mb-1">Accident Description</label>
                                                    <textarea rows={2} value={acc.description} onChange={e => updateAccident(idx, "description", e.target.value)}
                                                        placeholder="Describe what happened..."
                                                        className="form-input border text-sm rounded-lg px-3 py-2 outline-none w-full resize-none" />
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={!!acc.goods_damaged} onChange={e => updateAccident(idx, "goods_damaged", e.target.checked)}
                                                            className="accent-accent w-4 h-4" />
                                                        <span className="text-xs font-semibold text-secondary">Goods Damaged?</span>
                                                    </label>
                                                </div>
                                                {acc.goods_damaged && (
                                                    <div>
                                                        <label className="text-[10px] text-muted font-semibold uppercase block mb-1">Goods Damage Details</label>
                                                        <input type="text" value={acc.goods_details} onChange={e => updateAccident(idx, "goods_details", e.target.value)}
                                                            placeholder="What goods were damaged and how?"
                                                            className="form-input border text-sm rounded-lg px-3 py-2 outline-none w-full" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-5 border-t border-border bg-card shrink-0 space-y-3">
                            {saveMsg && (
                                <p className={`text-xs font-semibold px-3 py-2 rounded-lg ${saveMsg.startsWith("✅") ? "bg-success/10 text-success border border-success/20" : "bg-danger/10 text-danger border border-danger/20"}`}>
                                    {saveMsg}
                                </p>
                            )}
                            <button onClick={handleSave} disabled={saving}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-success text-white font-bold text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-50">
                                <HiOutlineShieldCheck className="w-5 h-5" />
                                {saving ? "Saving..." : "Save Safety Record"}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SafetyDrivers;
