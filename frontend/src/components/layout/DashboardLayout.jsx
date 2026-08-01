import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const DashboardLayout = () => {
    return (
        <div
            style={{
                display: "flex",
                height: "100vh",
                background: "var(--bg-main)",
                overflow: "hidden",
                transition: "background 0.3s",
            }}
        >
            {/* Collapsible Sidebar */}
            <Sidebar />

            {/* Main area */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    overflow: "hidden",
                    minWidth: 0,
                }}
            >
                <Navbar />

                <main
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "28px 32px",
                        color: "var(--text-primary)",
                        transition: "color 0.3s",
                    }}
                >
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;