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
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 sm:pt-16 pb-10 overflow-y-auto custom-scrollbar">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-sidebar border border-border rounded-2xl shadow-soft w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up">
                
                {/* Header - Sticky */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-sidebar rounded-t-2xl z-20 sticky top-0">
                    <h3 className="text-lg font-bold text-primary tracking-tight">{title}</h3>
                    <button type="button" onClick={onClose} className="text-secondary hover:text-primary transition-colors bg-primary/[0.05] hover:bg-primary/[0.1] p-1.5 rounded-lg">
                        <HiX className="w-4 h-4" />
                    </button>
                </div>
                
                {/* Scrollable Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar modal-content">
                    <style>{`
                        .modal-content form {
                            display: flex;
                            flex-direction: column;
                        }
                        .modal-content form > div:last-child {
                            position: sticky;
                            bottom: -24px;
                            background-color: var(--bg-sidebar);
                            margin: 0 -24px -24px -24px !important;
                            padding: 16px 24px 24px 24px !important;
                            z-index: 10;
                            border-top: 1px solid var(--border-color) !important;
                        }
                    `}</style>
                    {children}
                </div>
            </div>
        </div>
    );
};
export default Modal;
