import { useState } from "react";
import { HiOutlineLockClosed } from "react-icons/hi";

const ChangePassword = () => {
    const [form, setForm] = useState({ current: "", new: "", confirm: "" });
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setForm({ current: "", new: "", confirm: "" });
            alert("Password successfully changed!");
        }, 1000);
    };

    const inputClass = "form-input w-full pl-11 pr-4 py-3 rounded-xl text-sm transition-all duration-200";

    return (
        <div className="max-w-2xl animate-fade-in-up">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-primary tracking-tight">Change Password</h1>
                <p className="text-muted text-sm mt-1">
                    Update your account password.
                </p>
            </div>

            <div
                style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "20px",
                    padding: "32px",
                }}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-medium text-secondary mb-2 uppercase tracking-widest">
                            Current Password
                        </label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                                <HiOutlineLockClosed className="w-5 h-5" />
                            </span>
                            <input
                                type="password"
                                required
                                value={form.current}
                                onChange={(e) => setForm({ ...form, current: e.target.value })}
                                placeholder="••••••••"
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="block text-xs font-medium text-secondary mb-2 uppercase tracking-widest">
                            New Password
                        </label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                                <HiOutlineLockClosed className="w-5 h-5" />
                            </span>
                            <input
                                type="password"
                                required
                                value={form.new}
                                onChange={(e) => setForm({ ...form, new: e.target.value })}
                                placeholder="••••••••"
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-secondary mb-2 uppercase tracking-widest">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                                <HiOutlineLockClosed className="w-5 h-5" />
                            </span>
                            <input
                                type="password"
                                required
                                value={form.confirm}
                                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                                placeholder="••••••••"
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading || !form.current || !form.new || form.new !== form.confirm}
                            className="px-6 py-3 rounded-xl font-semibold text-sm bg-accent hover:bg-[#d59828] text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Updating..." : "Update Password"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangePassword;
