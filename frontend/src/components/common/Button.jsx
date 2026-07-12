export const Button = ({ children, variant = "primary", className = "", ...props }) => {
    const base = "px-4 py-2.5 rounded-lg font-bold transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
        primary: "bg-accent hover:brightness-110 text-white shadow-md",
        secondary: "bg-info hover:brightness-110 text-white shadow-md",
        danger: "bg-danger hover:brightness-110 text-white shadow-md",
        success: "bg-success hover:brightness-110 text-white shadow-md",
        outline: "bg-transparent border border-border hover:bg-card text-primary shadow-sm",
    };
    return (
        <button className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>
            {children}
        </button>
    );
};
export default Button;
