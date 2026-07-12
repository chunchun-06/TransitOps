import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { HiOutlineUser, HiOutlineMail, HiOutlineShieldCheck, HiOutlineKey, HiOutlineIdentification, HiOutlinePhone, HiOutlineCalendar, HiOutlineClock } from "react-icons/hi";

const Profile = () => {
    const { currentUser } = useAuth();
    const user = currentUser();

    const initials = user?.username
        ? user.username.split(" ").map(w => w[0]?.toUpperCase()).slice(0, 2).join("")
        : "U";

    const employeeId = user?.employeeId || "EMP-" + (user?.id || "0128").toString().padStart(4, "0");
    const phone = user?.phone || "+1 (555) 123-4567";
    const createdAt = user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "March 15, 2023";
    const lastLogin = user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : new Date().toLocaleString();

    return (
        <div className="max-w-3xl animate-fade-in-up">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white tracking-tight">My Profile</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Manage your account details and security.
                </p>
            </div>

            <div
                style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "16px",
                    overflow: "hidden",
                    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5)",
                    backdropFilter: "blur(12px)",
                }}
            >
                {/* Header Profile Area */}
                <div className="p-8 border-b border-white/[0.06] flex items-center gap-6">
                    <div
                        style={{
                            width: "80px",
                            height: "80px",
                            borderRadius: "20px",
                            background: "linear-gradient(135deg, #C98A1C, #f5c842)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "28px",
                            fontWeight: "700",
                            color: "#000",
                        }}
                    >
                        {initials}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">{user?.username}</h2>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#C98A1C]/10 text-[#C98A1C] text-xs font-semibold border border-[#C98A1C]/20">
                            {user?.role}
                        </span>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-2">Username</p>
                            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] transition-all hover:bg-white/[0.04]">
                                <HiOutlineUser className="text-[#C98A1C] w-5 h-5" />
                                <span className="text-gray-200 text-sm font-medium">{user?.username}</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-2">Employee ID</p>
                            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] transition-all hover:bg-white/[0.04]">
                                <HiOutlineIdentification className="text-[#C98A1C] w-5 h-5" />
                                <span className="text-gray-200 text-sm font-medium">{employeeId}</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-2">Email Address</p>
                            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] transition-all hover:bg-white/[0.04]">
                                <HiOutlineMail className="text-[#C98A1C] w-5 h-5" />
                                <span className="text-gray-200 text-sm font-medium">{user?.email}</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-2">Phone Number</p>
                            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] transition-all hover:bg-white/[0.04]">
                                <HiOutlinePhone className="text-[#C98A1C] w-5 h-5" />
                                <span className="text-gray-200 text-sm font-medium">{phone}</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-2">Member Since</p>
                            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] transition-all hover:bg-white/[0.04]">
                                <HiOutlineCalendar className="text-[#C98A1C] w-5 h-5" />
                                <span className="text-gray-200 text-sm font-medium">{createdAt}</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-2">Last Login</p>
                            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] transition-all hover:bg-white/[0.04]">
                                <HiOutlineClock className="text-[#C98A1C] w-5 h-5" />
                                <span className="text-gray-200 text-sm font-medium">{lastLogin}</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/[0.06]">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <HiOutlineShieldCheck className="text-[#C98A1C]" />
                            Security
                        </h3>
                        <Link
                            to="/change-password"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-sm font-medium text-white transition-colors"
                        >
                            <HiOutlineKey className="w-4 h-4 text-gray-400" />
                            Change Password
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
