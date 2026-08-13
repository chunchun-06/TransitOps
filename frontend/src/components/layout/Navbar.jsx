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
    HiOutlineSun,
    HiOutlineMoon,
    HiOutlineDesktopComputer,
} from "react-icons/hi";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { logout as apiLogout } from "../../api/auth.api";

// ── Role badge colors ──────────────────────────────────────────────────────
const ROLE_COLORS = {
    "Fleet Manager":    { bg: "rgba(59,130,246,0.12)",  color: "#3B82F6", border: "rgba(59,130,246,0.3)" },
    Dispatcher:         { bg: "rgba(139,92,246,0.12)",  color: "#8B5CF6", border: "rgba(139,92,246,0.3)" },
    "Safety Officer":   { bg: "rgba(16,185,129,0.12)",  color: "#10B981", border: "rgba(16,185,129,0.3)" },
    "Financial Analyst":{ bg: "rgba(245,158,11,0.12)",  color: "#F59E0B", border: "rgba(245,158,11,0.3)" },
};

// ── Route → page title map ─────────────────────────────────────────────────
const PAGE_TITLES = {
    "/dashboard":           "Dashboard",
    "/vehicles":            "Vehicles",
    "/drivers":             "Drivers",
    "/trips":               "Trips",
    "/maintenance":         "Maintenance",
    "/fuel":                "Fuel Management",
    "/expenses":            "Expenses",
    "/reports":             "Reports",
    "/financials":          "Financial Analytics & Pricing",
    "/users":               "User Management",
    "/safety/drivers":      "Driver Safety",
    "/finance/drivers":     "Drivers (View)",
    "/finance/trips":       "Trips (View)",
    "/finance/maintenance": "Maintenance (View)",
    "/finance/fuel":        "Fuel (View)",
    "/finance/expenses":    "Expenses (View)",
};

