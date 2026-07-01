import React from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import MapPage from "@/pages/map";
import DashboardPage from "@/pages/dashboard";
import FlightsPage from "@/pages/flights";
import EmergenciesPage from "@/pages/emergencies";
import 'leaflet/dist/leaflet.css';

const queryClient = new QueryClient();

// Add dark mode class forcefully
if (typeof document !== 'undefined') {
  document.documentElement.classList.add('dark');
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={MapPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/flights" component={FlightsPage} />
        <Route path="/emergencies" component={EmergenciesPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
