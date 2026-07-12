import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { HiOutlineMail, HiOutlineArrowLeft, HiOutlineCheckCircle } from "react-icons/hi";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!email) return;
        
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            setSubmitted(true);
        }, 1500);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0a0a0a" }}>
            <div
                className="w-full max-w-md animate-fade-in-up"
                style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "24px",
                    padding: "40px",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
                }}
            >
                {submitted ? (
                    <div className="text-center animate-fade-in">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                            <HiOutlineCheckCircle className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-primary mb-2">Check your email</h2>
                        <p className="text-muted text-sm mb-8 leading-relaxed">
                            We've sent password reset instructions to<br/>
                            <span className="font-medium text-secondary">{email}</span>
                        </p>
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center w-full py-3.5 rounded-xl font-semibold text-sm bg-white/[0.04] text-primary hover:bg-white/[0.08] transition-colors border border-white/10"
                        >
                            Return to log in
                        </Link>
                    </div>
                ) : (
                    <div>
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-primary tracking-tight">Reset password</h1>
                            <p className="text-muted mt-2 text-sm">
                                Enter your email address and we'll send you a link to reset your password.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="email" className="block text-xs font-medium text-secondary mb-2 uppercase tracking-widest">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                                        <HiOutlineMail className="w-5 h-5" />
                                    </span>
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@company.com"
                                        className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-primary bg-white/[0.04] border border-white/10 focus:border-accent focus:outline-none transition-all duration-200"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={[
                                    "w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide",
                                    "flex items-center justify-center gap-2",
                                    "transition-all duration-200",
                                    loading
                                        ? "bg-accent/60 text-black/60 cursor-not-allowed"
                                        : "bg-accent hover:bg-[#d59828] text-black shadow-lg shadow-[#C98A1C]/20",
                                ].join(" ")}
                            >
                                {loading ? "Sending..." : "Send reset link"}
                            </button>
                        </form>

                        <div className="mt-8 text-center">
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors"
                            >
                                <HiOutlineArrowLeft className="w-4 h-4" />
                                Back to log in
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
