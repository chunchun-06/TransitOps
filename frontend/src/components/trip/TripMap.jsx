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

const isValidLatLng = (pos) => Array.isArray(pos) && pos.length === 2 && !isNaN(pos[0]) && !isNaN(pos[1]) && pos[0] !== null && pos[1] !== null;

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

const tollMarkerIcon = L.divIcon({
  className: 'custom-toll-icon',
  html: `
    <div style="
      background-color: #F59E0B;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      color: white;
      font-weight: bold;
      font-size: 11px;
      font-family: system-ui, -apple-system, sans-serif;
    ">🛑</div>
  `,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -13]
});

const TripMap = ({ 
  trip, 
  vehicle, 
  driver, 
  selectingMode, 
  onSelectLocation,
  draftSource,
  draftDestination,
  sourceText,
  destinationText,
  onRouteCalculated,
  tolls = []
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startPos, setStartPos] = useState(null);
  const [destPos, setDestPos] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);

  // Active source/dest strings to display
  const activeSourceStr = draftSource?.address || sourceText || trip?.source || "";
  const activeDestStr = draftDestination?.address || destinationText || trip?.destination || "";

  // Calculate toll positions along the route — every toll MUST get a position
  const tollPositions = tolls.map((t, idx) => {
    let pos = null;
    const fraction = (idx + 1) / (tolls.length + 1);

    if (routeCoords.length >= 2) {
      // Interpolate along actual route polyline
      const coordIdx = Math.min(
        Math.floor(fraction * (routeCoords.length - 1)),
        routeCoords.length - 1
      );
      pos = routeCoords[coordIdx];
    } else if (isValidLatLng(startPos) && isValidLatLng(destPos)) {
      // Fallback: linear interpolation between start and destination
      const lat = startPos[0] + fraction * (destPos[0] - startPos[0]);
      const lng = startPos[1] + fraction * (destPos[1] - startPos[1]);
      pos = [lat, lng];
    } else if (isValidLatLng(startPos)) {
      // Only source known — cluster near source
      pos = [startPos[0] + fraction * 0.05, startPos[1] + fraction * 0.05];
    } else if (isValidLatLng(destPos)) {
      // Only destination known — cluster near destination
      pos = [destPos[0] - fraction * 0.05, destPos[1] - fraction * 0.05];
    }
    return { ...t, pos };
  });

  useEffect(() => {
    let isMounted = true;

    const resolveMapData = async () => {
      // 1. Resolve coordinates from props/state or fallback to trip coordinates
      let sRes = null;
      if (draftSource?.lat != null) {
        sRes = { lat: parseFloat(draftSource.lat), lng: parseFloat(draftSource.lng) };
      } else if (trip?.source_latitude != null && trip?.source_longitude != null) {
        sRes = { lat: parseFloat(trip.source_latitude), lng: parseFloat(trip.source_longitude) };
      }

      let dRes = null;
      if (draftDestination?.lat != null) {
        dRes = { lat: parseFloat(draftDestination.lat), lng: parseFloat(draftDestination.lng) };
      } else if (trip?.destination_latitude != null && trip?.destination_longitude != null) {
        dRes = { lat: parseFloat(trip.destination_latitude), lng: parseFloat(trip.destination_longitude) };
      }

      if (!isMounted) return;

      if (!sRes && !dRes) {
        setStartPos(null);
        setDestPos(null);
        setRouteCoords([]);
        setRouteInfo(null);
        setLoading(false);
        setError(null);
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
              onRouteCalculated({
                distanceKm: parseFloat(routeRes.distanceKm),
                durationMin: routeRes.durationMin,
                sourceLat: sRes.lat,
                sourceLng: sRes.lng,
                destLat: dRes.lat,
                destLng: dRes.lng
              });
            }
          } else {
            // OSRM unavailable — draw straight line and estimate distance
            const R = 6371;
            const dLat = (dRes.lat - sRes.lat) * Math.PI / 180;
            const dLng = (dRes.lng - sRes.lng) * Math.PI / 180;
            const a = Math.sin(dLat/2)**2 + Math.cos(sRes.lat * Math.PI/180) * Math.cos(dRes.lat * Math.PI/180) * Math.sin(dLng/2)**2;
            const straightLineKm = (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
            const estimatedMin = Math.round((straightLineKm / 50) * 60);

            setRouteCoords([[sRes.lat, sRes.lng], [dRes.lat, dRes.lng]]);
            setRouteInfo({ distance: straightLineKm, duration: estimatedMin });
            if (onRouteCalculated) {
              onRouteCalculated({
                distanceKm: parseFloat(straightLineKm),
                durationMin: estimatedMin,
                sourceLat: sRes.lat,
                sourceLng: sRes.lng,
                destLat: dRes.lat,
                destLng: dRes.lng
              });
            }
          }
        }
      } else {
        setRouteCoords([]);
        setRouteInfo(null);
      }

      if (isMounted) setLoading(false);
    };

    resolveMapData();

    return () => { isMounted = false; };
  }, [
    draftSource?.lat, 
    draftSource?.lng, 
    draftDestination?.lat, 
    draftDestination?.lng, 
    trip?.source_latitude, 
    trip?.source_longitude, 
    trip?.destination_latitude, 
    trip?.destination_longitude
  ]);

  const vName = vehicle ? `${vehicle.vehicle_name} (${vehicle.registration_no})` : "Unassigned Vehicle";
  const dName = driver ? driver.name : "Unassigned Driver";

  const boundsToFit = [];
  if (isValidLatLng(startPos)) boundsToFit.push(startPos);
  if (isValidLatLng(destPos)) boundsToFit.push(destPos);
  const centerPos = isValidLatLng(startPos) ? startPos : (isValidLatLng(destPos) ? destPos : [19.076, 72.8777]);

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

            {boundsToFit.length > 0 && <MapBoundsController bounds={boundsToFit} />}

            {/* Start Marker A */}
            {isValidLatLng(startPos) && (
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
            {isValidLatLng(destPos) && (
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

            {/* Toll Gate Markers along Route */}
            {tollPositions.map((t, idx) => (
              t && isValidLatLng(t.pos) && (
                <Marker key={t.id || idx} position={t.pos} icon={tollMarkerIcon}>
                  <Popup>
                    <div className="text-xs font-sans min-w-[170px]">
                      <strong className="text-amber-600 block mb-1">🛑 Toll Plaza #{idx + 1}</strong>
                      <p className="font-bold text-gray-900 leading-tight">{t.toll_name || "Toll Gate"}</p>
                      <p className="text-gray-600 text-[11px] mt-0.5">{t.highway || "Highway"} • {t.location || "Corridor"}</p>
                      <div className="mt-2 pt-1.5 border-t border-gray-200 flex justify-between font-bold text-emerald-700 text-xs">
                        <span>Fee ({t.vehicle_class || "Vehicle"}):</span>
                        <span>₹{parseFloat(t.toll_amount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}

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
