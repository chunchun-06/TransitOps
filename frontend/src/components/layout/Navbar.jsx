import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    HiOutlineBell,
    HiOutlineLogout,
    HiOutlineChevronDown,
    HiOutlineUser,
    HiOutlineSearch,
    HiOutlineCog,
    HiOutlineKey,
} from "react-icons/hi";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { logout as apiLogout } from "../../api/auth.api";
import { HiOutlineSun, HiOutlineMoon, HiOutlineDesktopComputer } from "react-icons/hi";

// ── Role badge colors ──────────────────────────────────────────────────────
const ROLE_COLORS = {
    "Fleet Manager":    { bg: "rgba(59,130,246,0.12)",  color: "#60A5FA", border: "rgba(59,130,246,0.25)" },
    Dispatcher:         { bg: "rgba(139,92,246,0.12)",  color: "#A78BFA", border: "rgba(139,92,246,0.25)" },
    "Safety Officer":   { bg: "rgba(16,185,129,0.12)",  color: "#34D399", border: "rgba(16,185,129,0.25)" },
    "Financial Analyst":{ bg: "rgba(245,158,11,0.12)",  color: "#FBBF24", border: "rgba(245,158,11,0.25)" },
};

// ── Route → page title map ─────────────────────────────────────────────────
const PAGE_TITLES = {
    "/dashboard":   "Dashboard",
    "/vehicles":    "Vehicles",
    "/drivers":     "Drivers",
    "/trips":       "Trips",
    "/maintenance": "Maintenance",
    "/fuel":        "Fuel Management",
    "/expenses":    "Expenses",
    "/reports":     "Reports",
    "/users":       "User Management",
};

// ── Avatar initials ────────────────────────────────────────────────────────
const getInitials = (username = "") => {
    return username
        .split(" ")
        .map((w) => w[0]?.toUpperCase())
        .slice(0, 2)
        .join("") || "U";
};

