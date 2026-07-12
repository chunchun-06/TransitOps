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
} from "react-icons/hi";

// ── Role → nav items map ───────────────────────────────────────────────────
const NAV_MAP = {
    "Fleet Manager": [
        { label: "Dashboard",    path: "/dashboard",    Icon: HiOutlineViewGrid },
        { label: "Vehicles",     path: "/vehicles",     Icon: HiOutlineTruck },
        { label: "Drivers",      path: "/drivers",      Icon: HiOutlineUsers },
        { label: "Trips",        path: "/trips",        Icon: HiOutlineMap },
        { label: "Maintenance",  path: "/maintenance",  Icon: HiOutlineClipboardList },
        { label: "Users",        path: "/users",        Icon: HiOutlineCog },
    ],
    Dispatcher: [
        { label: "Dashboard",    path: "/dashboard",    Icon: HiOutlineViewGrid },
        { label: "Trips",        path: "/trips",        Icon: HiOutlineMap },
    ],
    "Safety Officer": [
        { label: "Dashboard",    path: "/dashboard",    Icon: HiOutlineViewGrid },
        { label: "Drivers",      path: "/drivers",      Icon: HiOutlineUsers },
    ],
    "Financial Analyst": [
        { label: "Dashboard",    path: "/dashboard",    Icon: HiOutlineViewGrid },
        { label: "Fuel",         path: "/fuel",         Icon: HiOutlineBeaker },
        { label: "Expenses",     path: "/expenses",     Icon: HiOutlineCreditCard },
        { label: "Reports",      path: "/reports",      Icon: HiOutlineDocumentReport },
    ],
};

