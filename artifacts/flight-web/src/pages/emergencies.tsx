import React from "react";
import { useGetFlights } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ShieldCheck } from "lucide-react";

export default function EmergenciesPage() {
  const { data, isLoading } = useGetFlights({
    query: { refetchInterval: 10000 }
  });

  const emergencies = data?.flights?.filter(f => f.emergency) || [];

  if (isLoading && !data) {
    return (
      <div className="p-6 md:p-8 w-full max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-destructive uppercase flex items-center gap-2">
          <AlertTriangle className="w-6 h-6" /> Emergency Frequencies
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48 w-full bg-card" />
          <Skeleton className="h-48 w-full bg-card" />
          <Skeleton className="h-48 w-full bg-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 w-full h-full overflow-y-auto max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-destructive uppercase flex items-center gap-3 pulse-red rounded-sm px-2">
          <AlertTriangle className="w-6 h-6" /> 
          EMERGENCY SQUAWKS DETECTED
        </h1>
        <Badge variant="destructive" className="text-base px-3 py-1">
          {emergencies.length} ACTIVE
        </Badge>
      </div>

      {emergencies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.15)]">
            <ShieldCheck className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-mono font-bold text-green-500 tracking-widest">ALL CLEAR</h2>
          <p className="text-muted-foreground font-mono max-w-md">
            No general emergency (7700), radio failure (7600), or hijack (7500) codes detected in global airspace.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {emergencies.map((flight) => (
            <Card key={flight.icao24} className="bg-card border-destructive shadow-[0_0_15px_rgba(255,23,68,0.15)] overflow-hidden relative group">
              <div className="absolute top-0 left-0 w-full h-1 bg-destructive pulse-red"></div>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-2xl font-bold text-foreground font-mono">
                      {flight.callsign || 'UNKNOWN'}
                    </div>
                    <div className="text-sm text-muted-foreground font-mono">
                      ICAO: {flight.icao24.toUpperCase()}
                    </div>
                  </div>
                  <Badge variant="destructive" className="font-mono text-lg animate-pulse">
                    {flight.squawk}
                  </Badge>
                </div>
                
                <div className="space-y-3 font-mono text-sm border-t border-border pt-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">COUNTRY</span>
                    <span className="font-medium text-foreground uppercase truncate max-w-[150px]">{flight.origin_country}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ALTITUDE</span>
                    <span className="font-medium text-foreground">
                      {flight.altitude ? `${Math.round(flight.altitude)}m` : 'GROUND'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SPEED</span>
                    <span className="font-medium text-foreground">
                      {flight.velocity ? `${Math.round(flight.velocity * 3.6)}km/h` : '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">LOCATION</span>
                    <span className="font-medium text-foreground">
                      {flight.latitude?.toFixed(4)}, {flight.longitude?.toFixed(4)}
                    </span>
                  </div>
                </div>
                
                <div className="mt-5 pt-4 border-t border-border flex gap-2">
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-mono text-xs w-full justify-center py-1">
                    PRIORITY TRACKING ENGAGED
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}