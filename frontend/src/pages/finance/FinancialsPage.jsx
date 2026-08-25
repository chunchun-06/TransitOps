import { useEffect, useState } from "react";
import { 
    HiOutlineCurrencyRupee, 
    HiOutlineChartBar, 
    HiOutlineTruck, 
    HiOutlineArrowRight, 
    HiOutlineBeaker,
    HiOutlineCalendar,
    HiOutlineTrendingUp,
    HiOutlineFilter,
    HiOutlineDownload
} from "react-icons/hi";
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    PieChart, 
    Pie, 
    Cell, 
    LineChart, 
    Line 
} from "recharts";
import { getFinancialAnalytics } from "../../api/analytics.api";
import { getVehicles } from "../../api/vehicle.api";
import { getDrivers } from "../../api/driver.api";
import { downloadReportCSV, downloadReportPDF } from "../../api/report.api";
import { Button, Input, Select, Badge } from "../../components/common";

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444", "#EC4899"];

const FinancialsPage = () => {
    // Analytics states
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Dropdown lists
    const [vehiclesList, setVehiclesList] = useState([]);
    const [driversList, setDriversList] = useState([]);

    // Filter states
    const [period, setPeriod] = useState("This Month");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedVehicle, setSelectedVehicle] = useState("");
    const [selectedDriver, setSelectedDriver] = useState("");

    // Initial dropdown fetch
    useEffect(() => {
        const fetchDropdowns = async () => {
            try {
                const [vRes, dRes] = await Promise.all([getVehicles(), getDrivers()]);
                setVehiclesList(vRes.data || []);
                setDriversList(dRes.data || []);
            } catch (err) {
                console.error("Failed to load vehicle/driver dropdowns:", err);
            }
        };
        fetchDropdowns();
    }, []);

    // Fetch primary financial analytics
    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);
            const params = {
                period,
                ...(period === "Custom" && startDate ? { dateFrom: startDate } : {}),
                ...(period === "Custom" && endDate ? { dateTo: endDate } : {}),
                ...(selectedVehicle ? { vehicleId: selectedVehicle } : {}),
                ...(selectedDriver ? { driverId: selectedDriver } : {})
            };
            const res = await getFinancialAnalytics(params);
            setAnalytics(res.data);
        } catch (err) {
            console.error("Fetch financials error:", err);
            setError(err.response?.data?.message || "Failed to load financial analytics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [period, startDate, endDate, selectedVehicle, selectedDriver]);

    const handleExportCSV = async () => {
        try {
            const params = {
                period,
                ...(period === "Custom" && startDate ? { startDate } : {}),
                ...(period === "Custom" && endDate ? { endDate } : {}),
                ...(selectedVehicle ? { vehicleId: selectedVehicle } : {}),
                ...(selectedDriver ? { driverId: selectedDriver } : {})
            };
            const res = await downloadReportCSV(params);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `transitops_financials_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("CSV Export failed:", err);
        }
    };

    const handleExportPDF = async () => {
        try {
            const params = {
                period,
                ...(period === "Custom" && startDate ? { startDate } : {}),
                ...(period === "Custom" && endDate ? { endDate } : {}),
                ...(selectedVehicle ? { vehicleId: selectedVehicle } : {}),
                ...(selectedDriver ? { driverId: selectedDriver } : {})
            };
            const res = await downloadReportPDF(params);
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `transitops_financials_${new Date().toISOString().slice(0,10)}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("PDF Export failed:", err);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    const formatNumber = (val) => {
        return new Intl.NumberFormat("en-IN").format(val || 0);
    };

    if (loading && !analytics) {
        return (
            <div className="flex flex-col justify-center items-center h-[60vh] text-secondary space-y-4">
                <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                <p className="animate-pulse text-sm font-medium">Analyzing Ledger Records...</p>
            </div>
        );
    }

    const summary = analytics?.summary || {};
    const categoryBreakdown = analytics?.categoryBreakdown || [];
    const trendData = analytics?.trendData || [];
    const vehicleRankings = analytics?.vehicleRankings || [];

    return (
        <div className="animate-fade-in-up space-y-6 max-w-[1600px] mx-auto text-primary pb-12">
            
            {/* Control & Header bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-5 rounded-xl border border-border shadow-soft">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#C98A1C]/10 text-[#C98A1C] rounded-xl">
                        <HiOutlineChartBar className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="font-bold text-xl tracking-tight">Financial Analytics & pricing</h1>
                        <p className="text-xs text-secondary">Monitor operating ratios, yield metrics, vehicle performance, and manage fuel overheads</p>
                    </div>
                </div>

                {/* Export & Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="outline" onClick={handleExportCSV}>
                        <HiOutlineDownload className="w-4 h-4 mr-1" /> CSV Export
                    </Button>
                    <Button onClick={handleExportPDF}>
                        <HiOutlineDownload className="w-4 h-4 mr-1" /> PDF Statement
                    </Button>
                    
                    <div className="flex flex-wrap items-center gap-2 bg-[#1A1F26] p-2 rounded-lg border border-[#2B3038]">
                        <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted px-2 border-r border-[#2B3038]">
                            <HiOutlineFilter className="w-3.5 h-3.5 text-[#C98A1C]" />
                            <span>Filter</span>
                        </div>

                        {/* Period Selector */}
                        <select
                            className="form-input border text-xs rounded-lg px-2 py-1 outline-none bg-card text-primary border-border cursor-pointer"
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

                        {/* Vehicle Filter */}
                        <select
                            className="form-input border text-xs rounded-lg px-2 py-1 outline-none bg-card text-primary border-border cursor-pointer max-w-[140px]"
                            value={selectedVehicle}
                            onChange={(e) => setSelectedVehicle(e.target.value)}
                        >
                            <option value="">All Vehicles</option>
                            {vehiclesList.map(v => (
                                <option key={v.id} value={v.id}>{v.registration_no}</option>
                            ))}
                        </select>

                        {/* Driver Filter */}
                        <select
                            className="form-input border text-xs rounded-lg px-2 py-1 outline-none bg-card text-primary border-border cursor-pointer max-w-[130px]"
                            value={selectedDriver}
                            onChange={(e) => setSelectedDriver(e.target.value)}
                        >
                            <option value="">All Drivers</option>
                            {driversList.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>

                        {period === "Custom" && (
                            <div className="flex items-center gap-1">
                                <input
                                    type="date"
                                    className="form-input border text-[11px] rounded-lg px-1.5 py-1 outline-none bg-card text-primary border-border"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                                <span className="text-[9px] text-muted font-bold">TO</span>
                                <input
                                    type="date"
                                    className="form-input border text-[11px] rounded-lg px-1.5 py-1 outline-none bg-card text-primary border-border"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-xl text-sm font-medium">
                    {error}
                </div>
            )}

            {/* Core KPIs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                
                {/* Total Revenue */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-soft hover:border-[#C98A1C]/50 transition-all flex flex-col justify-between group">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Total Revenue</p>
                        <div className="p-2 bg-[#C98A1C]/10 rounded-lg text-[#C98A1C] group-hover:scale-110 transition-transform">
                            <HiOutlineCurrencyRupee className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-primary mb-1">
                            {formatCurrency(summary.total_revenue)}
                        </p>
                        <span className="text-xs text-secondary font-medium">Gross ticket billing</span>
                    </div>
                </div>

                {/* Total Operating Costs */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-soft hover:border-red-500/50 transition-all flex flex-col justify-between group">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Operating Expenses</p>
                        <div className="p-2 bg-red-500/10 rounded-lg text-red-500 group-hover:scale-110 transition-transform">
                            <HiOutlineTrendingUp className="w-5 h-5 class-rotate-180" style={{ transform: "rotate(180deg)" }} />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-primary mb-1">
                            {formatCurrency(summary.total_expenses)}
                        </p>
                        <span className="text-xs text-secondary font-medium">Fuel + Maint + General</span>
                    </div>
                </div>

                {/* Net Income */}
                <div className={`bg-card border border-border rounded-xl p-5 shadow-soft hover:border-emerald-500/50 transition-all flex flex-col justify-between group`}>
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Net Profit/Loss</p>
                        <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform ${(summary.profit || summary.profit_loss >= 0) ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                            <HiOutlineCurrencyRupee className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <p className={`text-2xl font-black mb-1 ${(summary.profit > 0 || (summary.profit === undefined && summary.profit_loss >= 0)) ? "text-emerald-500" : summary.loss > 0 ? "text-red-500" : "text-primary"}`}>
                            {summary.profit > 0 ? formatCurrency(summary.profit) : summary.loss > 0 ? formatCurrency(-summary.loss) : formatCurrency(summary.profit_loss)}
                        </p>
                        <span className="text-xs text-secondary font-medium">
                            {summary.profit > 0 ? 'Net Profit' : summary.loss > 0 ? 'Net Loss' : 'Breakeven'}
                        </span>
                    </div>
                </div>

                {/* Cost per Kilometer */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-soft hover:border-blue-500/50 transition-all flex flex-col justify-between group">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Cost Per Km</p>
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 group-hover:scale-110 transition-transform">
                            <HiOutlineTruck className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-primary mb-1">
                            {formatCurrency(summary.cost_per_km)}/km
                        </p>
                        <span className="text-xs text-secondary font-medium">Based on {formatNumber(summary.total_distance)} km</span>
                    </div>
                </div>

                {/* Fuel Efficiency average */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-soft hover:border-violet-500/50 transition-all flex flex-col justify-between group">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Fuel Efficiency</p>
                        <div className="p-2 bg-violet-500/10 rounded-lg text-violet-500 group-hover:scale-110 transition-transform">
                            <HiOutlineBeaker className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-primary mb-1">
                            {summary.fuel_efficiency ? `${parseFloat(summary.fuel_efficiency).toFixed(2)} km/L` : "—"}
                        </p>
                        <span className="text-xs text-secondary font-medium">Avg fleet mileage</span>
                    </div>
                </div>
            </div>

            {/* Charts section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Financial Trends Area Chart */}
                <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-soft">
                    <div className="flex justify-between items-center mb-5">
                        <div>
                            <h3 className="text-sm font-bold text-primary">Revenue vs Expense Trend</h3>
                            <p className="text-xs text-secondary">Historical ledger growth over filtered periods</p>
                        </div>
                        <Badge status="Active">Ledger Live</Badge>
                    </div>
                    <div className="h-72">
                        {trendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2B3038" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)", color: "var(--text-primary)", borderRadius: "8px" }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: "11px", marginTop: "10px" }} />
                                    <Area type="monotone" dataKey="revenue" stroke="#10B981" fillOpacity={1} fill="url(#colorRev)" name="Revenue" />
                                    <Area type="monotone" dataKey="total_expense" stroke="#EF4444" fillOpacity={1} fill="url(#colorExp)" name="Operational Cost" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs text-muted">
                                No ledger items found for selected range
                            </div>
                        )}
                    </div>
                </div>

                {/* Expense Breakdown Pie Chart */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-soft">
                    <h3 className="text-sm font-bold text-primary mb-1">Operating Cost Breakdown</h3>
                    <p className="text-xs text-secondary mb-5">Categorised overhead distribution</p>
                    <div className="h-60 flex items-center justify-center">
                        {categoryBreakdown.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryBreakdown}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        nameKey="name"
                                    >
                                        {categoryBreakdown.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)", color: "var(--text-primary)", borderRadius: "8px" }}
                                        formatter={(val) => [formatCurrency(val), "Amount"]}
                                    />
                                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-xs text-muted">No operating costs logged</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Performance Ranking Table */}
            <div className="grid grid-cols-1 gap-6">
                
                {/* Vehicle Rankings (Full width) */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-soft flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-primary">Fleet Yield Rankings</h3>
                                <p className="text-xs text-secondary">Vehicles ranked by operational profit margin (Revenue - Direct Costs)</p>
                            </div>
                            <span className="text-[11px] font-bold text-[#C98A1C] uppercase tracking-wider">Top Performers</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-border text-muted text-[10px] uppercase font-bold tracking-wider">
                                        <th className="pb-3">Vehicle Details</th>
                                        <th className="pb-3">Type</th>
                                        <th className="pb-3 text-right">Revenue</th>
                                        <th className="pb-3 text-right">Expenses</th>
                                        <th className="pb-3 text-right">Net Profit</th>
                                        <th className="pb-3 text-right">Yield Ratio</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#2B3038]">
                                    {vehicleRankings.map((v, i) => {
                                        const marginPercent = v.revenue > 0 ? ((v.profit / v.revenue) * 100).toFixed(0) : "0";
                                        return (
                                            <tr key={v.id} className="hover:bg-[#1A1F26]/30 transition-colors">
                                                <td className="py-3">
                                                    <div className="font-semibold text-primary">{v.vehicle_name}</div>
                                                    <div className="text-xs text-secondary">{v.registration_no}</div>
                                                </td>
                                                <td className="py-3 text-xs text-secondary">{v.vehicle_type}</td>
                                                <td className="py-3 text-right text-emerald-500 font-semibold">{formatCurrency(v.revenue)}</td>
                                                <td className="py-3 text-right text-red-400">{formatCurrency(v.expenses)}</td>
                                                <td className="py-3 text-right font-black text-primary">
                                                    <span className={v.profit >= 0 ? "text-emerald-400" : "text-red-400"}>
                                                        {formatCurrency(v.profit)}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${v.profit >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                                                        {marginPercent}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {vehicleRankings.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="py-6 text-center text-xs text-muted">
                                                No vehicle profit rankings available
                                            </td>
                                        </tr>
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

export default FinancialsPage;
