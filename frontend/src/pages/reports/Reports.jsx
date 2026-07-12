import { useState } from "react";
import { HiOutlineDownload, HiOutlineChartBar, HiOutlineCurrencyDollar } from "react-icons/hi";
import { Button } from "../../components/common";

const Reports = () => {
    // Note: Reports are heavily read-only, using dummy UI components to simulate complex charts
    // which normally require heavy charting libraries (like Recharts) out of scope for pure Tailwind styling constraints
    const [period, setPeriod] = useState("This Month");

    const exportToPDF = () => alert("Exporting to PDF... (Simulated)");
    const exportToCSV = () => alert("Exporting to CSV... (Simulated)");

    return (
        <div className="animate-fade-in-up space-y-6 max-w-[1600px] mx-auto text-primary">
            
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="flex items-center gap-2">
                    <HiOutlineChartBar className="text-accent w-5 h-5" />
                    <h1 className="font-bold text-lg tracking-tight">Financial & Fleet Reports</h1>
                </div>
                
                <div className="flex items-center gap-3">
                    <select 
                        className="bg-background border border-border text-secondary text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                    >
                        <option>This Week</option>
                        <option>This Month</option>
                        <option>This Quarter</option>
                        <option>Year to Date</option>
                    </select>
                    
                    <Button variant="secondary" onClick={exportToCSV}>
                        <HiOutlineDownload className="w-4 h-4" /> CSV
                    </Button>
                    <Button onClick={exportToPDF}>
                        <HiOutlineDownload className="w-4 h-4" /> PDF Report
                    </Button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between shadow-sm group hover:border-accent/50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] text-secondary uppercase tracking-wider font-bold">Total Operating Cost</p>
                        <div className="p-2 bg-danger/10 rounded-lg text-danger">
                            <HiOutlineCurrencyDollar className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-primary mb-1">₹ 2,45,000</p>
                        <p className="text-xs text-danger font-medium">+12% vs last {period.toLowerCase()}</p>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between shadow-sm group hover:border-accent/50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] text-secondary uppercase tracking-wider font-bold">Fuel Efficiency (Avg)</p>
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                            <HiOutlineChartBar className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-primary mb-1">4.2 km/L</p>
                        <p className="text-xs text-green-400 font-medium">+0.3 km/L vs last {period.toLowerCase()}</p>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between shadow-sm group hover:border-accent/50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] text-secondary uppercase tracking-wider font-bold">Fleet Utilization</p>
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-primary mb-1">82%</p>
                        <p className="text-xs text-secondary font-medium">Target: 85%</p>
                    </div>
                </div>
            </div>

            {/* Charts Section (Simulated with UI blocks) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Cost Breakdown */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                    <h2 className="text-[10px] uppercase tracking-widest text-muted font-bold mb-6">Cost Breakdown</h2>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1.5"><span className="text-secondary">Fuel</span><span className="font-bold">₹ 1,50,000 (61%)</span></div>
                            <div className="w-full bg-sidebar rounded-full h-2.5 overflow-hidden"><div className="bg-blue-500 h-2.5 rounded-full" style={{width: '61%'}}></div></div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1.5"><span className="text-secondary">Maintenance</span><span className="font-bold">₹ 65,000 (26%)</span></div>
                            <div className="w-full bg-sidebar rounded-full h-2.5 overflow-hidden"><div className="bg-warning h-2.5 rounded-full" style={{width: '26%'}}></div></div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1.5"><span className="text-secondary">Tolls & Fines</span><span className="font-bold">₹ 20,000 (8%)</span></div>
                            <div className="w-full bg-sidebar rounded-full h-2.5 overflow-hidden"><div className="bg-purple-500 h-2.5 rounded-full" style={{width: '8%'}}></div></div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1.5"><span className="text-secondary">Other</span><span className="font-bold">₹ 10,000 (5%)</span></div>
                            <div className="w-full bg-sidebar rounded-full h-2.5 overflow-hidden"><div className="bg-gray-500 h-2.5 rounded-full" style={{width: '5%'}}></div></div>
                        </div>
                    </div>
                </div>

                {/* Top Costliest Vehicles */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                    <h2 className="text-[10px] uppercase tracking-widest text-muted font-bold mb-6">Costliest Vehicles ({period})</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-border text-muted text-[10px] uppercase tracking-wider">
                                    <th className="pb-3">Vehicle</th>
                                    <th className="pb-3">Maintenance</th>
                                    <th className="pb-3">Fuel</th>
                                    <th className="pb-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2B3038]">
                                <tr className="text-sm">
                                    <td className="py-3 font-semibold">TRUCK-11</td>
                                    <td className="py-3 text-secondary">₹ 18,000</td>
                                    <td className="py-3 text-secondary">₹ 45,000</td>
                                    <td className="py-3 text-right text-danger font-bold">₹ 63,000</td>
                                </tr>
                                <tr className="text-sm">
                                    <td className="py-3 font-semibold">VAN-05</td>
                                    <td className="py-3 text-secondary">₹ 2,500</td>
                                    <td className="py-3 text-secondary">₹ 12,000</td>
                                    <td className="py-3 text-right text-accent font-bold">₹ 14,500</td>
                                </tr>
                                <tr className="text-sm">
                                    <td className="py-3 font-semibold">MINI-03</td>
                                    <td className="py-3 text-secondary">₹ 6,200</td>
                                    <td className="py-3 text-secondary">₹ 8,000</td>
                                    <td className="py-3 text-right text-secondary font-bold">₹ 14,200</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Reports;