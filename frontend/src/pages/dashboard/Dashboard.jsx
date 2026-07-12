import { useAuth } from "../../context/AuthContext";
import {
    HiOutlineCheckCircle,
    HiOutlineUser,
    HiOutlineMail,
    HiOutlineShieldCheck,
} from "react-icons/hi";

// ── Role colors ────────────────────────────────────────────────────────────
const ROLE_COLORS = {
    "Fleet Manager":    { color: "#60A5FA", bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.2)" },
    Dispatcher:         { color: "#A78BFA", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.2)" },
    "Safety Officer":   { color: "#34D399", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)" },
    "Financial Analyst":{ color: "#FBBF24", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" },
};

const InfoRow = ({ icon: Icon, label, value }) => (
    <div
        style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 0",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
    >
        <div
            style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(201,138,28,0.08)",
                border: "1px solid rgba(201,138,28,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
            }}
        >
            <Icon style={{ width: "17px", height: "17px", color: "#C98A1C" }} />
        </div>
        <div>
            <p className="text-xs text-gray-600 font-medium mb-0.5">{label}</p>
            <p className="text-sm text-white font-medium">{value}</p>
        </div>
    </div>
);

// ── Dashboard ──────────────────────────────────────────────────────────────
const Dashboard = () => {

    const { currentUser } = useAuth();
    const user = currentUser();
    const roleStyle = ROLE_COLORS[user?.role] || ROLE_COLORS["Fleet Manager"];

    return (
        <div className="animate-fade-in-up">

            {/* Header row */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                    Welcome back, {user?.username} 
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                    You are now inside the TransitOps platform.
                </p>
            </div>

            {/* Auth success card */}
            <div
                style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "16px",
                    padding: "28px",
                    maxWidth: "640px",
                    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5)",
                    backdropFilter: "blur(12px)",
                }}
            >



                <h2 className="text-xl font-bold text-white mb-1">
                    Session Active
                </h2>
                <p className="text-gray-500 text-sm mb-6">
                    You have successfully authenticated. Your session is secure and active.
                </p>

                {/* Divider */}
                <div
                    style={{
                        height: "1px",
                        background: "rgba(255,255,255,0.06)",
                        marginBottom: "6px",
                    }}
                />

                {/* User info rows */}
                <InfoRow icon={HiOutlineUser}        label="Username"  value={user?.username || "—"} />
                <InfoRow icon={HiOutlineMail}         label="Email"     value={user?.email    || "—"} />
                <InfoRow icon={HiOutlineShieldCheck}  label="Role"      value={user?.role     || "—"} />

                {/* Role badge */}
                <div
                    style={{
                        marginTop: "20px",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        background: roleStyle.bg,
                        border: `1px solid ${roleStyle.border}`,
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                    }}
                >
                    <span
                        style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: roleStyle.color,
                            flexShrink: 0,
                            boxShadow: `0 0 6px ${roleStyle.color}`,
                        }}
                    />
                    <p className="text-sm font-medium" style={{ color: roleStyle.color }}>
                        Logged in as&nbsp;
                        <strong>{user?.role}</strong>
                        &nbsp;use the sidebar to navigate your modules.
                    </p>
                </div>

            </div>

        </div>
    );

};

export default Dashboard;