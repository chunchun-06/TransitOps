import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const DashboardLayout = () => {
    return (
        <div
            style={{
                display: "flex",
                height: "100vh",
                background: "#0E0F13",
                background: "#0a0a0a",
                overflow: "hidden",
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
                        color: "#f1f5f9",
                    }}
                >
                    <Outlet />
                </main>

            </div>

        </div>
    );
};

export default DashboardLayout;