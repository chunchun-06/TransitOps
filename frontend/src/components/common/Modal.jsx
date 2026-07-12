import { useEffect } from "react";
import { HiX } from "react-icons/hi";

export const Modal = ({ isOpen, onClose, title, children }) => {
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-sidebar border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-in-up">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <h3 className="text-lg font-bold text-primary tracking-tight">{title}</h3>
                    <button type="button" onClick={onClose} className="text-secondary hover:text-primary transition-colors bg-primary/[0.05] hover:bg-primary/[0.1] p-1.5 rounded-lg">
                        <HiX className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
};
export default Modal;
