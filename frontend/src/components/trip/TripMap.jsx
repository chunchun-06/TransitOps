import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  HiOutlineMap, 
  HiOutlineTruck, 
  HiOutlineUser, 
  HiOutlineExclamationCircle,
  HiOutlineCursorClick
} from 'react-icons/hi';

// Custom Leaflet divIcons for Start (A - Green) and Destination (B - Red)
const createMarkerIcon = (text, color) => {
  return L.divIcon({
    className: 'custom-map-icon',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 3px 8px rgba(0,0,0,0.4);
        color: white;
        font-weight: bold;
        font-size: 13px;
        font-family: system-ui, -apple-system, sans-serif;
      ">${text}</div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

const startMarkerIcon = createMarkerIcon('A', '#10B981');
const destMarkerIcon = createMarkerIcon('B', '#EF4444');

// Component to dynamically fit map viewport bounds around markers
const MapBoundsController = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      try {
        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 14 });
      } catch (err) {
        console.error("Failed to fit map bounds:", err);
      }
    } else if (bounds && bounds.length === 1) {
      map.setView(bounds[0], 12);
    }
  }, [bounds, map]);
  return null;
};

// Component to capture map clicks when in selection mode
const MapClickHandler = ({ selectingMode, onSelectLocation }) => {
  const map = useMap();

  useEffect(() => {
    if (selectingMode) {
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.getContainer().style.cursor = '';
    }
  }, [selectingMode, map]);

  useMapEvents({
    async click(e) {
      if (!selectingMode || !onSelectLocation) return;
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'TransitOps-FleetManagement'
            }
          }
        );
        if (response.ok) {
          const data = await response.json();
          if (data && data.display_name) {
            const parts = data.display_name.split(',');
            address = parts.slice(0, 3).join(',').trim();
          }
        }
      } catch (err) {
        console.warn("Reverse geocoding error:", err.message);
      }

      onSelectLocation(selectingMode, { lat, lng, address });
    }
  });
  return null;
};

// Geocoding helper using Nominatim OpenStreetMap API
const geocodeAddress = async (address) => {
  if (!address || !address.trim()) return null;

  const cleanAddr = address.trim();
  const searchQueries = [
    cleanAddr,
    `${cleanAddr}, India`
  ];

  for (const q of searchQueries) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'TransitOps-FleetManagement'
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            displayName: data[0].display_name
          };
        }
      }
    } catch (e) {
      console.warn(`Geocoding lookup failed for '${q}':`, e.message);
    }
  }
  return null;
};

// OSRM Routing helper
const fetchRouteGeometry = async (start, dest) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
        const distanceKm = (data.routes[0].distance / 1000).toFixed(1);
        const durationMin = Math.round(data.routes[0].duration / 60);
        return { coords, distanceKm, durationMin };
      }
    }
  } catch (e) {
    console.warn("OSRM routing service unavailable, falling back to direct line:", e.message);
  }
  return null;
};

