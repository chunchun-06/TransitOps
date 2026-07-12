export const Button = ({ children, variant = "primary", className = "", ...props }) => {
    const base = "px-4 py-2.5 rounded-lg font-bold transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
        primary: "bg-accent hover:bg-[#b07818] text-[#111] shadow-lg shadow-[#C98A1C]/10",
        secondary: "bg-card hover:bg-primary/[0.05] border border-border text-primary",
        danger: "bg-danger/10 hover:bg-danger/20 border border-red-500/20 text-danger",
    };
    return (
        <button className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>
            {children}
        </button>
    );
};
export default Button;
