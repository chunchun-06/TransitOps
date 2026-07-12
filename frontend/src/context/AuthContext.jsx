import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(
        JSON.parse(localStorage.getItem("user"))
    );

    const signin = (token, userData) => {

        localStorage.setItem(
            "accessToken",
            token
        );

        localStorage.setItem(
            "user",
            JSON.stringify(userData)
        );

        setUser(userData);

    };

    const signout = () => {

        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");

        setUser(null);

    };

    return (
        <AuthContext.Provider
            value={{
                user,
                signin,
                signout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );

};

export const useAuth = () => {
    return useContext(AuthContext);
};