// ── Navbar ─────────────────────────────────────────────────────────────────
const Navbar = () => {
    const { theme, setTheme } = useTheme();
    const { user, signout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const dropdownRef = useRef(null);

    const roleStyle = ROLE_COLORS[user?.role] || ROLE_COLORS["Fleet Manager"];
    const pageTitle = PAGE_TITLES[location.pathname] || "TransitOps";
    const initials = getInitials(user?.username);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await apiLogout();
        } finally {
            signout();
            navigate("/login", { replace: true });
        }
    };

    return (
        <header
            style={{
                height: "64px",
                background: "#111111",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 28px",
                flexShrink: 0,
            }}
        >

            {/* Left: greeting + page title */}
            <div className="flex items-center gap-6">
                <div>
                    <h2
                        className="text-lg font-bold text-primary tracking-tight flex items-center gap-2"
                        aria-live="polite"
                    >
                        {getGreeting()}, {user?.username?.split(' ')[0] || 'User'}!
                    </h2>
                    <p className="text-xs text-muted mt-0.5">
                        {pageTitle} • {new Date().toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </p>
                </div>
            </div>

            {/* Right: search + notifications + user dropdown */}
            <div className="flex items-center gap-5">

                {/* Search Bar */}
                <div className="hidden md:flex items-center relative">
                    <HiOutlineSearch className="absolute left-3.5 w-4 h-4 text-muted" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-64 bg-card border border-border text-sm text-primary rounded-full pl-10 pr-4 py-2 focus:outline-none focus:border-accent transition-all"
                    />
                </div>

                {/* Theme Toggle */}
                <button
                    onClick={() => {
                        if (theme === "Light") setTheme("Dark");
                        else if (theme === "Dark") setTheme("System");
                        else setTheme("Light");
                    }}
                    aria-label="Toggle Theme"
                    style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "10px",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = "var(--text-primary)";
                        e.currentTarget.style.borderColor = "var(--text-muted)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--text-muted)";
                        e.currentTarget.style.borderColor = "var(--border-color)";
                    }}
                >
                    {theme === "Light" ? <HiOutlineSun className="w-5 h-5 text-[#F59E0B]" /> : 
                     theme === "Dark" ? <HiOutlineMoon className="w-5 h-5 text-gray-300" /> : 
                     <HiOutlineDesktopComputer className="w-5 h-5" />}
                </button>

                {/* Bell */}
                <button
                    aria-label="Notifications"
                    style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "10px",
                        background: "#1B1F24",
                        border: "1px solid #2B3038",
                        color: "#6b7280",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        position: "relative",
                        transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(201,138,28,0.08)";
                        e.currentTarget.style.color = "#C98A1C";
                        e.currentTarget.style.borderColor = "rgba(201,138,28,0.25)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#1B1F24";
                        e.currentTarget.style.color = "#6b7280";
                        e.currentTarget.style.borderColor = "#2B3038";
                    }}
                >
                    <HiOutlineBell className="w-5 h-5" />
                    {/* Notification dot */}
                    <span
                        style={{
                            position: "absolute",
                            top: "8px",
                            right: "9px",
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            background: "#C98A1C",
                            border: "2px solid #111111",
                        }}
                    />
                </button>

                {/* Divider */}
                <div
                    style={{
                        width: "1px",
                        height: "24px",
                        background: "#2B3038",
                    }}
                />

                {/* User dropdown */}
                <div ref={dropdownRef} style={{ position: "relative" }}>
                    <button
                        id="navbar-user-menu"
                        onClick={() => setDropdownOpen((v) => !v)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "4px",
                            borderRadius: "50px",
                            background: dropdownOpen ? "rgba(255,255,255,0.06)" : "transparent",
                            border: "1px solid transparent",
                            cursor: "pointer",
                            transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                            if (!dropdownOpen) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                        }}
                        onMouseLeave={(e) => {
                            if (!dropdownOpen) e.currentTarget.style.background = "transparent";
                        }}
                        aria-expanded={dropdownOpen}
                        aria-haspopup="true"
                    >
                        {/* Avatar */}
                        <div
                            style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #C98A1C, #f5c842)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "14px",
                                fontWeight: "700",
                                color: "#000",
                                flexShrink: 0,
                                boxShadow: "0 2px 10px rgba(201,138,28,0.2)",
                            }}
                            aria-hidden
                        >
                            {initials}
                        </div>
                    </button>

                    {/* Dropdown */}
                    {dropdownOpen && (
                        <div
                            className="animate-fade-in"
                            style={{
                                position: "absolute",
                                top: "calc(100% + 8px)",
                                right: 0,
                                minWidth: "220px",
                                background: "#1a1a1a",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "14px",
                                boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
                                overflow: "hidden",
                                zIndex: 100,
                            }}
                        >
                            {/* User info block */}
                            <div
                                style={{
                                    padding: "14px 16px",
                                    borderBottom: "1px solid #2B3038",
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        style={{
                                            width: "40px",
                                            height: "40px",
                                            borderRadius: "11px",
                                            background: "linear-gradient(135deg, #C98A1C, #f5c842)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "14px",
                                            fontWeight: "700",
                                            color: "#000",
                                        }}
                                    >
                                        {initials}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-primary">
                                            {user?.username}
                                        </p>
                                        <p className="text-xs text-muted truncate max-w-[140px]">
                                            {user?.email}
                                        </p>
                                    </div>
                                </div>

                                {/* Role badge */}
                                <div
                                    style={{
                                        marginTop: "10px",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "5px",
                                        padding: "3px 10px",
                                        borderRadius: "6px",
                                        background: roleStyle.bg,
                                        border: `1px solid ${roleStyle.border}`,
                                        fontSize: "11px",
                                        fontWeight: "600",
                                        color: roleStyle.color,
                                    }}
                                >
                                    {user?.role}
                                </div>
                            </div>

                            {/* Menu items */}
                            <div style={{ padding: "6px" }} className="space-y-1">
                                <button
                                    onClick={() => {
                                        setDropdownOpen(false);
                                        navigate("/profile");
                                    }}
                                    style={{
                                        width: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        padding: "8px 12px",
                                        borderRadius: "8px",
                                        background: "transparent",
                                        color: "#d1d5db",
                                        fontSize: "13px",
                                        cursor: "pointer",
                                        transition: "all 0.15s",
                                        border: "none",
                                        textAlign: "left",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                                        e.currentTarget.style.color = "#fff";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "transparent";
                                        e.currentTarget.style.color = "#d1d5db";
                                    }}
                                >
                                    <HiOutlineUser className="w-4 h-4 flex-shrink-0" />
                                    My Profile
                                </button>
                                <button
                                    onClick={() => {
                                        setDropdownOpen(false);
                                        navigate("/settings");
                                    }}
                                    style={{
                                        width: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        padding: "8px 12px",
                                        borderRadius: "8px",
                                        background: "transparent",
                                        color: "#d1d5db",
                                        fontSize: "13px",
                                        cursor: "pointer",
                                        transition: "all 0.15s",
                                        border: "none",
                                        textAlign: "left",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                                        e.currentTarget.style.color = "#fff";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "transparent";
                                        e.currentTarget.style.color = "#d1d5db";
                                    }}
                                >
                                    <HiOutlineCog className="w-4 h-4 flex-shrink-0" />
                                    Settings
                                </button>
                                <button
                                    onClick={() => {
                                        setDropdownOpen(false);
                                        navigate("/change-password");
                                    }}
                                    style={{
                                        width: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        padding: "8px 12px",
                                        borderRadius: "8px",
                                        background: "transparent",
                                        color: "#d1d5db",
                                        fontSize: "13px",
                                        cursor: "pointer",
                                        transition: "all 0.15s",
                                        border: "none",
                                        textAlign: "left",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                                        e.currentTarget.style.color = "#fff";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "transparent";
                                        e.currentTarget.style.color = "#d1d5db";
                                    }}
                                >
                                    <HiOutlineKey className="w-4 h-4 flex-shrink-0" />
                                    Change Password
                                </button>
                            </div>

                            {/* Logout */}
                            <div
                                style={{
                                    padding: "6px",
                                    borderTop: "1px solid #2B3038",
                                }}
                            >
                                <button
                                    id="navbar-logout"
                                    onClick={handleLogout}
                                    disabled={loggingOut}
                                    style={{
                                        width: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        padding: "9px 12px",
                                        borderRadius: "8px",
                                        background: "transparent",
                                        color: "#f87171",
                                        fontSize: "13.5px",
                                        fontWeight: "500",
                                        cursor: loggingOut ? "wait" : "pointer",
                                        transition: "all 0.15s",
                                        border: "none",
                                        textAlign: "left",
                                        opacity: loggingOut ? 0.6 : 1,
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!loggingOut) {
                                            e.currentTarget.style.background = "rgba(239,68,68,0.08)";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "transparent";
                                    }}
                                >
                                    <HiOutlineLogout className="w-4 h-4 flex-shrink-0" />
                                    {loggingOut ? "Signing out…" : "Sign Out"}
                                </button>
                            </div>

                        </div>
                    )}
                </div>

            </div>

        </header>
    );
};

export default Navbar;