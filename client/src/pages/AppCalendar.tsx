import AppShell from "@/components/AppShell";
import { trpc } from "@/lib/trpc";
import { getSectorFromSic } from "@/lib/sic";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  TrendingUp,
  FileText,
  Clock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Helper to format dates
function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function AppCalendar() {
  const { data: filingsData, isLoading } = trpc.edgar.filings.useQuery();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Process filings data
  const { filingsByDate, recentlyFiled, allFilings } = useMemo(() => {
    if (!filingsData) return { filingsByDate: {}, recentlyFiled: [], allFilings: [] };

    const byDate: Record<string, typeof filingsData> = {};
    const all = [...filingsData].sort(
      (a, b) => new Date(b.filing.filingDate).getTime() - new Date(a.filing.filingDate).getTime()
    );

    all.forEach((item) => {
      const date = item.filing.filingDate;
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(item);
    });

    // Recently filed = last 10 filings
    const recent = all.slice(0, 10);

    return { filingsByDate: byDate, recentlyFiled: recent, allFilings: all };
  }, [filingsData]);

  // Calendar grid
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [firstDay, daysInMonth]);

  const getDateStr = (day: number) =>
    `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const selectedFilings = selectedDate ? filingsByDate[selectedDate] || [] : [];

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 text-primary" />
            IPO Calendar
          </h1>
          <p className="text-muted-foreground mt-1">
            Track upcoming IPO filings, amendments, and pricing events.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="xl:col-span-2 bg-card border border-border/50 rounded-xl p-6">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground">
                  {MONTHS[currentMonth]} {currentYear}
                </h2>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={prevMonth}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentMonth(today.getMonth());
                      setCurrentYear(today.getFullYear());
                    }}
                  >
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={nextMonth}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-px mb-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-px">
                {calendarDays.map((day, i) => {
                  if (day === null) {
                    return <div key={`empty-${i}`} className="h-20" />;
                  }
                  const dateStr = getDateStr(day);
                  const events = filingsByDate[dateStr] || [];
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`h-20 p-1.5 rounded-lg text-left transition-colors relative ${
                        isSelected
                          ? "bg-primary/10 border border-primary/30"
                          : isToday
                          ? "bg-primary/5 border border-primary/20"
                          : "hover:bg-secondary/50 border border-transparent"
                      }`}
                    >
                      <span
                        className={`text-xs font-medium ${
                          isToday ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {day}
                      </span>
                      {events.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {events.slice(0, 2).map((ev) => (
                            <div
                              key={ev.filing.id}
                              className={`text-[10px] truncate px-1 py-0.5 rounded ${
                                ev.filing.formType.includes("/A")
                                  ? "bg-amber-500/15 text-amber-400"
                                  : "bg-primary/15 text-primary"
                              }`}
                            >
                              {ev.company.ticker || ev.company.name.slice(0, 8)}
                            </div>
                          ))}
                          {events.length > 2 && (
                            <div className="text-[10px] text-muted-foreground px-1">
                              +{events.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sidebar — Selected date or recently filed */}
            <div className="space-y-6">
              {/* Selected date panel */}
              {selectedDate && (
                <div className="bg-card border border-border/50 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    {formatDate(selectedDate)}
                  </h3>
                  {selectedFilings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No filings on this date.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedFilings.map((item) => {
                        const sector = getSectorFromSic(item.company.sic || "");
                        return (
                          <Link
                            key={item.filing.id}
                            href={`/ipo/${item.company.cik}`}
                            className="block p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors no-underline"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-foreground">
                                {item.company.name}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  item.filing.formType.includes("/A")
                                    ? "bg-amber-500/15 text-amber-400"
                                    : "bg-primary/15 text-primary"
                                }`}
                              >
                                {item.filing.formType}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {item.company.ticker && (
                                <span className="font-mono">{item.company.ticker}</span>
                              )}
                              <span>{sector.name}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Recently Filed */}
              <div className="bg-card border border-border/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Recently Filed
                </h3>
                <div className="space-y-2">
                  {recentlyFiled.map((item) => (
                    <Link
                      key={item.filing.id}
                      href={`/ipo/${item.company.cik}`}
                      className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-secondary/30 transition-colors no-underline group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {item.company.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.filing.formType} &middot; {formatDate(item.filing.filingDate)}
                        </p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0 ml-2" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-card border border-border/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Filing Activity
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold font-mono text-foreground">
                      {allFilings.filter((f) => !f.filing.formType.includes("/A")).length}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Initial Filings</p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold font-mono text-foreground">
                      {allFilings.filter((f) => f.filing.formType.includes("/A")).length}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Amendments</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
