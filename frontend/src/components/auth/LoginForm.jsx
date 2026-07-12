import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../api/auth.api";
import { useAuth } from "../../context/AuthContext";

const LoginForm = () => {

    const navigate = useNavigate();

    const { signin } = useAuth();

    const [form, setForm] = useState({
        email: "",
        password: "",
    });

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            const response = await login(form);

            signin(
                response.data.accessToken,
                response.data.user
            );

            navigate("/dashboard");

        } catch (err) {

            alert(
                err.response?.data?.message ||
                "Login failed"
            );

        }

    };

    return (
        <form onSubmit={handleSubmit}>

            <input
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
            />

            <input
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
            />

            <button type="submit">
                Login
            </button>

        </form>
    );

};

export default LoginForm;