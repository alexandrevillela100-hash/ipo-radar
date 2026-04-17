import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Public pages
import Home from "./pages/Home";
import IPODetail from "./pages/IPODetail";
import SECIPODetail from "./pages/SECIPODetail";
import IPODiscovery from "./pages/IPODiscovery";
import IPOCalendar from "./pages/IPOCalendar";
import Sectors from "./pages/Sectors";
import SectorDetail from "./pages/SectorDetail";
import CompanyComparison from "./pages/CompanyComparison";
import FilingDiff from "./pages/FilingDiff";

// Report & content pages
import AIReport from "./pages/AIReport";
import MarketCommentary from "./pages/MarketCommentary";
import SampleReport from "./pages/SampleReport";

// User dashboard pages
import Dashboard from "./pages/Dashboard";
import Watchlist from "./pages/Watchlist";
import Alerts from "./pages/Alerts";
import SavedReports from "./pages/SavedReports";
import AccountSettings from "./pages/AccountSettings";

// Commercial pages
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Legal from "./pages/Legal";
import StartFree from "./pages/StartFree";

// Auth
import Login from "./pages/Login";

// Authenticated app pages (post-login)
import AppCalendar from "./pages/AppCalendar";
import AppNews from "./pages/AppNews";
import AppStats from "./pages/AppStats";
import AppScreens from "./pages/AppScreens";

function Router() {
  return (
    <Switch>
      {/* P-01: Home / Landing Page */}
      <Route path={"/"} component={Home} />

      {/* Login / Register */}
      <Route path={"/login"} component={Login} />

      {/* P-02: IPO Discovery */}
      <Route path={"/ipos"} component={IPODiscovery} />
      <Route path={"/discover"} component={IPODiscovery} />

      {/* P-03: Company Comparison */}
      <Route path={"/compare"} component={CompanyComparison} />

      {/* P-04: Filing Diff Viewer */}
      <Route path={"/diff"} component={FilingDiff} />
      <Route path={"/diff/:cik"} component={FilingDiff} />

      {/* P-05: AI First-Look Report */}
      <Route path={"/report/:cik"} component={AIReport} />

      {/* P-06: IPO Calendar (public) */}
      <Route path={"/calendar"} component={IPOCalendar} />

      {/* P-07: Sectors Overview */}
      <Route path={"/sectors"} component={Sectors} />

      {/* P-08: Sector Detail */}
      <Route path={"/sectors/:slug"} component={SectorDetail} />

      {/* P-09: Market Commentary / Digest */}
      <Route path={"/digest"} component={MarketCommentary} />
      <Route path={"/commentary"} component={MarketCommentary} />
      <Route path={"/commentary/:id"} component={MarketCommentary} />

      {/* P-10: Sample Report Landing */}
      <Route path={"/sample-report"} component={SampleReport} />

      {/* ─── Authenticated App Pages (post-login) ─── */}
      <Route path={"/app/calendar"} component={AppCalendar} />
      <Route path={"/app/news"} component={AppNews} />
      <Route path={"/app/stats"} component={AppStats} />
      <Route path={"/app/screens"} component={AppScreens} />

      {/* ─── User Dashboard ─── */}
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/dashboard/watchlist"} component={Watchlist} />
      <Route path={"/dashboard/alerts"} component={Alerts} />
      <Route path={"/dashboard/reports"} component={SavedReports} />
      <Route path={"/dashboard/settings"} component={AccountSettings} />

      {/* P-16: Pricing */}
      <Route path={"/pricing"} component={Pricing} />

      {/* P-18: About */}
      <Route path={"/about"} component={About} />

      {/* P-19: Contact */}
      <Route path={"/contact"} component={Contact} />

      {/* P-20: Legal */}
      <Route path={"/terms"} component={Legal} />
      <Route path={"/privacy"} component={Legal} />

      {/* Start Free / Email Registration */}
      <Route path={"/auth"} component={StartFree} />
      <Route path={"/start"} component={StartFree} />
      <Route path={"/signup"} component={StartFree} />

      {/* IPO Detail — CIK (numeric) vs mock slug */}
      <Route path={"/ipo/:cik"}>
        {(params) => {
          if (/^\d+$/.test(params.cik)) {
            return <SECIPODetail />;
          }
          return <IPODetail />;
        }}
      </Route>

      <Route path={"/404"} component={NotFound} />
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
