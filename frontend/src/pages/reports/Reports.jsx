import { useEffect, useState } from "react";
import { 
  HiOutlineDownload, 
  HiOutlineChartBar, 
  HiOutlineCurrencyDollar, 
  HiOutlineLightBulb, 
  HiOutlinePrinter,
  HiOutlineFilter,
  HiOutlineRefresh,
  HiOutlineTruck,
  HiOutlineUserGroup,
  HiOutlineClipboardCheck,
  HiOutlineCog
} from "react-icons/hi";
import { Button } from "../../components/common";
import { getDashboardStats, getChartsData, getInsights } from "../../api/report.api";
import { getVehicles } from "../../api/vehicle.api";
import { getDrivers } from "../../api/driver.api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import jsPDF from "jspdf";
import "jspdf-autotable";

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];

const Reports = () => {
    const [stats, setStats] = useState(null);
    const [charts, setCharts] = useState(null);
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Dropdown list states
    const [vehiclesList, setVehiclesList] = useState([]);
    const [driversList, setDriversList] = useState([]);

    // Filter states
    const [period, setPeriod] = useState("This Month");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedVehicle, setSelectedVehicle] = useState("");
    const [selectedDriver, setSelectedDriver] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");

    // Initial dropdown fetch
    useEffect(() => {
        const fetchDropdowns = async () => {
            try {
                const [vRes, dRes] = await Promise.all([getVehicles(), getDrivers()]);
                setVehiclesList(vRes.data || []);
                setDriversList(dRes.data || []);
            } catch (err) {
                console.error("Failed to load filter dropdown options:", err);
            }
        };
        fetchDropdowns();
    }, []);

    // Main analytics fetch with filter params
    const fetchReports = async () => {
        try {
            setLoading(true);
            setError(null);

            const params = {
                period,
                ...(period === "Custom" && startDate ? { startDate } : {}),
                ...(period === "Custom" && endDate ? { endDate } : {}),
                ...(selectedVehicle ? { vehicleId: selectedVehicle } : {}),
                ...(selectedDriver ? { driverId: selectedDriver } : {}),
                ...(selectedStatus ? { status: selectedStatus } : {})
            };

            const [st, ch, ins] = await Promise.all([
                getDashboardStats(params),
                getChartsData(params),
                getInsights(params)
            ]);

            setStats(st.data);
            setCharts(ch.data);
            setInsights(ins.data);
        } catch (err) {
            console.error("Failed to load reports:", err);
            setError(err.response?.data?.message || "Failed to fetch analytics data from server.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [period, startDate, endDate, selectedVehicle, selectedDriver, selectedStatus]);

    const handlePrint = () => {
        window.print();
    };

    const exportToCSV = () => {
        if (!stats) return;
        let csvRows = [];

        csvRows.push("TransitOps Analytics & Fleet Management Report");
        csvRows.push(`Generated Date,${new Date().toLocaleString()}`);
        csvRows.push(`Period Filter,${period}`);
        csvRows.push("");

        csvRows.push("METRIC SUMMARY,VALUE");
        csvRows.push(`Total Vehicles,${stats.total_vehicles}`);
        csvRows.push(`Available Vehicles,${stats.available_vehicles}`);
        csvRows.push(`On Trip Vehicles,${stats.on_trip_vehicles}`);
        csvRows.push(`Maintenance Vehicles,${stats.maintenance_vehicles}`);
        csvRows.push(`Total Drivers,${stats.total_drivers}`);
        csvRows.push(`Total Trips,${stats.total_trips}`);
        csvRows.push(`Active / Dispatched Trips,${stats.active_trips}`);
        csvRows.push(`Completed Trips,${stats.completed_trips}`);
        csvRows.push(`Fleet Utilization,${stats.fleet_utilization}%`);
        csvRows.push(`Vehicle Availability,${stats.vehicle_availability}%`);
        csvRows.push(`Total Operational Cost (₹),${stats.monthly_operational_cost}`);
        csvRows.push(`Fuel Cost (₹),${stats.monthly_fuel_cost}`);
        csvRows.push(`Maintenance Cost (₹),${stats.monthly_maintenance_cost}`);
        csvRows.push(`General Expenses (₹),${stats.monthly_expense_cost}`);
        csvRows.push("");

        if (charts?.expense_breakdown) {
            csvRows.push("EXPENSE CATEGORY,AMOUNT (₹)");
            charts.expense_breakdown.forEach(item => {
                csvRows.push(`${item.category},${item.amount}`);
            });
            csvRows.push("");
        }

        if (insights?.length > 0) {
            csvRows.push("AUTOMATED KEY INSIGHTS");
            insights.forEach((ins, idx) => {
                csvRows.push(`"${idx + 1}. ${ins.replace(/"/g, '""')}"`);
            });
        }

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `transitops_report_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToPDF = () => {
        if (!stats) return;
        const doc = new jsPDF();
        
        // Header styling
        doc.setFontSize(22);
        doc.setTextColor(201, 138, 28); // Accent color
        doc.text("TransitOps", 14, 22);
        
        doc.setFontSize(14);
        doc.setTextColor(40);
        doc.text("Enterprise Fleet Analytics Report", 14, 30);
        
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString()}  |  Period: ${period}`, 14, 37);
        doc.setLineWidth(0.5);
        doc.setDrawColor(200, 200, 200);
        doc.line(14, 40, 196, 40);

        // Core Fleet Metrics Table
        doc.autoTable({
            startY: 45,
            head: [['Fleet & Operations Metric', 'Value']],
            body: [
                ['Total Fleet Vehicles', `${stats.total_vehicles}`],
                ['Available Vehicles', `${stats.available_vehicles}`],
                ['Vehicles On Trip', `${stats.on_trip_vehicles}`],
                ['Vehicles In Maintenance Shop', `${stats.maintenance_vehicles}`],
                ['Fleet Availability Rate', `${stats.vehicle_availability}%`],
                ['Fleet Utilization Rate', `${stats.fleet_utilization}%`],
                ['Total Active Drivers', `${stats.total_drivers}`],
                ['Total Trips Logged', `${stats.total_trips}`],
                ['Ongoing / Dispatched Trips', `${stats.active_trips}`],
                ['Completed Trips', `${stats.completed_trips}`]
            ],
            theme: 'grid',
            headStyles: { fillColor: [201, 138, 28] }
        });

        // Financial Summary Table
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 10,
            head: [['Financial Expense Category', 'Cost (INR ₹)']],
            body: [
                ['Total Fuel Costs', `₹ ${Number(stats.monthly_fuel_cost).toLocaleString()}`],
                ['Maintenance Costs', `₹ ${Number(stats.monthly_maintenance_cost).toLocaleString()}`],
                ['General Operational Expenses', `₹ ${Number(stats.monthly_expense_cost).toLocaleString()}`],
                ['Aggregated Total Operational Cost', `₹ ${Number(stats.monthly_operational_cost).toLocaleString()}`]
            ],
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] }
        });

        // Key Automated Insights Section
        if (insights && insights.length > 0) {
            let currentY = doc.lastAutoTable.finalY + 12;
            if (currentY > 250) {
                doc.addPage();
                currentY = 20;
            }
            doc.setFontSize(12);
            doc.setTextColor(40);
            doc.text("Automated Fleet Insights", 14, currentY);
            currentY += 6;

            doc.setFontSize(9);
            doc.setTextColor(80);
            insights.forEach((insight, idx) => {
                doc.text(`• ${insight}`, 14, currentY, { maxWidth: 180 });
                currentY += 6;
            });
        }

        doc.save(`transitops_report_${new Date().toISOString().slice(0,10)}.pdf`);
    };

    if (loading) return (
        <div className="flex flex-col justify-center items-center h-80 text-secondary space-y-4">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            <p className="animate-pulse text-sm font-medium">Loading Analytics Data...</p>
        </div>
    );

    if (error) return (
        <div className="bg-card border border-danger/30 rounded-xl p-8 max-w-xl mx-auto text-center space-y-4 shadow-soft my-12">
            <div className="w-12 h-12 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto">
                <HiOutlineRefresh className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-primary">Unable to Load Reports</h2>
            <p className="text-sm text-secondary">{error}</p>
            <Button onClick={fetchReports} className="mx-auto">
                <HiOutlineRefresh className="w-4 h-4 mr-2" /> Retry Loading
            </Button>
        </div>
    );

    if (!stats || !charts) return null;

    return (
        <div className="animate-fade-in-up space-y-6 max-w-[1600px] mx-auto text-primary pb-12">
            
            {/* Top Title & Actions Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-5 rounded-xl border border-border shadow-soft print:hidden">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-accent/10 text-accent rounded-xl">
                        <HiOutlineChartBar className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="font-bold text-xl tracking-tight">Reports & Analytics</h1>
                        <p className="text-xs text-secondary">Real-time operational metrics, financial data, and fleet insights</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="outline" onClick={handlePrint} title="Print Report">
                        <HiOutlinePrinter className="w-4 h-4" /> Print
                    </Button>
                    <Button variant="outline" onClick={exportToCSV}>
                        <HiOutlineDownload className="w-4 h-4" /> CSV Export
                    </Button>
                    <Button onClick={exportToPDF}>
                        <HiOutlineDownload className="w-4 h-4" /> PDF Report
                    </Button>
                </div>
            </div>

            {/* Filter Control Bar */}
            <div className="bg-card p-4 rounded-xl border border-border shadow-soft flex flex-wrap items-center gap-4 print:hidden">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted mr-2">
                    <HiOutlineFilter className="w-4 h-4 text-accent" /> Filters:
                </div>

                {/* Period Selector */}
                <div className="flex items-center gap-2">
                    <label className="text-xs text-secondary font-medium">Period:</label>
                    <select 
                        className="form-input border text-sm rounded-lg px-3 py-1.5 outline-none bg-card text-primary border-border cursor-pointer"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                    >
                        <option value="This Week">This Week</option>
                        <option value="This Month">This Month</option>
                        <option value="This Quarter">This Quarter</option>
                        <option value="Year to Date">Year to Date</option>
                        <option value="All Time">All Time</option>
                        <option value="Custom">Custom Range</option>
                    </select>
                </div>

                {/* Custom Date Inputs */}
                {period === "Custom" && (
                    <div className="flex items-center gap-2">
                        <input 
                            type="date"
                            className="form-input border text-xs rounded-lg px-2.5 py-1.5 outline-none bg-card text-primary border-border"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            placeholder="Start Date"
                        />
                        <span className="text-xs text-muted">to</span>
                        <input 
                            type="date"
                            className="form-input border text-xs rounded-lg px-2.5 py-1.5 outline-none bg-card text-primary border-border"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            placeholder="End Date"
                        />
                    </div>
                )}

                {/* Vehicle Filter */}
                <div className="flex items-center gap-2">
                    <label className="text-xs text-secondary font-medium">Vehicle:</label>
                    <select 
                        className="form-input border text-sm rounded-lg px-3 py-1.5 outline-none bg-card text-primary border-border cursor-pointer max-w-[180px]"
                        value={selectedVehicle}
                        onChange={(e) => setSelectedVehicle(e.target.value)}
                    >
                        <option value="">All Vehicles</option>
                        {vehiclesList.map(v => (
                            <option key={v.id} value={v.id}>{v.vehicle_name} ({v.registration_no})</option>
                        ))}
                    </select>
                </div>

                {/* Driver Filter */}
                <div className="flex items-center gap-2">
                    <label className="text-xs text-secondary font-medium">Driver:</label>
                    <select 
                        className="form-input border text-sm rounded-lg px-3 py-1.5 outline-none bg-card text-primary border-border cursor-pointer max-w-[160px]"
                        value={selectedDriver}
                        onChange={(e) => setSelectedDriver(e.target.value)}
                    >
                        <option value="">All Drivers</option>
                        {driversList.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                </div>

                {/* Trip Status Filter */}
                <div className="flex items-center gap-2">
                    <label className="text-xs text-secondary font-medium">Trip Status:</label>
                    <select 
                        className="form-input border text-sm rounded-lg px-3 py-1.5 outline-none bg-card text-primary border-border cursor-pointer"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        <option value="Draft">Draft</option>
                        <option value="Dispatched">Dispatched</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                </div>

                {/* Reset Filters */}
                {(selectedVehicle || selectedDriver || selectedStatus || period !== "This Month" || startDate || endDate) && (
                    <button 
                        onClick={() => {
                            setPeriod("This Month");
                            setStartDate("");
                            setEndDate("");
                            setSelectedVehicle("");
                            setSelectedDriver("");
                            setSelectedStatus("");
                        }}
                        className="text-xs text-accent hover:underline flex items-center gap-1 ml-auto"
                    >
                        <HiOutlineRefresh className="w-3.5 h-3.5" /> Clear Filters
                    </button>
                )}
            </div>

            {/* Insights Banner */}
            {insights.length > 0 && (
                <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex gap-4 items-start shadow-sm">
                    <div className="p-2 bg-accent/20 text-accent rounded-lg mt-0.5">
                        <HiOutlineLightBulb className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-accent mb-1.5">Automated Fleet Insights</h3>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-secondary">
                            {insights.map((ins, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-accent font-bold">•</span> {ins}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Metrics Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                
                {/* Operational Cost Card */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-soft hover:border-accent/50 transition-all flex flex-col justify-between group">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Total Operating Cost</p>
                        <div className="p-2 bg-danger/10 rounded-lg text-danger group-hover:scale-110 transition-transform">
                            <HiOutlineCurrencyDollar className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-primary mb-1">₹ {Number(stats.monthly_operational_cost || 0).toLocaleString()}</p>
                        <div className="flex justify-between text-[11px] text-secondary">
                            <span>Fuel: ₹{Number(stats.monthly_fuel_cost || 0).toLocaleString()}</span>
                            <span>Maint: ₹{Number(stats.monthly_maintenance_cost || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Fleet Utilization Card */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-soft hover:border-accent/50 transition-all flex flex-col justify-between group">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Fleet Utilization</p>
                        <div className="p-2 bg-info/10 rounded-lg text-info group-hover:scale-110 transition-transform">
                            <HiOutlineTruck className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-baseline mb-1">
                            <p className="text-2xl font-bold text-primary">{stats.fleet_utilization}%</p>
                            <span className="text-xs text-secondary font-medium">{stats.on_trip_vehicles} on trip</span>
                        </div>
                        <div className="w-full bg-sidebar rounded-full h-1.5 mt-2 overflow-hidden">
                            <div className="bg-info h-1.5 rounded-full" style={{width: `${Math.min(stats.fleet_utilization, 100)}%`}}></div>
                        </div>
                    </div>
                </div>

                {/* Active / Completed Trips Card */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-soft hover:border-accent/50 transition-all flex flex-col justify-between group">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Trips Overview</p>
                        <div className="p-2 bg-success/10 rounded-lg text-success group-hover:scale-110 transition-transform">
                            <HiOutlineClipboardCheck className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-baseline mb-1">
                            <p className="text-2xl font-bold text-primary">{stats.total_trips}</p>
                            <span className="text-xs text-success font-medium">{stats.completed_trips} completed</span>
                        </div>
                        <p className="text-xs text-secondary">{stats.active_trips} ongoing / dispatched</p>
                    </div>
                </div>

                {/* Vehicle Availability Card */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-soft hover:border-accent/50 transition-all flex flex-col justify-between group">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Vehicle Availability</p>
                        <div className="p-2 bg-warning/10 rounded-lg text-warning group-hover:scale-110 transition-transform">
                            <HiOutlineCog className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-primary mb-1">{stats.vehicle_availability}%</p>
                        <p className="text-xs text-secondary font-medium">{stats.available_vehicles} / {stats.total_vehicles} available ({stats.maintenance_vehicles} in shop)</p>
                    </div>
                </div>

            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Monthly Trips Chart */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-soft">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-[10px] uppercase tracking-widest text-muted font-bold">Monthly Trip Volume</h2>
                        <span className="text-xs text-secondary">{charts.monthly_trips?.length || 0} Months Tracked</span>
                    </div>
                    <div className="h-64">
                        {charts.monthly_trips && charts.monthly_trips.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={charts.monthly_trips} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2B3038" vertical={false} />
                                    <XAxis dataKey="month" tick={{fill: '#6B7280', fontSize: 12}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fill: '#6B7280', fontSize: 12}} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px' }}
                                        itemStyle={{ color: 'var(--text-primary)' }}
                                    />
                                    <Bar dataKey="trips" fill="#D4A017" radius={[4, 4, 0, 0]} name="Trips Count" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs text-muted">
                                No trip volume records for the selected period
                            </div>
                        )}
                    </div>
                </div>

                {/* Fleet Status Distribution Pie Chart */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-soft flex flex-col">
                    <h2 className="text-[10px] uppercase tracking-widest text-muted font-bold mb-6">Fleet Status Distribution</h2>
                    <div className="h-64 flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={charts.vehicle_status}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="count"
                                    nameKey="status"
                                >
                                    {charts.vehicle_status.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Expense Breakdown Bar Chart */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-soft">
                    <h2 className="text-[10px] uppercase tracking-widest text-muted font-bold mb-6">Expense Breakdown (₹)</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={charts.expense_breakdown} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2B3038" vertical={false} />
                                <XAxis dataKey="category" tick={{fill: '#6B7280', fontSize: 12}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fill: '#6B7280', fontSize: 12}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px' }}
                                    formatter={(value) => [`₹ ${Number(value).toLocaleString()}`, 'Amount']}
                                />
                                <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Amount (₹)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Trip Status Distribution Chart */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-soft flex flex-col">
                    <h2 className="text-[10px] uppercase tracking-widest text-muted font-bold mb-6">Trip Status Breakdown</h2>
                    <div className="h-64 flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={charts.trip_status}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={0}
                                    outerRadius={80}
                                    paddingAngle={3}
                                    dataKey="count"
                                    nameKey="status"
                                >
                                    {charts.trip_status.map((entry, index) => (
                                        <Cell key={`cell-trip-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Reports;