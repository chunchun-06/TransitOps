import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
    HiOutlineViewGrid,
    HiOutlineTruck,
    HiOutlineUsers,
    HiOutlineMap,
    HiOutlineBeaker,
    HiOutlineCreditCard,
    HiOutlineDocumentReport,
    HiOutlineCog,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineClipboardList,
    HiOutlineUserGroup,
    HiOutlineChartBar,
    HiOutlineShieldCheck,
} from "react-icons/hi";

// ── Role → nav items map ───────────────────────────────────────────────────
const NAV_MAP = {
    "Fleet Manager": [
        { label: "Dashboard",   path: "/dashboard",   Icon: HiOutlineViewGrid },
        { label: "Vehicles",    path: "/vehicles",    Icon: HiOutlineTruck },
        { label: "Drivers",     path: "/drivers",     Icon: HiOutlineUsers },
        { label: "Trips",       path: "/trips",       Icon: HiOutlineMap },
        { label: "Maintenance", path: "/maintenance", Icon: HiOutlineClipboardList },
        { label: "Fuel",        path: "/fuel",        Icon: HiOutlineBeaker },
        { label: "Expenses",    path: "/expenses",    Icon: HiOutlineCreditCard },
        { label: "Reports",     path: "/reports",     Icon: HiOutlineDocumentReport },
        { label: "Financials",  path: "/financials",  Icon: HiOutlineChartBar },
        { label: "Users",       path: "/users",       Icon: HiOutlineCog },
    ],
    Dispatcher: [
        { label: "Dashboard", path: "/dashboard", Icon: HiOutlineViewGrid },
        { label: "Vehicles",    path: "/vehicles",    Icon: HiOutlineTruck },
        { label: "Drivers",     path: "/drivers",     Icon: HiOutlineUsers },
        { label: "Trips",       path: "/trips",       Icon: HiOutlineMap },
    ],
    "Safety Officer": [
        { label: "Dashboard",       path: "/dashboard",        Icon: HiOutlineViewGrid },
        { label: "Driver Safety",   path: "/safety/drivers",   Icon: HiOutlineShieldCheck },
    ],
    "Financial Analyst": [
        { label: "Dashboard",   path: "/dashboard",            Icon: HiOutlineViewGrid },
        { label: "Drivers",     path: "/finance/drivers",      Icon: HiOutlineUserGroup },
        { label: "Trips",       path: "/finance/trips",        Icon: HiOutlineMap },
        { label: "Maintenance", path: "/finance/maintenance",  Icon: HiOutlineClipboardList },
        { label: "Fuel",        path: "/finance/fuel",         Icon: HiOutlineBeaker },
        { label: "Expenses",    path: "/finance/expenses",     Icon: HiOutlineCreditCard },
        { label: "Reports",     path: "/reports",              Icon: HiOutlineDocumentReport },
        { label: "Financials",  path: "/financials",  Icon: HiOutlineChartBar },
    ],
};

// ── Logo ───────────────────────────────────────────────────────────────────
const SidebarLogo = ({ collapsed }) => (
    <div className="flex items-center gap-3 overflow-hidden">
        <div
            style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(201,138,28,0.15)",
                border: "1.5px solid rgba(201,138,28,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
            }}
        >
            <svg width="20" height="20" viewBox="0 0 56 56" fill="none">
                <rect x="8" y="22" width="28" height="16" rx="3" fill="#C98A1C" fillOpacity="0.85" />
                <path d="M36 28 L44 28 L48 34 L48 38 L36 38 Z" fill="#C98A1C" />
                <circle cx="16" cy="40" r="4" fill="var(--bg-sidebar)" stroke="#C98A1C" strokeWidth="2.5" />
                <circle cx="32" cy="40" r="4" fill="var(--bg-sidebar)" stroke="#C98A1C" strokeWidth="2.5" />
                <circle cx="44" cy="40" r="4" fill="var(--bg-sidebar)" stroke="#C98A1C" strokeWidth="2.5" />
                <path d="M37 29.5 L43 29.5 L46 34 L37 34 Z" fill="var(--bg-sidebar)" fillOpacity="0.65" />
            </svg>
        </div>
        {!collapsed && (
            <span
                className="text-lg font-bold whitespace-nowrap transition-all duration-300"
                style={{
                    background: "linear-gradient(135deg, var(--text-primary) 10%, #C98A1C 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                }}
            >
                TransitOps
            </span>
        )}
    </div>
);

// ── Collapse / Expand button ───────────────────────────────────────────────
const SidebarToggle = ({ collapsed, onClick, ariaLabel, children }) => (
    <button
        onClick={onClick}
        aria-label={ariaLabel}
        style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background: "var(--btn-bg)",
            border: "1px solid var(--border-color)",
            color: "var(--btn-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background 0.2s, color 0.2s, border-color 0.2s",
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(201,138,28,0.10)";
            e.currentTarget.style.color = "#C98A1C";
            e.currentTarget.style.borderColor = "rgba(201,138,28,0.30)";
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--btn-bg)";
            e.currentTarget.style.color = "var(--btn-color)";
            e.currentTarget.style.borderColor = "var(--border-color)";
        }}
    >
        {children}
    </button>
);

