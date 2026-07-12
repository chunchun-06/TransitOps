import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    HiOutlineMail,
    HiOutlineLockClosed,
    HiOutlineEye,
    HiOutlineEyeOff,
    HiOutlineExclamationCircle,
} from "react-icons/hi";
import { login } from "../../api/auth.api";
import { useAuth } from "../../context/AuthContext";

// ── Role meta data ─────────────────────────────────────────────────────────
const ROLE_META = {
    "Fleet Manager": {
        description: "Full fleet, vehicles & maintenance access",
        color: "#3B82F6",
        bg: "rgba(59,130,246,0.10)",
        border: "rgba(59,130,246,0.25)",
        icon: "🚛",
    },
    Dispatcher: {
        description: "Dashboard overview & trip scheduling",
        color: "#8B5CF6",
        bg: "rgba(139,92,246,0.10)",
        border: "rgba(139,92,246,0.25)",
        icon: "📡",
    },
    "Safety Officer": {
        description: "Driver compliance & safety monitoring",
        color: "#10B981",
        bg: "rgba(16,185,129,0.10)",
        border: "rgba(16,185,129,0.25)",
        icon: "🛡️",
    },
    "Financial Analyst": {
        description: "Fuel logs, expenses & financial reports",
        color: "#F59E0B",
        bg: "rgba(245,158,11,0.10)",
        border: "rgba(245,158,11,0.25)",
        icon: "📊",
    },
};

// ── Validation ─────────────────────────────────────────────────────────────
const validate = (form) => {
    const errors = {};

    if (!form.email.trim()) {
        errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        errors.email = "Please enter a valid email address.";
    }

    if (!form.password) {
        errors.password = "Password is required.";
    } else if (form.password.length < 6) {
        errors.password = "Password must be at least 6 characters.";
    }

    return errors;
};

// ── Spinner ────────────────────────────────────────────────────────────────
const Spinner = () => (
    <svg
        className="animate-spin w-5 h-5"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
    >
        <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor"
            strokeWidth="4"
        />
        <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
        />
    </svg>
);

