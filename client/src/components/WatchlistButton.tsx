import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface WatchlistButtonProps {
  cik: string;
  companyName: string;
  size?: "sm" | "default" | "lg";
}

export default function WatchlistButton({
  cik,
  companyName,
  size = "sm",
}: WatchlistButtonProps) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Check if this company is in the user's watchlist
  const watchlistQuery = trpc.watchlist.list.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const isInWatchlist =
    watchlistQuery.data?.some((item) => item.company.cik === cik) ?? false;

  const addMutation = trpc.watchlist.add.useMutation({
    onSuccess: (data) => {
      if (data.added) {
        toast.success(`${companyName} added to watchlist`);
      } else {
        toast.info(`${companyName} is already in your watchlist`);
      }
      utils.watchlist.list.invalidate();
    },
    onError: () => {
      toast.error("Failed to add to watchlist");
    },
  });

  const removeMutation = trpc.watchlist.remove.useMutation({
    onSuccess: () => {
      toast.success(`${companyName} removed from watchlist`);
      utils.watchlist.list.invalidate();
    },
    onError: () => {
      toast.error("Failed to remove from watchlist");
    },
  });

  const isPending = addMutation.isPending || removeMutation.isPending;

  const handleClick = () => {
    if (!isAuthenticated) {
      toast("Please log in to use watchlist", {
        description: "Create a free account to track IPOs.",
        action: {
          label: "Sign Up",
          onClick: () => setLocation("/auth"),
        },
      });
      return;
    }

    if (isInWatchlist) {
      removeMutation.mutate({ companyCik: cik });
    } else {
      addMutation.mutate({ companyCik: cik });
    }
  };

  return (
    <Button
      variant={isInWatchlist ? "default" : "outline"}
      size={size}
      className={`gap-2 ${
        isInWatchlist
          ? "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30"
          : "border-border/60 text-muted-foreground hover:text-amber-400 hover:border-amber-500/30"
      }`}
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Star
          className={`w-4 h-4 ${isInWatchlist ? "fill-amber-400" : ""}`}
        />
      )}
      {isInWatchlist ? "Watching" : "Watch"}
    </Button>
  );
}
