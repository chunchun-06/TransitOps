export const Badge = ({ children, status }) => {
    let style = { background: "var(--btn-bg)", color: "var(--text-secondary)" }; // neutral default

    if (status === "Available" || status === "Completed")
        style = { background: "rgba(22,163,74,0.12)", color: "var(--color-success)", border: "1px solid rgba(22,163,74,0.25)" };
    else if (status === "On Trip" || status === "Dispatched")
        style = { background: "rgba(37,99,235,0.12)", color: "var(--color-info)", border: "1px solid rgba(37,99,235,0.25)" };
    else if (status === "In Shop" || status === "Suspended")
        style = { background: "rgba(217,119,6,0.12)", color: "var(--color-warning)", border: "1px solid rgba(217,119,6,0.25)" };
    else if (status === "Retired" || status === "Cancelled" || status === "Expired")
        style = { background: "rgba(220,38,38,0.12)", color: "var(--color-danger)", border: "1px solid rgba(220,38,38,0.25)" };
    else if (status === "Off Duty" || status === "Draft")
        style = { background: "rgba(90,100,115,0.10)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" };

    return (
        <span
            className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md inline-block"
            style={style}
        >
            {children}
        </span>
    );
};
export default Badge;