// ── LoginForm ──────────────────────────────────────────────────────────────
const LoginForm = () => {

    const navigate = useNavigate();
    const { signin } = useAuth();

    const [form, setForm] = useState({
        email: "",
        password: "",
        remember: false,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [globalError, setGlobalError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [touched, setTouched] = useState({});

    // ── Handlers ────────────────────────────────────────────────────────────

    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === "checkbox" ? checked : value;

        setForm((prev) => ({ ...prev, [name]: newValue }));

        // Clear field error as user types
        if (fieldErrors[name]) {
            setFieldErrors((prev) => ({ ...prev, [name]: "" }));
        }
        if (globalError) setGlobalError("");
    }, [fieldErrors, globalError]);

    const handleBlur = useCallback((e) => {
        const { name } = e.target;
        setTouched((prev) => ({ ...prev, [name]: true }));
        const errs = validate(form);
        setFieldErrors((prev) => ({ ...prev, [name]: errs[name] || "" }));
    }, [form]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setGlobalError("");

        const allTouched = { email: true, password: true };
        setTouched(allTouched);

        const errs = validate(form);
        setFieldErrors(errs);

        if (Object.keys(errs).length > 0) return;

        try {
            setLoading(true);

            const response = await login({
                email: form.email.trim().toLowerCase(),
                password: form.password,
            });

            const { accessToken, user } = response.data;

            signin(accessToken, user, form.remember);
            navigate("/dashboard", { replace: true });

        } catch (err) {
            const msg =
                err.response?.data?.message ||
                err.message ||
                "Invalid email or password. Please try again.";
            setGlobalError(msg);
        } finally {
            setLoading(false);
        }
    };

    // Enter key support
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !loading) {
            handleSubmit(e);
        }
    };

    // ── Field helper ────────────────────────────────────────────────────────
    const showError = (field) => touched[field] && fieldErrors[field];

    const inputBase = [
        "w-full h-12 pl-11 pr-4 rounded-xl text-sm text-primary",
        "bg-[#111111]/50 backdrop-blur-sm border transition-all duration-200",
        "placeholder-gray-600 focus:outline-none focus:ring-0",
        "input-gold",
    ].join(" ");

    const inputClass = (field) => [
        inputBase,
        showError(field)
            ? "border-red-500/50 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]"
            : "border-white/10 hover:border-white/20",
    ].join(" ");

    // ── Render ──────────────────────────────────────────────────────────────
    return (

        <div className="w-full max-w-md animate-fade-in-up">

            {/* Heading */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-primary tracking-tight">
                    Sign in to your account
                </h1>
                <p className="text-muted mt-2 text-sm">
                    Enter your credentials to access TransitOps
                </p>
            </div>

            {/* Global Error */}
            {globalError && (
                <div className="mb-6 flex items-start gap-3 bg-danger/10 border border-red-500/30 text-danger rounded-xl px-4 py-3 text-sm animate-fade-in">
                    <HiOutlineExclamationCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <span>{globalError}</span>
                </div>
            )}

            {/* Form */}
            <form
                onSubmit={handleSubmit}
                onKeyDown={handleKeyDown}
                noValidate
                className="space-y-5"
            >

                {/* Email */}
                <div>
                    <label
                        htmlFor="login-email"
                        className="block text-xs font-medium text-secondary mb-2 uppercase tracking-widest"
                    >
                        Email Address
                    </label>
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                            <HiOutlineMail className="w-5 h-5" />
                        </span>
                        <input
                            id="login-email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            placeholder="you@company.com"
                            value={form.email}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={inputClass("email")}
                        />
                    </div>
                    {showError("email") && (
                        <p className="mt-1.5 text-xs text-danger animate-fade-in">
                            {fieldErrors.email}
                        </p>
                    )}
                </div>

                {/* Password */}
                <div>
                    <label
                        htmlFor="login-password"
                        className="block text-xs font-medium text-secondary mb-2 uppercase tracking-widest"
                    >
                        Password
                    </label>
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                            <HiOutlineLockClosed className="w-5 h-5" />
                        </span>
                        <input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            name="password"
                            autoComplete="current-password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`${inputClass("password")} pr-12`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors"
                            tabIndex={-1}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword
                                ? <HiOutlineEyeOff className="w-5 h-5" />
                                : <HiOutlineEye className="w-5 h-5" />
                            }
                        </button>
                    </div>
                    {showError("password") && (
                        <p className="mt-1.5 text-xs text-danger animate-fade-in">
                            {fieldErrors.password}
                        </p>
                    )}
                </div>

                {/* Remember me + Forgot */}
                <div className="flex items-center justify-between pt-1">
                    <label
                        htmlFor="login-remember"
                        className="flex items-center gap-2.5 cursor-pointer group"
                    >
                        <div className="relative">
                            <input
                                id="login-remember"
                                type="checkbox"
                                name="remember"
                                checked={form.remember}
                                onChange={handleChange}
                                className="sr-only peer"
                            />
                            <div className="w-4.5 h-4.5 w-[18px] h-[18px] rounded border border-white/20 bg-white/[0.04] peer-checked:bg-accent peer-checked:border-accent transition-all duration-200 flex items-center justify-center">
                                {form.remember && (
                                    <svg className="w-2.5 h-2.5 text-black" viewBox="0 0 12 10" fill="none">
                                        <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </div>
                        </div>
                        <span className="text-sm text-secondary group-hover:text-secondary transition-colors select-none">
                            Remember me
                        </span>
                    </label>

                    <button
                        type="button"
                        onClick={() => navigate("/forgot-password")}
                        className="text-sm text-accent hover:text-[#f5c842] transition-colors duration-200"
                    >
                        Forgot password?
                    </button>
                </div>

                {/* Submit */}
                <button
                    id="login-submit"
                    type="submit"
                    disabled={loading}
                    className={[
                        "w-full mt-2 py-3.5 rounded-xl font-semibold text-sm tracking-wide",
                        "flex items-center justify-center gap-2.5",
                        "transition-all duration-200",
                        loading
                            ? "bg-accent/60 text-black/60 cursor-not-allowed"
                            : "gold-gradient text-black hover:brightness-110 hover:shadow-lg hover:shadow-[#C98A1C]/25 active:scale-[0.99]",
                    ].join(" ")}
                >
                    {loading && <Spinner />}
                    {loading ? "Signing in…" : "Sign In"}
                </button>

            </form>

            {/* Role description cards */}
            <div className="mt-10">
                <p className="text-xs text-gray-600 uppercase tracking-widest mb-4 font-medium">
                    Role-based access
                </p>
                <div className="grid grid-cols-2 gap-3">
                    {Object.entries(ROLE_META).map(([role, meta], i) => (
                        <div
                            key={role}
                            className={`animate-fade-in-up stagger-${i + 1}`}
                            style={{
                                background: meta.bg,
                                border: `1px solid ${meta.border}`,
                                borderRadius: "12px",
                                padding: "12px 14px",
                                opacity: 0,
                            }}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-base" role="img" aria-label={role}>
                                    {meta.icon}
                                </span>
                                <span
                                    className="text-xs font-semibold truncate"
                                    style={{ color: meta.color }}
                                >
                                    {role}
                                </span>
                            </div>
                            <p className="text-[11px] text-muted leading-relaxed">
                                {meta.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default LoginForm;