import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import Sales from "@/pages/sales";
import Products from "@/pages/products";
import Customers from "@/pages/customers";
import Orders from "@/pages/orders";
import Reports from "@/pages/reports";
import Plots from "@/pages/plots";
import Home from "@/pages/home";
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading ? (
        <Route path="*">
          <div className="min-h-screen flex items-center justify-center">
            <div>Loading...</div>
          </div>
        </Route>
      ) : !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="*" component={Landing} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/sales" component={Sales} />
          <Route path="/products" component={Products} />
          <Route path="/customers" component={Customers} />
          <Route path="/orders" component={Orders} />
          <Route path="/reports" component={Reports} />
          <Route path="/plots" component={Plots} />
          <Route path="*" component={NotFound} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="salestracker-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
