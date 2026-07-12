import { Link } from "react-router-dom";

const Dashboard = () => {
    return (
        <div className="min-h-screen bg-gray-100 p-10">

            <h1 className="text-4xl font-bold mb-3">
                TransitOps Dashboard
            </h1>

            <p className="text-gray-600 mb-8">
                Authentication Successful
            </p>

            <div className="flex gap-4">

                <Link
                    to="/vehicles"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow"
                >
                    Vehicle Management
                </Link>

            </div>

        </div>
    );
};

export default Dashboard;