import React from "react";
import { useGetFlightStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Plane, PlaneTakeoff, PlaneLanding } from "lucide-react";
import { Link } from "wouter";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

export default function DashboardPage() {
  const { data: stats, isLoading } = useGetFlightStats({
    query: { refetchInterval: 15000 }
  });

  if (isLoading && !stats) {
    return (
      <div className="p-6 md:p-8 w-full max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-primary">SYSTEM OVERVIEW</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32 w-full bg-card" />
          <Skeleton className="h-32 w-full bg-card" />
          <Skeleton className="h-32 w-full bg-card" />
          <Skeleton className="h-32 w-full bg-card" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full bg-card" />
          <Skeleton className="h-[400px] w-full bg-card" />
        </div>
      </div>
    );
  }

  if (!stats) return <div className="p-8 text-destructive">Failed to load system stats.</div>;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3 rounded shadow-lg text-sm font-mono">
          <p className="text-muted-foreground mb-1">{label}</p>
          <p className="text-primary font-bold">{payload[0].value.toLocaleString()} aircraft</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 md:p-8 w-full h-full overflow-y-auto max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">SYSTEM OVERVIEW</h1>
        <div className="text-sm font-mono text-muted-foreground">
          LAST UPDATE: <span className="text-foreground">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">TOTAL TRACKED</CardTitle>
            <Plane className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.total.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">AIRBORNE</CardTitle>
            <PlaneTakeoff className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-400">{stats.airborne.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ON GROUND</CardTitle>
            <PlaneLanding className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-muted-foreground">{stats.on_ground.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className={`bg-card ${stats.emergency_count > 0 ? 'border-destructive shadow-[0_0_15px_rgba(255,23,68,0.2)]' : 'border-border'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">EMERGENCIES</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.emergency_count > 0 ? 'text-destructive pulse-red' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${stats.emergency_count > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {stats.emergency_count.toLocaleString()}
            </div>
            {stats.emergency_count > 0 && (
              <p className="text-xs mt-2">
                <Link href="/emergencies" className="text-destructive hover:underline font-bold">VIEW DETAILS &rarr;</Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-mono text-primary">TOP ORIGIN COUNTRIES</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.top_countries.slice(0, 15)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{fontSize: 12, fontFamily: 'monospace'}} />
                  <YAxis dataKey="country" type="category" width={100} stroke="hsl(var(--muted-foreground))" tick={{fontSize: 12, fontFamily: 'monospace'}} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-mono text-primary">ALTITUDE DISTRIBUTION</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.altitude_buckets}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={140}
                    paddingAngle={2}
                    dataKey="count"
                    stroke="none"
                  >
                    {stats.altitude_buckets.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-card border border-border p-3 rounded shadow-lg text-sm font-mono">
                            <p className="text-muted-foreground mb-1">{data.label}</p>
                            <p className="font-bold" style={{ color: data.color }}>{data.count.toLocaleString()} aircraft</p>
                          </div>
                        );
                      }
                      return null;
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {stats.altitude_buckets.map((bucket, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: bucket.color }}></div>
                  {bucket.label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
