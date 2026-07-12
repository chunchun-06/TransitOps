import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineExclamationCircle } from 'react-icons/hi';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-primary p-6">
            <div className="max-w-md w-full text-center bg-[#111111]/50 backdrop-blur-md border border-white/10 rounded-2xl p-10 shadow-2xl">
                <div className="flex justify-center mb-6 text-accent">
                    <HiOutlineExclamationCircle className="w-20 h-20" />
                </div>
                <h1 className="text-4xl font-extrabold mb-4 tracking-tight">404</h1>
                <h2 className="text-xl font-semibold mb-2">Page Not Found</h2>
                <p className="text-secondary mb-8 text-sm">
                    The page you are looking for doesn't exist or has been moved.
                </p>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full py-3 px-4 bg-gradient-to-r from-[#C98A1C] to-[#E6B040] text-black font-semibold rounded-xl hover:brightness-110 transition-all duration-200"
                >
                    Back to Dashboard
                </button>
            </div>
        </div>
    );
};

export default NotFound;
