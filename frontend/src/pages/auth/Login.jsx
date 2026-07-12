import LoginForm from "../../components/auth/LoginForm";

const Login = () => {

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
            }}
        >
            <LoginForm />
        </div>
    );

};

export default Login;