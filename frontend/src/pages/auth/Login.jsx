import { useState } from "react";
import LoginForm from "../../components/auth/LoginForm";
import {
    HiOutlineTruck,
    HiOutlineMap,
    HiOutlineShieldCheck,
    HiOutlineChartBar,
} from "react-icons/hi";

// ── Feature cards for left panel ───────────────────────────────────────────
const FEATURES = [
    {
        icon: HiOutlineTruck,
        role: "Fleet Manager",
        desc: "Manage vehicles, drivers & maintenance schedules",
        color: "#3B82F6",
        bg: "rgba(59,130,246,0.08)",
        border: "rgba(59,130,246,0.2)",
    },
    {
        icon: HiOutlineMap,
        role: "Dispatcher",
        desc: "Coordinate trips and real-time route assignments",
        color: "#8B5CF6",
        bg: "rgba(139,92,246,0.08)",
        border: "rgba(139,92,246,0.2)",
    },
    {
        icon: HiOutlineShieldCheck,
        role: "Safety Officer",
        desc: "Monitor driver compliance and safety records",
        color: "#10B981",
        bg: "rgba(16,185,129,0.08)",
        border: "rgba(16,185,129,0.2)",
    },
    {
        icon: HiOutlineChartBar,
        role: "Financial Analyst",
        desc: "Track fuel costs, expenses and generate reports",
        color: "#F59E0B",
        bg: "rgba(245,158,11,0.08)",
        border: "rgba(245,158,11,0.2)",
    },
];

// ── Inline SVG Logo ────────────────────────────────────────────────────────
const TransitLogo = ({ size = 56 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="TransitOps Logo"
    >
        <rect width="56" height="56" rx="14" fill="#C98A1C" fillOpacity="0.15" />
        <rect width="56" height="56" rx="14" stroke="#C98A1C" strokeWidth="1.5" strokeOpacity="0.4" />
        {/* Truck body */}
        <rect x="8" y="22" width="28" height="16" rx="3" fill="#C98A1C" fillOpacity="0.8" />
        {/* Cab */}
        <path d="M36 28 L44 28 L48 34 L48 38 L36 38 Z" fill="#C98A1C" />
        {/* Wheels */}
        <circle cx="16" cy="40" r="4" fill="#0a0a0a" stroke="#C98A1C" strokeWidth="2" />
        <circle cx="32" cy="40" r="4" fill="#0a0a0a" stroke="#C98A1C" strokeWidth="2" />
        <circle cx="44" cy="40" r="4" fill="#0a0a0a" stroke="#C98A1C" strokeWidth="2" />
        {/* Windshield */}
        <path d="M37 29.5 L43 29.5 L46 34 L37 34 Z" fill="#0a0a0a" fillOpacity="0.6" />
        {/* Speed lines */}
        <line x1="10" y1="18" x2="22" y2="18" stroke="#C98A1C" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
        <line x1="8" y1="14" x2="16" y2="14" stroke="#C98A1C" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.3" />
    </svg>
);

// ── Login page ─────────────────────────────────────────────────────────────
const Login = () => {

    return (
        <div
            className="min-h-screen flex"
            style={{ background: "#0a0a0a" }}
        >

            {/* ── LEFT PANEL ─────────────────────────────────────────── */}
            <div
                className="hidden lg:flex lg:w-[42%] xl:w-[38%] flex-col justify-between p-12 relative overflow-hidden"
                style={{
                    background: "linear-gradient(160deg, #111111 0%, #0d0d0d 60%, #0a0a0a 100%)",
                    borderRight: "1px solid rgba(255,255,255,0.06)",
                }}
            >

                {/* Background decorative blur circles */}
                <div
                    aria-hidden
                    style={{
                        position: "absolute",
                        top: "-80px",
                        left: "-80px",
                        width: "320px",
                        height: "320px",
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(201,138,28,0.08) 0%, transparent 70%)",
                        pointerEvents: "none",
                    }}
                />
                <div
                    aria-hidden
                    style={{
                        position: "absolute",
                        bottom: "-60px",
                        right: "-60px",
                        width: "280px",
                        height: "280px",
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(201,138,28,0.05) 0%, transparent 70%)",
                        pointerEvents: "none",
                    }}
                />

                {/* Top: Logo + Title */}
                <div className="relative z-10 animate-slide-in-left">

                    <div className="mb-6">
                        <TransitLogo size={60} />
                    </div>

                    <h1
                        className="text-5xl font-extrabold tracking-tight mb-3"
                        style={{
                            background: "linear-gradient(135deg, #ffffff 30%, #C98A1C 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                        }}
                    >
                        TransitOps
                    </h1>

                    <p className="text-muted text-base leading-relaxed max-w-xs">
                        Smart Transport Operations Platform — built for enterprise fleets
                    </p>

                    {/* Divider */}
                    <div
                        className="mt-8 mb-8 h-px"
                        style={{
                            background: "linear-gradient(90deg, rgba(201,138,28,0.4) 0%, transparent 100%)",
                        }}
                    />

                    {/* Feature Cards */}
                    <p className="text-xs text-gray-600 uppercase tracking-widest mb-5 font-medium">
                        Role-based modules
                    </p>

                    <div className="space-y-3">
                        {FEATURES.map((feat, i) => {
                            const Icon = feat.icon;
                            return (
                                <div
                                    key={feat.role}
                                    className={`animate-fade-in-up stagger-${i + 1}`}
                                    style={{
                                        background: feat.bg,
                                        border: `1px solid ${feat.border}`,
                                        borderRadius: "12px",
                                        padding: "12px 16px",
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: "12px",
                                        opacity: 0,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: "36px",
                                            height: "36px",
                                            borderRadius: "8px",
                                            background: `${feat.color}18`,
                                            border: `1px solid ${feat.color}30`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Icon style={{ color: feat.color, width: "18px", height: "18px" }} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-primary mb-0.5">
                                            {feat.role}
                                        </p>
                                        <p className="text-xs text-muted leading-relaxed">
                                            {feat.desc}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="relative z-10">
                    <div
                        className="h-px mb-6"
                        style={{
                            background: "rgba(255,255,255,0.06)",
                        }}
                    />
                    <p className="text-xs text-gray-600">
                        TransitOps © 2026 &nbsp;·&nbsp; Enterprise Transport Management
                    </p>
                </div>

            </div>

            {/* ── RIGHT PANEL ────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 relative">

                {/* Mobile logo — only shown on small screens */}
                <div className="lg:hidden mb-8 text-center">
                    <TransitLogo size={48} />
                    <h1 className="text-2xl font-bold text-primary mt-3">TransitOps</h1>
                    <p className="text-muted text-sm mt-1">Smart Transport Operations Platform</p>
                </div>

                {/* Card */}
                <div
                    className="w-full max-w-md"
                    style={{
                        background: "rgba(255,255,255,0.025)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "24px",
                        padding: "40px 40px",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                        boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
                    }}
                >
                    <LoginForm />
                </div>

            </div>

        </div>
    );
};

export default Login;