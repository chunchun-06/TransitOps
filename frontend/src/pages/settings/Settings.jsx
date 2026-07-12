import { useTheme } from "../../context/ThemeContext";
import { HiOutlineSun, HiOutlineMoon, HiOutlineDesktopComputer } from "react-icons/hi";

const Settings = () => {
    const { theme, setTheme } = useTheme();

    return (
        <div className="animate-fade-in-up space-y-6 max-w-[1000px] mx-auto text-primary">
            <h1 className="text-2xl font-bold">Settings</h1>
            
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
                <div>
                    <h2 className="text-lg font-semibold mb-2">Appearance</h2>
                    <p className="text-sm text-secondary mb-4">Choose how TransitOps looks to you.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button 
                            onClick={() => setTheme("Light")}
                            className={`flex flex-col items-center justify-center p-6 border rounded-xl transition-all ${
                                theme === "Light" 
                                ? "border-accent bg-accent/10" 
                                : "border-border hover:border-accent hover:bg-card/50"
                            }`}
                        >
                            <HiOutlineSun className={`w-8 h-8 mb-3 ${theme === "Light" ? "text-accent" : "text-muted"}`} />
                            <span className="font-semibold">Light</span>
                        </button>
                        
                        <button 
                            onClick={() => setTheme("Dark")}
                            className={`flex flex-col items-center justify-center p-6 border rounded-xl transition-all ${
                                theme === "Dark" 
                                ? "border-accent bg-accent/10" 
                                : "border-border hover:border-accent hover:bg-card/50"
                            }`}
                        >
                            <HiOutlineMoon className={`w-8 h-8 mb-3 ${theme === "Dark" ? "text-accent" : "text-muted"}`} />
                            <span className="font-semibold">Dark</span>
                        </button>

                        <button 
                            onClick={() => setTheme("System")}
                            className={`flex flex-col items-center justify-center p-6 border rounded-xl transition-all ${
                                theme === "System" 
                                ? "border-accent bg-accent/10" 
                                : "border-border hover:border-accent hover:bg-card/50"
                            }`}
                        >
                            <HiOutlineDesktopComputer className={`w-8 h-8 mb-3 ${theme === "System" ? "text-accent" : "text-muted"}`} />
                            <span className="font-semibold">System</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;