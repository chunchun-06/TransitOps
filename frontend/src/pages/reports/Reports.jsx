import { useEffect, useState } from "react";
import { HiOutlineDownload, HiOutlineChartBar, HiOutlineCurrencyDollar, HiOutlineLightBulb, HiOutlinePrinter } from "react-icons/hi";
import { Button } from "../../components/common";
import { getDashboardStats, getChartsData, getInsights } from "../../api/report.api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import jsPDF from "jspdf";
import "jspdf-autotable";

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];

const Reports = () => {
    const [stats, setStats] = useState(null);
    const [charts, setCharts] = useState(null);
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState("This Month");

    useEffect(() => {
        const fetchReports = async () => {
            try {
                setLoading(true);
                const [st, ch, ins] = await Promise.all([
                    getDashboardStats(),
                    getChartsData(),
                    getInsights()
                ]);
                setStats(st.data);
                setCharts(ch.data);
                setInsights(ins.data);
            } catch (err) {
                console.error("Failed to load reports:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, [period]);

    const handlePrint = () => {
        window.print();
    };

    const exportToCSV = () => {
        if (!stats) return;
        const csvContent = "data:text/csv;charset=utf-8," + 
            "Metric,Value\n" +
            `Total Vehicles,${stats.total_vehicles}\n` +
            `Available Vehicles,${stats.available_vehicles}\n` +
            `Active Trips,${stats.active_trips}\n` +
            `Monthly Operational Cost,${stats.monthly_operational_cost}\n` +
            `Fleet Utilization,${stats.fleet_utilization}%\n`;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "transitops_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToPDF = () => {
        if (!stats) return;
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(22);
        doc.setTextColor(201, 138, 28); // Accent color
        doc.text("TransitOps", 14, 22);
        
        doc.setFontSize(16);
        doc.setTextColor(40);
        doc.text("Enterprise Fleet & Financial Report", 14, 32);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated Date: ${new Date().toLocaleString()}`, 14, 40);
        
        // Summary Table
        doc.autoTable({
            startY: 50,
            head: [['Metric', 'Value']],
            body: [
                ['Total Vehicles', stats.total_vehicles],
                ['Available Vehicles', stats.available_vehicles],
                ['Fleet Utilization', `${stats.fleet_utilization}%`],
                ['Active Trips', stats.active_trips],
                ['Completed Trips', stats.completed_trips],
                ['Monthly Operational Cost', `$${stats.monthly_operational_cost}`],
                ['Monthly Fuel Cost', `$${stats.monthly_fuel_cost}`],
                ['Monthly Maintenance Cost', `$${stats.monthly_maintenance_cost}`]
            ],
            theme: 'grid',
            headStyles: { fillColor: [201, 138, 28] }
        });

        // Insights Section
        let currentY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.setTextColor(40);
        doc.text("Key AI Insights", 14, currentY);
        currentY += 10;
        doc.setFontSize(11);
        doc.setTextColor(80);
        insights.forEach((insight, idx) => {
            doc.text(`${idx + 1}. ${insight}`, 14, currentY);
            currentY += 8;
        });

        doc.save("transitops_report.pdf");
    };

    if (loading || !stats || !charts) return (
        <div className="flex justify-center items-center h-64 text-secondary">
            <p className="animate-pulse">Loading Analytics Data...</p>
        </div>
    );

    return (
        <div className="animate-fade-in-up space-y-6 max-w-[1600px] mx-auto text-primary">
            
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-soft print:hidden">
                <div className="flex items-center gap-2">
                    <HiOutlineChartBar className="text-accent w-6 h-6" />
                    <h1 className="font-bold text-xl tracking-tight">Reports & Analytics</h1>
                </div>
                
                <div className="flex items-center gap-3">
                    <select 
                        className="bg-background border border-border text-secondary text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent transition-all shadow-sm appearance-none cursor-pointer"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                    >
                        <option>This Week</option>
                        <option>This Month</option>
                        <option>This Quarter</option>
                        <option>Year to Date</option>
                    </select>
                    
                    <Button variant="outline" onClick={handlePrint} title="Print Report">
                        <HiOutlinePrinter className="w-4 h-4" /> Print
                    </Button>
                    <Button variant="outline" onClick={exportToCSV}>
                        <HiOutlineDownload className="w-4 h-4" /> CSV
                    </Button>
                    <Button onClick={exportToPDF}>
                        <HiOutlineDownload className="w-4 h-4" /> PDF Report
                    </Button>
                </div>
            </div>

            {/* Insights Banner */}
            {insights.length > 0 && (
                <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex gap-4 items-start shadow-sm">
                    <div className="p-2 bg-accent/20 text-accent rounded-lg mt-0.5">
                        <HiOutlineLightBulb className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-accent mb-2">Automated Insights</h3>
                        <ul className="list-disc pl-4 space-y-1 text-sm text-secondary">
                            {insights.map((ins, i) => (
                                <li key={i}>{ins}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-card border border-border rounded-xl p-5 shadow-soft hover:border-accent/50 transition-all flex flex-col justify-between group">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Total Operating Cost</p>
                        <div className="p-2 bg-danger/10 rounded-lg text-danger group-hover:scale-110 transition-transform">
                            <HiOutlineCurrencyDollar className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-primary mb-1">₹ {Number(stats.monthly_operational_cost).toLocaleString()}</p>
                        <p className="text-xs text-secondary font-medium">Aggregated {period.toLowerCase()}</p>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-5 shadow-soft hover:border-accent/50 transition-all flex flex-col justify-between group">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Fleet Utilization</p>
                        <div className="p-2 bg-info/10 rounded-lg text-info group-hover:scale-110 transition-transform">
                            <HiOutlineChartBar className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-primary mb-1">{stats.fleet_utilization}%</p>
                        <div className="w-full bg-sidebar rounded-full h-1.5 mt-2 overflow-hidden">
                            <div className="bg-info h-1.5 rounded-full" style={{width: `${stats.fleet_utilization}%`}}></div>
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-5 shadow-soft hover:border-accent/50 transition-all flex flex-col justify-between group">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Active Trips</p>
                        <div className="p-2 bg-success/10 rounded-lg text-success group-hover:scale-110 transition-transform">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-primary mb-1">{stats.active_trips}</p>
                        <p className="text-xs text-success font-medium">{stats.completed_trips} completed {period.toLowerCase()}</p>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-5 shadow-soft hover:border-accent/50 transition-all flex flex-col justify-between group">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Vehicle Availability</p>
                        <div className="p-2 bg-warning/10 rounded-lg text-warning group-hover:scale-110 transition-transform">
                            <HiOutlineChartBar className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-primary mb-1">{stats.vehicle_availability}%</p>
                        <p className="text-xs text-secondary font-medium">{stats.available_vehicles} / {stats.total_vehicles} available</p>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
                
                <div className="bg-card border border-border rounded-xl p-6 shadow-soft">
                    <h2 className="text-[10px] uppercase tracking-widest text-muted font-bold mb-6">Monthly Trip Volume</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={charts.monthly_trips} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2B3038" vertical={false} />
                                <XAxis dataKey="month" tick={{fill: '#6B7280', fontSize: 12}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fill: '#6B7280', fontSize: 12}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Bar dataKey="trips" fill="#D4A017" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 shadow-soft flex flex-col h-full">
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
                                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
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