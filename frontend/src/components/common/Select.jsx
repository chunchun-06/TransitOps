export const Select = ({ label, error, options = [], className = "", ...props }) => {
    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && <label className="text-xs font-semibold text-secondary uppercase tracking-wide">{label}</label>}
            <select 
                className={`bg-background border ${error ? 'border-red-500' : 'border-border focus:border-accent'} text-sm text-primary rounded-lg px-4 py-2.5 outline-none transition-colors w-full appearance-none cursor-pointer disabled:opacity-50`}
                {...props}
            >
                {options.map((opt, i) => (
                    <option key={i} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {error && <span className="text-xs text-danger mt-0.5">{error}</span>}
        </div>
    );
};
export default Select;
