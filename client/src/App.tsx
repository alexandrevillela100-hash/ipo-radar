import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import CompanyDetail from "./pages/CompanyDetail";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCompanies from "./pages/AdminCompanies";
import AdminFilings from "./pages/AdminFilings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/company/:slug" component={CompanyDetail} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/companies" component={AdminCompanies} />
      <Route path="/admin/companies/:companyId/filings" component={AdminFilings} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
