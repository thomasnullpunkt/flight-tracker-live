import React, { useState, useMemo } from "react";
import { useGetFlights } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, ChevronsUpDown, Search, ArrowLeft, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type SortField = 'callsign' | 'icao24' | 'origin_country' | 'altitude' | 'velocity' | 'heading' | 'squawk';
type SortOrder = 'asc' | 'desc';

export default function FlightsPage() {
  const { data, isLoading } = useGetFlights({
    query: { refetchInterval: 15000 }
  });

  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>('altitude');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(0);
  const pageSize = 100;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc'); // default to desc for numeric, could be smarter but works
    }
    setPage(0); // reset page on sort
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-4 h-4 ml-1 opacity-20" />;
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 ml-1 text-primary" /> : <ChevronDown className="w-4 h-4 ml-1 text-primary" />;
  };

  const processedFlights = useMemo(() => {
    if (!data?.flights) return [];
    
    // Filter
    const filtered = data.flights.filter(f => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        (f.callsign && f.callsign.toLowerCase().includes(s)) ||
        (f.icao24 && f.icao24.toLowerCase().includes(s)) ||
        (f.origin_country && f.origin_country.toLowerCase().includes(s)) ||
        (f.squawk && f.squawk.toLowerCase().includes(s))
      );
    });

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      
      // Handle nulls
      if (aVal === null || aVal === undefined) aVal = sortOrder === 'asc' ? Infinity : -Infinity;
      if (bVal === null || bVal === undefined) bVal = sortOrder === 'asc' ? Infinity : -Infinity;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [data?.flights, search, sortField, sortOrder]);

  const totalPages = Math.ceil(processedFlights.length / pageSize);
  const paginatedFlights = processedFlights.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 md:p-8 w-full max-w-[1600px] mx-auto gap-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary uppercase">Global Flight Directory</h1>
          <p className="text-sm text-muted-foreground font-mono">
            {isLoading ? "Fetching records..." : `${processedFlights.length.toLocaleString()} matching records found`}
          </p>
        </div>
        
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search callsign, ICAO, country..." 
            className="pl-9 bg-card border-border font-mono"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto border border-border rounded-md bg-card">
        <Table className="relative">
          <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
            <TableRow className="border-border">
              <TableHead className="w-[120px] font-mono font-bold cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('callsign')}>
                <div className="flex items-center">CALLSIGN <SortIcon field="callsign" /></div>
              </TableHead>
              <TableHead className="font-mono font-bold cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('icao24')}>
                <div className="flex items-center">ICAO24 <SortIcon field="icao24" /></div>
              </TableHead>
              <TableHead className="font-mono font-bold cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('origin_country')}>
                <div className="flex items-center">COUNTRY <SortIcon field="origin_country" /></div>
              </TableHead>
              <TableHead className="text-right font-mono font-bold cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('altitude')}>
                <div className="flex items-center justify-end">ALTITUDE <SortIcon field="altitude" /></div>
              </TableHead>
              <TableHead className="text-right font-mono font-bold cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('velocity')}>
                <div className="flex items-center justify-end">SPEED <SortIcon field="velocity" /></div>
              </TableHead>
              <TableHead className="text-right font-mono font-bold cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('heading')}>
                <div className="flex items-center justify-end">HEADING <SortIcon field="heading" /></div>
              </TableHead>
              <TableHead className="text-right font-mono font-bold cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('squawk')}>
                <div className="flex items-center justify-end">SQUAWK <SortIcon field="squawk" /></div>
              </TableHead>
              <TableHead className="w-[100px] text-center font-mono font-bold">STATUS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 15 }).map((_, i) => (
                <TableRow key={i} className="border-border/50">
                  <TableCell><Skeleton className="h-5 w-20 bg-muted" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 bg-muted" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32 bg-muted" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-16 bg-muted ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-16 bg-muted ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-12 bg-muted ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-12 bg-muted ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 bg-muted mx-auto" /></TableCell>
                </TableRow>
              ))
            ) : paginatedFlights.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-64 text-center text-muted-foreground font-mono">
                  NO AIRCRAFT MATCHING CRITERIA
                </TableCell>
              </TableRow>
            ) : (
              paginatedFlights.map((flight) => (
                <TableRow key={flight.icao24} className="border-border/50 hover:bg-secondary/50 transition-colors font-mono text-sm">
                  <TableCell className="font-bold text-primary">{flight.callsign || '-'}</TableCell>
                  <TableCell className="text-muted-foreground uppercase">{flight.icao24}</TableCell>
                  <TableCell className="uppercase truncate max-w-[200px]" title={flight.origin_country}>{flight.origin_country}</TableCell>
                  <TableCell className="text-right">
                    {flight.altitude ? `${Math.round(flight.altitude)}m` : 'GROUND'}
                  </TableCell>
                  <TableCell className="text-right">
                    {flight.velocity ? `${Math.round(flight.velocity * 3.6)}km/h` : '0'}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {flight.heading ? `${Math.round(flight.heading)}°` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {flight.squawk || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {flight.emergency ? (
                      <Badge variant="destructive" className="animate-pulse shadow-[0_0_10px_rgba(255,23,68,0.5)]">EMERG</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">NORM</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && processedFlights.length > 0 && (
        <div className="flex items-center justify-between shrink-0 bg-card p-4 border border-border rounded-md font-mono text-sm">
          <div className="text-muted-foreground">
            PAGE {page + 1} OF {totalPages || 1}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="border-border hover:bg-secondary hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> PREV
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="border-border hover:bg-secondary hover:text-foreground"
            >
              NEXT <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}