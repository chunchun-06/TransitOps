export const Input = ({ label, error, className = "", ...props }) => {
    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && <label className="text-xs font-semibold text-secondary uppercase tracking-wide">{label}</label>}
            <input 
                className={`form-input border text-sm rounded-lg px-4 py-2.5 outline-none transition-all w-full disabled:opacity-50 shadow-sm ${error ? '!border-danger focus:!border-danger focus:!ring-danger' : ''}`}
                {...props}
            />
            <div className="min-h-[20px]">
                {error && <span className="text-xs text-danger">{error}</span>}
            </div>
        </div>
    );
};
export default Input;
