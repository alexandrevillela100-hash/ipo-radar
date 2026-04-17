import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { getSectorInfo } from "@/lib/sectorUtils";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function IPOCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: filings, isLoading } = trpc.edgar.filings.useQuery();

  // Group filings by date
  const filingsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    if (!filings) return map;
    filings.forEach((f: any) => {
      const date = f.filing?.filingDate;
      if (date) {
        if (!map[date]) map[date] = [];
        map[date].push(f);
      }
    });
    return map;
  }, [filings]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
    setSelectedDate(null);
  };

  const selectedFilings = selectedDate ? (filingsByDate[selectedDate] || []) : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-12">
        <div className="container">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              IPO Calendar
            </h1>
            <p className="text-muted-foreground">
              Track SEC filing events on a visual calendar. Click any date to see filings.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2 bg-card border border-border/50 rounded-xl p-6">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-6">
                <Button variant="outline" size="sm" onClick={prevMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h2 className="text-xl font-semibold text-foreground">
                  {MONTH_NAMES[month]} {year}
                </h2>
                <Button variant="outline" size="sm" onClick={nextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before the 1st */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const events = filingsByDate[dateStr] || [];
                  const isToday =
                    day === now.getDate() &&
                    month === now.getMonth() &&
                    year === now.getFullYear();
                  const isSelected = selectedDate === dateStr;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`aspect-square rounded-lg p-1 flex flex-col items-center justify-start text-sm transition-all ${
                        isSelected
                          ? "bg-primary/20 border-2 border-primary"
                          : isToday
                          ? "bg-primary/10 border border-primary/30"
                          : events.length > 0
                          ? "bg-secondary/50 hover:bg-secondary border border-border/30"
                          : "hover:bg-secondary/30 border border-transparent"
                      }`}
                    >
                      <span className={`text-xs font-medium ${isToday ? "text-primary" : "text-foreground"}`}>
                        {day}
                      </span>
                      {events.length > 0 && (
                        <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                          {events.slice(0, 3).map((_: any, j: number) => (
                            <div
                              key={j}
                              className="w-1.5 h-1.5 rounded-full bg-primary"
                            />
                          ))}
                          {events.length > 3 && (
                            <span className="text-[9px] text-primary font-medium">+{events.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/30">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-xs text-muted-foreground">S-1 / F-1 Filing</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-xs text-muted-foreground">Amendment</span>
                </div>
              </div>
            </div>

            {/* Selected Day Panel */}
            <div className="bg-card border border-border/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {selectedDate || "Select a date"}
              </h3>

              {!selectedDate ? (
                <p className="text-sm text-muted-foreground">
                  Click on a date in the calendar to see filing events for that day.
                </p>
              ) : selectedFilings.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No filing events on this date.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground mb-2">
                    {selectedFilings.length} {selectedFilings.length === 1 ? "event" : "events"}
                  </p>
                  {selectedFilings.map((item: any, idx: number) => {
                    const sector = getSectorInfo(item.company?.sic, item.company?.sicDescription);
                    const isAmendment = item.filing?.formType?.includes("/A");
                    return (
                      <Link
                        key={idx}
                        href={`/ipo/${item.company?.cik}`}
                        className="block p-3 rounded-lg bg-secondary/30 border border-border/30 hover:border-primary/30 transition-colors no-underline"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${isAmendment ? "bg-amber-500/15 text-amber-400" : "bg-primary/15 text-primary"}`}>
                            {item.filing?.formType}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{sector.sector}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {item.company?.name}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
