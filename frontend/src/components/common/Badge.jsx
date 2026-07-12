export const Badge = ({ children, status }) => {
    let colorClass = "bg-[#4B5563] text-primary";
    if (status === "Available" || status === "Completed") colorClass = "bg-success text-primary";
    else if (status === "On Trip" || status === "Dispatched") colorClass = "bg-info text-primary";
    else if (status === "In Shop" || status === "Suspended") colorClass = "bg-warning text-primary";
    else if (status === "Retired") colorClass = "bg-[#F87171] text-primary";

    return (
        <span className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md inline-block ${colorClass}`}>
            {children}
        </span>
    );
};
export default Badge;
