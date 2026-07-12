export const Input = ({ label, error, className = "", ...props }) => {
    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && <label className="text-xs font-semibold text-secondary uppercase tracking-wide">{label}</label>}
            <input 
                className={`bg-card border ${error ? 'border-danger' : 'border-border focus:border-accent focus:ring-1 focus:ring-accent'} text-sm text-primary rounded-lg px-4 py-2.5 outline-none transition-all w-full placeholder-gray-500 disabled:opacity-50 shadow-sm`}
                {...props}
            />
            {error && <span className="text-xs text-danger mt-0.5">{error}</span>}
        </div>
    );
};
export default Input;
