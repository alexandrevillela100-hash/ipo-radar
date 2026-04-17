import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Building2,
  FileText,
  TrendingUp,
  Search,
  Loader2,
} from "lucide-react";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  // Debounced search query
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Search companies via tRPC
  const searchQuery = trpc.edgar.search.useQuery(
    { query: debouncedQuery },
    {
      enabled: debouncedQuery.length >= 2,
    }
  );

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const handleSelect = useCallback(
    (cik: string) => {
      setLocation(`/ipo/${cik}`);
      onOpenChange(false);
      setQuery("");
    },
    [setLocation, onOpenChange]
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setQuery("");
  }, [onOpenChange]);

  // Map SIC codes to sector names for grouping
  const getSector = (sicDescription?: string | null) => {
    if (!sicDescription) return "Other";
    const desc = sicDescription.toLowerCase();
    if (desc.includes("software") || desc.includes("computer") || desc.includes("electronic"))
      return "Technology";
    if (desc.includes("pharm") || desc.includes("medical") || desc.includes("health") || desc.includes("bio"))
      return "Healthcare";
    if (desc.includes("bank") || desc.includes("finance") || desc.includes("invest") || desc.includes("insur"))
      return "Financial Services";
    if (desc.includes("energy") || desc.includes("oil") || desc.includes("gas") || desc.includes("petrol"))
      return "Energy";
    if (desc.includes("food") || desc.includes("beverage") || desc.includes("retail"))
      return "Consumer";
    return "Other";
  };

  const results = searchQuery.data || [];
  const isLoading = searchQuery.isLoading && debouncedQuery.length >= 2;

  // Group results by sector
  const grouped = results.reduce(
    (acc, company) => {
      const sector = getSector(company.sicDescription);
      if (!acc[sector]) acc[sector] = [];
      acc[sector].push(company);
      return acc;
    },
    {} as Record<string, typeof results>
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleClose}
      title="Search IPOs"
      description="Search across companies, filings, and sectors"
      showCloseButton={false}
    >
      <CommandInput
        placeholder="Search companies, tickers, sectors..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isLoading && (
          <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Searching...</span>
          </div>
        )}

        {!isLoading && debouncedQuery.length >= 2 && results.length === 0 && (
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-4">
              <Search className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No results found for "{debouncedQuery}"
              </p>
              <p className="text-xs text-muted-foreground/60">
                Try searching by company name, ticker, or industry
              </p>
            </div>
          </CommandEmpty>
        )}

        {!isLoading && debouncedQuery.length < 2 && (
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-4">
              <Search className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Type at least 2 characters to search
              </p>
              <p className="text-xs text-muted-foreground/60">
                Search by company name, ticker symbol, CIK, or industry
              </p>
            </div>
          </CommandEmpty>
        )}

        {!isLoading &&
          Object.entries(grouped).map(([sector, companies]) => (
            <CommandGroup key={sector} heading={sector}>
              {companies.map((company) => (
                <CommandItem
                  key={company.cik}
                  value={`${company.name} ${company.ticker || ""} ${company.cik}`}
                  onSelect={() => handleSelect(company.cik)}
                  className="cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {company.name}
                      </span>
                      {company.ticker && (
                        <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          {company.ticker}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>CIK: {company.cik}</span>
                      {company.sicDescription && (
                        <>
                          <span>·</span>
                          <span className="truncate">
                            {company.sicDescription}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <FileText className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

        {/* Quick links when no query */}
        {debouncedQuery.length < 2 && (
          <CommandGroup heading="Quick Links">
            <CommandItem
              onSelect={() => {
                setLocation("/ipos");
                handleClose();
              }}
              className="cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>Browse All IPOs</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setLocation("/calendar");
                handleClose();
              }}
              className="cursor-pointer"
            >
              <FileText className="w-4 h-4 text-primary" />
              <span>IPO Calendar</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setLocation("/sectors");
                handleClose();
              }}
              className="cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-primary" />
              <span>Sectors Overview</span>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>

      <div className="border-t border-border/50 px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono">
            ↑↓
          </kbd>{" "}
          Navigate{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono ml-1">
            ↵
          </kbd>{" "}
          Select{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono ml-1">
            esc
          </kbd>{" "}
          Close
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono">
            ⌘K
          </kbd>
        </span>
      </div>
    </CommandDialog>
  );
}