// ── Inline SVG Logo ────────────────────────────────────────────────────────
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
            <svg width="20" height="20" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="22" width="28" height="16" rx="3" fill="#C98A1C" fillOpacity="0.85" />
                <path d="M36 28 L44 28 L48 34 L48 38 L36 38 Z" fill="#C98A1C" />
                <circle cx="16" cy="40" r="4" fill="#111" stroke="#C98A1C" strokeWidth="2.5" />
                <circle cx="32" cy="40" r="4" fill="#111" stroke="#C98A1C" strokeWidth="2.5" />
                <circle cx="44" cy="40" r="4" fill="#111" stroke="#C98A1C" strokeWidth="2.5" />
                <path d="M37 29.5 L43 29.5 L46 34 L37 34 Z" fill="#0a0a0a" fillOpacity="0.65" />
            </svg>
        </div>
        {!collapsed && (
            <span
                className="text-lg font-bold whitespace-nowrap transition-all duration-300"
                style={{
                    background: "linear-gradient(135deg, #ffffff 20%, #C98A1C 100%)",
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

// ── Sidebar ────────────────────────────────────────────────────────────────
const Sidebar = () => {

    const { user } = useAuth();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

    const navItems = NAV_MAP[user?.role] || [];

    return (
        <aside
            style={{
                width: collapsed ? "72px" : "256px",
                background: "#15181D",
                borderRight: "1px solid #2B3038",
                display: "flex",
                flexDirection: "column",
                transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                flexShrink: 0,
                position: "relative",
                overflow: "hidden",
            }}
        >

            {/* Logo area */}
            <div
                style={{
                    padding: collapsed ? "20px 18px" : "20px 20px",
                    borderBottom: "1px solid #2B3038",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "space-between",
                    minHeight: "64px",
                }}
            >
                <SidebarLogo collapsed={collapsed} />

                {!collapsed && (
                    <button
                        onClick={() => setCollapsed(true)}
                        style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "8px",
                            background: "#1B1F24",
                            border: "1px solid #2B3038",
                            color: "#6b7280",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(201,138,28,0.1)";
                            e.currentTarget.style.color = "#C98A1C";
                            e.currentTarget.style.borderColor = "rgba(201,138,28,0.3)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#1B1F24";
                            e.currentTarget.style.color = "#6b7280";
                            e.currentTarget.style.borderColor = "#2B3038";
                        }}
                        aria-label="Collapse sidebar"
                    >
                        <HiOutlineChevronLeft className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Expand button when collapsed */}
            {collapsed && (
                <button
                    onClick={() => setCollapsed(false)}
                    style={{
                        margin: "10px auto",
                        width: "36px",
                        height: "28px",
                        borderRadius: "8px",
                        background: "#1B1F24",
                        border: "1px solid #2B3038",
                        color: "#6b7280",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(201,138,28,0.1)";
                        e.currentTarget.style.color = "#C98A1C";
                        e.currentTarget.style.borderColor = "rgba(201,138,28,0.3)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#1B1F24";
                        e.currentTarget.style.color = "#6b7280";
                        e.currentTarget.style.borderColor = "#2B3038";
                    }}
                    aria-label="Expand sidebar"
                >
                    <HiOutlineChevronRight className="w-4 h-4" />
                </button>
            )}

            {/* Role badge */}
            {!collapsed && (
                <div
                    style={{
                        margin: "12px 16px",
                        padding: "8px 12px",
                        borderRadius: "10px",
                        background: "rgba(201,138,28,0.08)",
                        border: "1px solid rgba(201,138,28,0.18)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                    }}
                >
                    <p className="text-xs text-gray-500 font-medium">Signed in as</p>
                    <p
                        className="text-xs font-semibold truncate"
                        style={{ color: "#C98A1C" }}
                    >
                        {user?.role}
                    </p>
                </div>
            )}

            {/* Navigation */}
            <nav
                style={{
                    flex: 1,
                    padding: "8px 10px",
                    overflowY: "auto",
                    overflowX: "hidden",
                }}
            >
                {!collapsed && (
                    <p
                        className="text-[10px] text-gray-600 uppercase tracking-widest font-medium mb-3"
                        style={{ paddingLeft: "10px" }}
                    >
                        Navigation
                    </p>
                )}

                <ul className="space-y-1">
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
                                        padding: collapsed ? "12px 10px" : "12px 14px",
                                        borderRadius: "10px",
                                        borderLeft: isActive
                                            ? "3px solid #C98A1C"
                                            : "3px solid transparent",
                                        background: isActive
                                            ? "linear-gradient(135deg, rgba(201,138,28,0.15), rgba(201,138,28,0.02))"
                                            : "transparent",
                                        color: isActive ? "#C98A1C" : "#9ca3af",
                                        textDecoration: "none",
                                        fontSize: "14px",
                                        fontWeight: isActive ? "600" : "500",
                                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                        justifyContent: collapsed ? "center" : "flex-start",
                                        transform: "translateX(0)",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                                            e.currentTarget.style.color = "#fff";
                                            e.currentTarget.style.transform = "translateX(4px)";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.background = "transparent";
                                            e.currentTarget.style.color = "#9ca3af";
                                            e.currentTarget.style.transform = "translateX(0)";
                                        }
                                    }}
                                >
                                    <Icon
                                        style={{
                                            width: "18px",
                                            height: "18px",
                                            flexShrink: 0,
                                            color: isActive ? "#C98A1C" : "#6b7280",
                                        }}
                                    />
                                    {!collapsed && (
                                        <span
                                            style={{
                                                overflow: "hidden",
                                                whiteSpace: "nowrap",
                                                transition: "opacity 0.2s",
                                            }}
                                        >
                                            {label}
                                        </span>
                                    )}
                                </NavLink>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Bottom divider */}
            <div
                style={{
                    height: "1px",
                    margin: "0 16px",
                    background: "#2B3038",
                }}
            />

            {/* Version tag */}
            {!collapsed && (
                <div style={{ padding: "12px 20px" }}>
                    <p className="text-[10px] text-gray-700">v1.0.0 — TransitOps</p>
                </div>
            )}

        </aside>
    );
};

export default Sidebar;