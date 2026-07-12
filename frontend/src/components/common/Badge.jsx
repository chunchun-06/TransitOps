export const Badge = ({ children, status }) => {
    let colorClass = "bg-[#4B5563] text-white";
    if (status === "Available" || status === "Completed") colorClass = "bg-[#10B981] text-white";
    else if (status === "On Trip" || status === "Dispatched") colorClass = "bg-[#3B82F6] text-white";
    else if (status === "In Shop" || status === "Suspended") colorClass = "bg-[#F59E0B] text-white";
    else if (status === "Retired") colorClass = "bg-[#F87171] text-white";

    return (
        <span className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md inline-block ${colorClass}`}>
            {children}
        </span>
    );
};
export default Badge;