// ── Sidebar ────────────────────────────────────────────────────────────────
const Sidebar = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

    const navItems = NAV_MAP[user?.role] || [];

    return (
        <aside
            style={{
                width: collapsed ? "72px" : "260px",
                background: "var(--bg-sidebar)",
                borderRight: "1px solid var(--border-color)",
                display: "flex",
                flexDirection: "column",
                transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s, border-color 0.3s",
                flexShrink: 0,
                position: "relative",
                overflow: "hidden",
                boxShadow: "2px 0 12px rgba(0,0,0,0.04)",
            }}
        >
            {/* ── Logo bar ── */}
            <div
                style={{
                    padding: collapsed ? "18px 18px" : "18px 20px",
                    borderBottom: "1px solid var(--border-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "space-between",
                    minHeight: "64px",
                    transition: "border-color 0.3s",
                }}
            >
                <SidebarLogo collapsed={collapsed} />
                {!collapsed && (
                    <SidebarToggle onClick={() => setCollapsed(true)} ariaLabel="Collapse sidebar">
                        <HiOutlineChevronLeft className="w-4 h-4" />
                    </SidebarToggle>
                )}
            </div>

            {/* Expand button (collapsed state) */}
            {collapsed && (
                <div style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
                    <SidebarToggle onClick={() => setCollapsed(false)} ariaLabel="Expand sidebar">
                        <HiOutlineChevronRight className="w-4 h-4" />
                    </SidebarToggle>
                </div>
            )}

            {/* ── Role badge ── */}
            {!collapsed && (
                <div
                    style={{
                        margin: "10px 14px",
                        padding: "8px 12px",
                        borderRadius: "10px",
                        background: "rgba(201,138,28,0.08)",
                        border: "1px solid rgba(201,138,28,0.20)",
                    }}
                >
                    <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                        Signed in as
                    </p>
                    <p className="text-xs font-semibold truncate mt-0.5" style={{ color: "#C98A1C" }}>
                        {user?.role}
                    </p>
                </div>
            )}

            {/* ── Navigation ── */}
            <nav
                style={{
                    flex: 1,
                    padding: "6px 10px",
                    overflowY: "auto",
                    overflowX: "hidden",
                }}
            >
                {!collapsed && (
                    <p
                        className="text-[10px] uppercase tracking-widest font-semibold mb-3"
                        style={{ color: "var(--nav-label)", paddingLeft: "6px" }}
                    >
                        Navigation
                    </p>
                )}

                <ul className="space-y-0.5">
                    {navItems.map(({ label, path, Icon }) => {
                        const isActive = location.pathname === path;
                        return (
                            <li key={path}>
                                <NavLink
                                    to={path}
                                    title={collapsed ? label : undefined}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        padding: collapsed ? "11px 10px" : "11px 12px",
                                        borderRadius: "10px",
                                        borderLeft: isActive
                                            ? "3px solid var(--color-gold)"
                                            : "3px solid transparent",
                                        background: isActive
                                            ? "linear-gradient(135deg, rgba(201,138,28,0.14), rgba(201,138,28,0.03))"
                                            : "transparent",
                                        color: isActive ? "var(--color-gold)" : "var(--nav-text)",
                                        textDecoration: "none",
                                        fontSize: "13.5px",
                                        fontWeight: isActive ? "600" : "500",
                                        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                                        justifyContent: collapsed ? "center" : "flex-start",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.background = "var(--nav-hover-bg)";
                                            e.currentTarget.style.color = "var(--nav-hover-color)";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.background = "transparent";
                                            e.currentTarget.style.color = "var(--nav-text)";
                                        }
                                    }}
                                >
                                    <Icon
                                        style={{
                                            width: "18px",
                                            height: "18px",
                                            flexShrink: 0,
                                            color: isActive ? "var(--color-gold)" : "var(--nav-icon)",
                                        }}
                                    />
                                    {!collapsed && (
                                        <span style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
                                            {label}
                                        </span>
                                    )}
                                </NavLink>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* ── Footer divider + version ── */}
            <div
                style={{
                    height: "1px",
                    margin: "0 14px",
                    background: "var(--nav-divider)",
                    transition: "background 0.3s",
                }}
            />
            {!collapsed && (
                <div style={{ padding: "10px 20px" }}>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        v1.0.0 — TransitOps
                    </p>
                </div>
            )}
        </aside>
    );
};

export default Sidebar;