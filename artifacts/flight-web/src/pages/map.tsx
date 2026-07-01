import React, { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useGetFlights } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, AlertTriangle } from "lucide-react";

// Fix default icon issues with Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow
});
L.Marker.prototype.options.icon = DefaultIcon;

// Helper to get color based on altitude (meters)
const getAltitudeColor = (alt: number | null | undefined, isEmergency: boolean) => {
  if (isEmergency) return "#ff1744"; // Red for emergency
  if (alt === null || alt === undefined) return "#808080"; // Grey for ground/unknown
  if (alt >= 10000) return "#00e5ff"; // Cyan for cruise
  if (alt >= 6000) return "#ff9800"; // Orange for high
  if (alt >= 1500) return "#ffeb3b"; // Yellow for mid
  return "#4caf50"; // Green for low
};

// Create a custom DivIcon for planes
const createPlaneIcon = (heading: number | null, color: string) => {
  const rotation = heading || 0;
  
  // SVG string for plane icon
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="#000" stroke-width="1" width="24" height="24" style="transform: rotate(${rotation}deg); transform-origin: center;"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;
  
  return L.divIcon({
    html: svgString,
    className: "plane-icon",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

export default function MapPage() {
  const { data, isLoading } = useGetFlights({
    query: { refetchInterval: 10000 }
  });

  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");

  const filteredFlights = useMemo(() => {
    if (!data?.flights) return [];
    
    return data.flights.filter(f => {
      const matchSearch = !search || 
        (f.callsign && f.callsign.toLowerCase().includes(search.toLowerCase())) ||
        (f.icao24 && f.icao24.toLowerCase().includes(search.toLowerCase()));
        
      const matchCountry = !countryFilter || 
        (f.origin_country && f.origin_country.toLowerCase().includes(countryFilter.toLowerCase()));
        
      return matchSearch && matchCountry;
    });
  }, [data?.flights, search, countryFilter]);

  return (
    <div className="flex h-full w-full relative">
      {/* Sidebar Overlay */}
      <div className="absolute top-4 left-4 z-[1000] w-72 flex flex-col gap-4 max-h-[calc(100vh-2rem)]">
        <div className="bg-card/90 backdrop-blur-md border border-border p-4 rounded-md shadow-lg flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-primary tracking-tight">RADAR CONTROL</h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {isLoading ? "SCANNING..." : "LIVE"}
            </Badge>
          </div>
          
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Callsign or ICAO" 
                className="pl-9 bg-background/50 border-muted"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Origin Country" 
                className="pl-9 bg-background/50 border-muted"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
              />
            </div>
          </div>
          
          <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#00e5ff] rounded-full"></div> &ge;10km (Cruise)</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#ff9800] rounded-full"></div> 6-10km</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#ffeb3b] rounded-full"></div> 1.5-6km</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#4caf50] rounded-full"></div> &lt;1.5km</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#808080] rounded-full"></div> Ground/Unknown</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#ff1744] rounded-full"></div> Emergency</div>
          </div>
          
          <div className="pt-2 border-t border-border/50 text-sm font-medium flex justify-between">
            <span className="text-muted-foreground">TRACKING:</span>
            <span className="text-foreground">{filteredFlights.length} AIRCRAFT</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="w-full h-full bg-black z-0">
        <MapContainer 
          center={[20, 0]} 
          zoom={3} 
          style={{ height: "100%", width: "100%", zIndex: 0 }}
          zoomControl={false}
          worldCopyJump={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          {filteredFlights.map((flight) => {
            if (!flight.latitude || !flight.longitude) return null;
            
            const color = getAltitudeColor(flight.altitude, flight.emergency);
            
            return (
              <Marker 
                key={flight.icao24} 
                position={[flight.latitude, flight.longitude]}
                icon={createPlaneIcon(flight.heading, color)}
              >
                <Popup className="bg-card text-card-foreground border-border">
                  <div className="p-1 min-w-[200px]">
                    <div className="flex justify-between items-center mb-3 border-b border-border pb-2">
                      <strong className="text-lg text-primary">{flight.callsign || flight.icao24}</strong>
                      {flight.emergency && (
                        <Badge variant="destructive" className="animate-pulse">EMERGENCY</Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-2 text-sm font-mono">
                      <span className="text-muted-foreground">ICAO24:</span>
                      <span className="text-right uppercase">{flight.icao24}</span>
                      
                      <span className="text-muted-foreground">COUNTRY:</span>
                      <span className="text-right truncate uppercase" title={flight.origin_country}>
                        {flight.origin_country}
                      </span>
                      
                      <span className="text-muted-foreground">ALTITUDE:</span>
                      <span className="text-right">
                        {flight.altitude 
                          ? `${Math.round(flight.altitude)}m / ${Math.round(flight.altitude * 3.28084)}ft` 
                          : 'Ground'}
                      </span>
                      
                      <span className="text-muted-foreground">SPEED:</span>
                      <span className="text-right">
                        {flight.velocity 
                          ? `${Math.round(flight.velocity * 3.6)}km/h / ${Math.round(flight.velocity * 1.94384)}kts` 
                          : '0'}
                      </span>
                      
                      <span className="text-muted-foreground">HEADING:</span>
                      <span className="text-right">{flight.heading ? `${Math.round(flight.heading)}°` : 'N/A'}</span>
                      
                      <span className="text-muted-foreground">SQUAWK:</span>
                      <span className="text-right font-bold text-accent-foreground">{flight.squawk || 'N/A'}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}