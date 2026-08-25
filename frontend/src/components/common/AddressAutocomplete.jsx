import { useState, useEffect, useRef } from "react";
import { HiOutlineLocationMarker, HiOutlineSearch, HiOutlineX } from "react-icons/hi";

const AddressAutocomplete = ({ 
    label, 
    value = "", 
    onChange, 
    onSelectLocation, 
    placeholder = "Search location...",
    required = false,
    className = ""
}) => {
    const [query, setQuery] = useState(value);
    const [suggestions, setSuggestions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState(false);
    const dropdownRef = useRef(null);

    // Sync input value if controlled prop changes externally
    useEffect(() => {
        setQuery(value);
    }, [value]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounced search query fetching from OpenStreetMap Nominatim
    useEffect(() => {
        if (!query || query.trim().length < 2) {
            setSuggestions([]);
            setApiError(false);
            setIsOpen(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                setLoading(true);
                setApiError(false);
                setIsOpen(true);
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=6&addressdetails=1&countrycodes=in,pk,bd,np,lk`,
                    {
                        headers: {
                            'Accept-Language': 'en',
                            'User-Agent': 'TransitOps-FleetManagement/1.0'
                        }
                    }
                );
                if (!res.ok) {
                    throw new Error(`HTTP Error ${res.status}`);
                }
                const data = await res.json();
                setSuggestions(data || []);
            } catch (err) {
                console.error("Nominatim search error:", err);
                setApiError(true);
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [query]);

    const handleInputChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        if (onChange) onChange(val);
    };

    const handleSelect = (item) => {
        const name = item.display_name;
        setQuery(name);
        setIsOpen(false);
        // Do NOT call onChange here to avoid resetting coordinates.
        // Let onSelectLocation handle setting both name and coordinates.
        if (onSelectLocation) {
            onSelectLocation({
                address: name,
                latitude: parseFloat(item.lat),
                longitude: parseFloat(item.lon)
            });
        }
    };

    const handleClear = () => {
        setQuery("");
        setSuggestions([]);
        setIsOpen(false);
        setApiError(false);
        if (onChange) onChange("");
    };

    return (
        <div className={`relative flex flex-col gap-1.5 ${className}`} ref={dropdownRef}>
            {label && (
                <label className="text-xs font-semibold text-secondary flex items-center justify-between">
                    <span>{label} {required && <span className="text-accent">*</span>}</span>
                    {loading && <span className="text-[10px] text-accent animate-pulse">Searching map...</span>}
                </label>
            )}

            <div className="relative">
                <HiOutlineLocationMarker className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                
                <input 
                    type="text" 
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => { if (query && query.trim().length >= 2) setIsOpen(true); }}
                    placeholder={placeholder}
                    required={required}
                    className="form-input border text-sm rounded-xl pl-10 pr-9 py-2.5 outline-none transition-colors w-full bg-sidebar border-border text-primary focus:border-accent"
                />

                {query && (
                    <button 
                        type="button" 
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
                    >
                        <HiOutlineX className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Suggestions Dropdown */}
            {isOpen && query && query.trim().length >= 2 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                    {loading && (
                        <div className="px-4 py-3 text-xs text-secondary flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                            <span>Searching locations...</span>
                        </div>
                    )}
                    
                    {!loading && apiError && (
                        <div className="px-4 py-3 text-xs text-danger">
                            Unable to search locations. Please try again.
                        </div>
                    )}

                    {!loading && !apiError && suggestions.length === 0 && (
                        <div className="px-4 py-3 text-xs text-muted italic">
                            No matching locations found.
                        </div>
                    )}

                    {!loading && !apiError && suggestions.map((item, idx) => (
                        <div
                            key={item.place_id || idx}
                            onClick={() => handleSelect(item)}
                            className="px-4 py-3 text-xs border-b border-border/50 hover:bg-accent/10 cursor-pointer transition-colors flex items-start gap-3 text-primary group"
                        >
                            <HiOutlineLocationMarker className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                            <div className="flex-1 overflow-hidden">
                                <p className="font-semibold text-primary group-hover:text-accent truncate">{item.display_name.split(',')[0]}</p>
                                <p className="text-[11px] text-secondary truncate">{item.display_name}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AddressAutocomplete;