const TripMap = ({ 
  trip, 
  vehicle, 
  driver, 
  selectingMode, 
  onSelectLocation,
  draftSource,
  draftDestination,
  onRouteCalculated
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startPos, setStartPos] = useState(null);
  const [destPos, setDestPos] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);

  // Active source/dest strings to display
  const activeSourceStr = draftSource?.address || trip?.source || "";
  const activeDestStr = draftDestination?.address || trip?.destination || "";

  useEffect(() => {
    let isMounted = true;

    const resolveMapData = async () => {
      // 1. If draft coordinates exist from map selection
      let sRes = draftSource ? { lat: draftSource.lat, lng: draftSource.lng } : null;
      let dRes = draftDestination ? { lat: draftDestination.lat, lng: draftDestination.lng } : null;

      // 2. Geocode if text provided without explicit draft coords
      if (!sRes && activeSourceStr) {
        sRes = await geocodeAddress(activeSourceStr);
      }
      if (!dRes && activeDestStr) {
        dRes = await geocodeAddress(activeDestStr);
      }

      if (!isMounted) return;

      if (!sRes && !dRes) {
        setStartPos(null);
        setDestPos(null);
        setRouteCoords([]);
        setRouteInfo(null);
        if (activeSourceStr || activeDestStr) {
          setError(`Unable to locate coordinates for '${activeSourceStr}' or '${activeDestStr}'.`);
        } else {
          setError(null);
        }
        return;
      }

      setError(null);
      const sPos = sRes ? [sRes.lat, sRes.lng] : null;
      const dPos = dRes ? [dRes.lat, dRes.lng] : null;

      setStartPos(sPos);
      setDestPos(dPos);

      // Fetch route if both source & destination coordinates exist
      if (sRes && dRes) {
        const routeRes = await fetchRouteGeometry(sRes, dRes);
        if (isMounted) {
          if (routeRes && routeRes.coords.length > 0) {
            setRouteCoords(routeRes.coords);
            setRouteInfo({ distance: routeRes.distanceKm, duration: routeRes.durationMin });
            if (onRouteCalculated) {
              onRouteCalculated(routeRes.distanceKm);
            }
          } else {
            setRouteCoords([[sRes.lat, sRes.lng], [dRes.lat, dRes.lng]]);
            setRouteInfo(null);
          }
        }
      } else {
        setRouteCoords([]);
        setRouteInfo(null);
      }
    };

    resolveMapData();

    return () => { isMounted = false; };
  }, [activeSourceStr, activeDestStr, draftSource?.lat, draftSource?.lng, draftDestination?.lat, draftDestination?.lng]);

  const vName = vehicle ? `${vehicle.vehicle_name} (${vehicle.registration_no})` : "Unassigned Vehicle";
  const dName = driver ? driver.name : "Unassigned Driver";

  const mapBounds = [];
  if (startPos) mapBounds.push(startPos);
  if (destPos) mapBounds.push(destPos);
  const centerPos = startPos || destPos || [19.076, 72.8777];

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-soft flex flex-col gap-4 relative">
      
      {/* Selection Mode Overlay Banner */}
      {selectingMode && (
        <div className="bg-accent text-card px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between animate-pulse z-10">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <HiOutlineCursorClick className="w-5 h-5 animate-bounce" />
            <span>Click anywhere on map to set {selectingMode.toUpperCase()} location</span>
          </div>
          <span className="text-[11px] font-semibold bg-black/20 px-2.5 py-1 rounded">Active Picker</span>
        </div>
      )}

      {/* Map Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-accent tracking-wider uppercase">INTERACTIVE TRIP MAP</span>
            {trip && (
              <span className="text-xs bg-sidebar px-2 py-0.5 rounded text-secondary border border-border font-mono">TR-{String(trip.id).substring(0,6).toUpperCase()}</span>
            )}
          </div>
          <h3 className="text-base font-bold text-primary mt-1 flex items-center gap-2">
            <span>{activeSourceStr || "Select Source"}</span>
            <span className="text-accent">→</span>
            <span>{activeDestStr || "Select Destination"}</span>
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-secondary">
          {vehicle && (
            <div className="flex items-center gap-1.5 bg-sidebar px-3 py-1.5 rounded-lg border border-border">
              <HiOutlineTruck className="w-4 h-4 text-info" />
              <span className="font-medium text-primary">{vName}</span>
            </div>
          )}
          {driver && (
            <div className="flex items-center gap-1.5 bg-sidebar px-3 py-1.5 rounded-lg border border-border">
              <HiOutlineUser className="w-4 h-4 text-success" />
              <span className="font-medium text-primary">{dName}</span>
            </div>
          )}
          {routeInfo && (
            <div className="flex items-center gap-2 text-accent font-semibold bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20">
              <span>{routeInfo.distance} km</span>
              <span>•</span>
              <span>~{routeInfo.duration} mins</span>
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[420px] rounded-xl overflow-hidden border border-border bg-sidebar z-0">
        
        {loading && (
          <div className="absolute inset-0 z-50 bg-card/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-secondary font-medium">Resolving OpenStreetMap Route...</p>
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2">
            <HiOutlineExclamationCircle className="w-10 h-10 text-warning" />
            <p className="text-sm font-bold text-primary">Route Display Unavailable</p>
            <p className="text-xs text-secondary max-w-sm">{error}</p>
          </div>
        ) : (
          <MapContainer
            center={centerPos}
            zoom={10}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapClickHandler selectingMode={selectingMode} onSelectLocation={onSelectLocation} />

            {mapBounds.length > 0 && <MapBoundsController bounds={mapBounds} />}

            {/* Start Marker A */}
            {startPos && (
              <Marker position={startPos} icon={startMarkerIcon}>
                <Popup>
                  <div className="text-xs font-sans">
                    <strong className="text-emerald-600 block mb-1">Source Location (A)</strong>
                    <p className="font-semibold text-gray-800">{activeSourceStr}</p>
                    <p className="text-[10px] text-gray-500 mt-1">Lat: {startPos[0].toFixed(4)}, Lng: {startPos[1].toFixed(4)}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Destination Marker B */}
            {destPos && (
              <Marker position={destPos} icon={destMarkerIcon}>
                <Popup>
                  <div className="text-xs font-sans">
                    <strong className="text-rose-600 block mb-1">Destination (B)</strong>
                    <p className="font-semibold text-gray-800">{activeDestStr}</p>
                    <p className="text-[10px] text-gray-500 mt-1">Lat: {destPos[0].toFixed(4)}, Lng: {destPos[1].toFixed(4)}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Polyline Route */}
            {routeCoords.length > 0 && (
              <Polyline
                positions={routeCoords}
                color="#3B82F6"
                weight={5}
                opacity={0.85}
              />
            )}
          </MapContainer>
        )}

      </div>

    </div>
  );
};

export default TripMap;
