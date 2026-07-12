import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineShieldExclamation } from 'react-icons/hi';

const Unauthorized = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white p-6">
            <div className="max-w-md w-full text-center bg-[#111111]/50 backdrop-blur-md border border-red-500/20 rounded-2xl p-10 shadow-2xl">
                <div className="flex justify-center mb-6 text-red-500">
                    <HiOutlineShieldExclamation className="w-20 h-20" />
                </div>
                <h1 className="text-3xl font-bold mb-3 tracking-tight">Access Denied</h1>
                <p className="text-gray-400 mb-8 text-sm leading-relaxed">
                    You do not have the required permissions to view this page. Please contact your Fleet Manager if you believe this is an error.
                </p>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full py-3 px-4 border border-white/10 hover:bg-white/5 text-white font-medium rounded-xl transition-all duration-200"
                >
                    Return to Dashboard
                </button>
            </div>
        </div>
    );
};

export default Unauthorized;
