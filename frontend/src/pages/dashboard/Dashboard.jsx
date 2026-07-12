const Dashboard = () => {

    const { currentUser } = useAuth();
    const user = currentUser();
    const roleStyle = ROLE_COLORS[user?.role] || ROLE_COLORS["Fleet Manager"];

    return (
        <div>
            <h1>TransitOps Dashboard</h1>
            <p>Authentication Successful</p>
        </div>
    );

};

export default Dashboard;