// ── Avatar initials ────────────────────────────────────────────────────────
const getInitials = (username = "") =>
    username.split(" ").map((w) => w[0]?.toUpperCase()).slice(0, 2).join("") || "U";

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
        const h = new Date().getHours();
        if (h < 12) return "Good morning";
        if (h < 18) return "Good afternoon";
        return "Good evening";
    };

    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target))
                setDropdownOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleLogout = async () => {
        setLoggingOut(true);
        try { await apiLogout(); } finally {
            signout();
            navigate("/login", { replace: true });
        }
    };

    const cycleTheme = () => {
        if (theme === "Light") setTheme("Dark");
        else if (theme === "Dark") setTheme("System");
        else setTheme("Light");
    };

    return (
        <header
            style={{
                height: "64px",
                background: "var(--bg-navbar)",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 28px",
                flexShrink: 0,
                transition: "background 0.3s, border-color 0.3s",
                boxShadow: "var(--shadow-soft)",
            }}
        >
            {/* Left: greeting + page title */}
            <div className="flex items-center gap-6">
                <div>
                    <h2
                        className="text-lg font-bold tracking-tight"
                        style={{ color: "var(--text-primary)" }}
                        aria-live="polite"
                    >
                        {getGreeting()}, {user?.username?.split(" ")[0] || "User"}!
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {pageTitle} •{" "}
                        {new Date().toLocaleDateString("en-US", {
                            weekday: "long", year: "numeric", month: "long", day: "numeric",
                        })}
                    </p>
                </div>
            </div>

            {/* Right: search + theme toggle + bell + avatar */}
            <div className="flex items-center gap-4">

                {/* Search */}
                <div className="hidden md:flex items-center relative">
                    <HiOutlineSearch
                        className="absolute left-3.5 w-4 h-4"
                        style={{ color: "var(--text-muted)" }}
                    />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="form-input w-60 border text-sm rounded-full pl-10 pr-4 py-2 focus:outline-none"
                    />
                </div>

                {/* Theme toggle */}
                <NavIconButton onClick={cycleTheme} aria-label="Toggle Theme" title={`Theme: ${theme}`}>
                    {theme === "Light"  ? <HiOutlineSun className="w-[18px] h-[18px]" style={{ color: "#F59E0B" }} /> :
                     theme === "Dark"   ? <HiOutlineMoon className="w-[18px] h-[18px]" style={{ color: "var(--text-secondary)" }} /> :
                                          <HiOutlineDesktopComputer className="w-[18px] h-[18px]" style={{ color: "var(--text-muted)" }} />}
                </NavIconButton>

                {/* Bell */}
                <NavIconButton aria-label="Notifications" title="Notifications" style={{ position: "relative" }}>
                    <HiOutlineBell className="w-[18px] h-[18px]" style={{ color: "var(--btn-color)" }} />
                    <span
                        style={{
                            position: "absolute",
                            top: "8px",
                            right: "8px",
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            background: "var(--color-gold)",
                            border: "2px solid var(--notif-dot-border)",
                        }}
                    />
                </NavIconButton>

                {/* Divider */}
                <div style={{ width: "1px", height: "24px", background: "var(--border-color)" }} />

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
                            background: dropdownOpen ? "var(--btn-bg)" : "transparent",
                            border: "1px solid transparent",
                            cursor: "pointer",
                            transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => { if (!dropdownOpen) e.currentTarget.style.background = "var(--btn-bg)"; }}
                        onMouseLeave={(e) => { if (!dropdownOpen) e.currentTarget.style.background = "transparent"; }}
                        aria-expanded={dropdownOpen}
                        aria-haspopup="true"
                    >
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
                        >
                            {initials}
                        </div>
                        <HiOutlineChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-200 hidden md:block ${dropdownOpen ? "rotate-180" : ""}`}
                            style={{ color: "var(--text-muted)" }}
                        />
                    </button>

                    {/* Dropdown */}
                    {dropdownOpen && (
                        <div
                            className="animate-fade-in"
                            style={{
                                position: "absolute",
                                top: "calc(100% + 10px)",
                                right: 0,
                                minWidth: "230px",
                                background: "var(--dropdown-bg)",
                                border: "1px solid var(--dropdown-border)",
                                borderRadius: "16px",
                                boxShadow: "var(--dropdown-shadow)",
                                overflow: "hidden",
                                zIndex: 100,
                            }}
                        >
                            {/* User info */}
                            <div
                                style={{
                                    padding: "14px 16px",
                                    borderBottom: "1px solid var(--dropdown-separator)",
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
                                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                                            {user?.username}
                                        </p>
                                        <p className="text-xs truncate max-w-[140px]" style={{ color: "var(--text-muted)" }}>
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
                            <div style={{ padding: "6px" }} className="space-y-0.5">
                                <DropdownItem
                                    icon={<HiOutlineUser className="w-4 h-4 flex-shrink-0" />}
                                    label="My Profile"
                                    onClick={() => { setDropdownOpen(false); navigate("/profile"); }}
                                />
                                <DropdownItem
                                    icon={<HiOutlineCog className="w-4 h-4 flex-shrink-0" />}
                                    label="Settings"
                                    onClick={() => { setDropdownOpen(false); navigate("/settings"); }}
                                />
                                <DropdownItem
                                    icon={<HiOutlineKey className="w-4 h-4 flex-shrink-0" />}
                                    label="Change Password"
                                    onClick={() => { setDropdownOpen(false); navigate("/change-password"); }}
                                />
                            </div>

                            {/* Logout */}
                            <div style={{ padding: "6px", borderTop: "1px solid var(--dropdown-separator)" }}>
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
                                        borderRadius: "10px",
                                        background: "transparent",
                                        color: "var(--color-danger)",
                                        fontSize: "13.5px",
                                        fontWeight: "500",
                                        cursor: loggingOut ? "wait" : "pointer",
                                        transition: "background 0.15s",
                                        border: "none",
                                        textAlign: "left",
                                        opacity: loggingOut ? 0.6 : 1,
                                    }}
                                    onMouseEnter={(e) => { if (!loggingOut) e.currentTarget.style.background = "color-mix(in srgb, var(--color-danger) 8%, transparent)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
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

// ── Reusable icon button for navbar ───────────────────────────────────────
const NavIconButton = ({ children, style = {}, ...props }) => (
    <button
        {...props}
        style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            background: "var(--btn-bg)",
            border: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            position: "relative",
            transition: "background 0.2s, border-color 0.2s",
            ...style,
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--btn-bg-hover)";
            e.currentTarget.style.borderColor = "var(--border-strong)";
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--btn-bg)";
            e.currentTarget.style.borderColor = "var(--border-color)";
        }}
    >
        {children}
    </button>
);

// ── Reusable dropdown menu item ────────────────────────────────────────────
const DropdownItem = ({ icon, label, onClick }) => (
    <button
        onClick={onClick}
        style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 12px",
            borderRadius: "10px",
            background: "transparent",
            color: "var(--dropdown-item-color)",
            fontSize: "13px",
            cursor: "pointer",
            transition: "background 0.15s, color 0.15s",
            border: "none",
            textAlign: "left",
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--dropdown-item-hover-bg)";
            e.currentTarget.style.color = "var(--dropdown-item-hover-color)";
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--dropdown-item-color)";
        }}
    >
        {icon}
        {label}
    </button>
);

export default Navbar;