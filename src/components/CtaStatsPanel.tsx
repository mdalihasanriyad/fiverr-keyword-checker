import { useEffect, useMemo, useState } from "react";
import { BarChart3, MousePointerClick, LogIn, Pause, Play, Palette } from "lucide-react";
import {
  readCtaStatsInRange,
  type CtaRange,
  type CtaStats,
} from "@/lib/ctaTracking";
import { MODE_LABEL } from "@/lib/modes";
import { cn } from "@/lib/utils";

// Friendly label for each known CTA source. Falls back to the raw key.
const SOURCE_LABEL: Record<string, string> = {
  "forbidden-words": MODE_LABEL["forbidden-words"],
  compliance: MODE_LABEL.compliance,
  "gig-seo": MODE_LABEL["gig-seo"],
};

const RANGES: { value: CtaRange; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "all", label: "All" },
];

const RANGE_DESCRIPTION: Record<CtaRange, string> = {
  "24h": "last 24 hours",
  "7d": "last 7 days",
  "30d": "last 30 days",
  all: "all time",
};

const RANGE_MS: Record<Exclude<CtaRange, "all">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const CUTOFF_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const formatCutoff = (range: CtaRange) => {
  if (range === "all") return "From the beginning of recorded activity";
  const cutoff = new Date(Date.now() - RANGE_MS[range]);
  return `From ${CUTOFF_FORMATTER.format(cutoff)}`;
};

const formatRelative = (iso?: string) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "—";
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  return `${d}d ago`;
};

const THEME_KEY = "cta-stats:theme-v1";
type PanelTheme = "neon" | "neutral";

const CtaStatsPanel = () => {
  const [range, setRange] = useState<CtaRange>("7d");
  const [stats, setStats] = useState<CtaStats>(() => readCtaStatsInRange("7d"));
  const [paused, setPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState<string | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState(0);
  const [theme, setTheme] = useState<PanelTheme>(() => {
    if (typeof window === "undefined") return "neon";
    return (localStorage.getItem(THEME_KEY) as PanelTheme) || "neon";
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const isNeon = theme === "neon";
  const t = {
    section: isNeon
      ? "border-[hsl(var(--panel-border)/0.5)] bg-card/60 shadow-[0_0_0_1px_hsl(var(--neon)/0.08),0_8px_30px_-12px_hsl(var(--neon)/0.25)]"
      : "border-border bg-background/40",
    icon: isNeon ? "text-neon" : "text-foreground",
    title: isNeon ? "text-neon" : "text-foreground",
    rangeWrap: isNeon
      ? "border-[hsl(var(--panel-border)/0.6)] bg-background/60"
      : "border-border bg-background/60",
    rangeActive: isNeon
      ? "bg-[hsl(var(--neon)/0.18)] text-neon shadow-[inset_0_0_0_1px_hsl(var(--neon)/0.5)]"
      : "bg-muted text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))]",
    pausedBtn: isNeon
      ? "border-[hsl(var(--neon)/0.6)] bg-[hsl(var(--neon)/0.12)] text-neon hover:bg-[hsl(var(--neon)/0.2)]"
      : "border-border bg-muted text-foreground hover:bg-muted/80",
    headDivider: isNeon
      ? "border-[hsl(var(--panel-border)/0.5)]"
      : "border-border",
    rowDivider: isNeon
      ? "border-[hsl(var(--panel-border)/0.25)]"
      : "border-border/60",
    rowHover: isNeon
      ? "hover:bg-[hsl(var(--neon)/0.04)]"
      : "hover:bg-muted/50",
    metric: isNeon ? "text-neon" : "text-foreground",
  };


  useEffect(() => {
    // Always refresh on range change so the table reflects the new filter,
    // even when paused (the user explicitly asked for a different view).
    setStats(readCtaStatsInRange(range));
    setPendingUpdates(0);
  }, [range]);

  useEffect(() => {
    if (paused) {
      // While paused, just count incoming events so the user knows new
      // activity happened without disturbing the snapshot they're inspecting.
      const bump = () => setPendingUpdates((n) => n + 1);
      window.addEventListener("cta-click", bump);
      window.addEventListener("storage", bump);
      return () => {
        window.removeEventListener("cta-click", bump);
        window.removeEventListener("storage", bump);
      };
    }

    const refresh = () => setStats(readCtaStatsInRange(range));
    window.addEventListener("cta-click", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("cta-click", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [range, paused]);

  const togglePaused = () => {
    setPaused((prev) => {
      const next = !prev;
      if (next) {
        setPausedAt(new Date().toISOString());
      } else {
        // Resuming: refresh immediately and clear the pending counter.
        setStats(readCtaStatsInRange(range));
        setPendingUpdates(0);
        setPausedAt(null);
      }
      return next;
    });
  };

  const entries = useMemo(
    () =>
      Object.entries(stats).sort(
        (a, b) => b[1].clicks + b[1].arrivals - (a[1].clicks + a[1].arrivals),
      ),
    [stats],
  );

  const totalClicks = entries.reduce((sum, [, v]) => sum + v.clicks, 0);
  const totalArrivals = entries.reduce((sum, [, v]) => sum + v.arrivals, 0);

  return (
    <section
      aria-label="Landing CTA performance"
      className={cn("mt-6 rounded-lg border p-4 sm:p-5", t.section)}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className={cn("h-4 w-4", t.icon)} aria-hidden />
          <h2 className={cn("text-sm font-semibold tracking-tight", t.title)}>
            Landing CTA performance
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div
            role="radiogroup"
            aria-label="Time range"
            className={cn("inline-flex items-center rounded-md border p-0.5", t.rangeWrap)}
          >
            {RANGES.map((r) => {
              const active = r.value === range;
              return (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setRange(r.value)}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-sm transition-colors",
                    active
                      ? t.rangeActive
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={togglePaused}
            aria-pressed={paused}
            title={paused ? "Resume live updates" : "Pause live updates"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
              paused
                ? t.pausedBtn
                : cn(t.rangeWrap, "text-muted-foreground hover:text-foreground"),
            )}
          >
            {paused ? (
              <>
                <Play className="h-3.5 w-3.5" aria-hidden />
                <span>
                  Resume{pendingUpdates > 0 ? ` (${pendingUpdates})` : ""}
                </span>
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5" aria-hidden />
                <span>Pause</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTheme(isNeon ? "neutral" : "neon")}
            aria-pressed={!isNeon}
            title={isNeon ? "Switch to neutral theme" : "Switch to neon theme"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
              t.rangeWrap,
              "text-muted-foreground hover:text-foreground",
            )}
          >
            <Palette className="h-3.5 w-3.5" aria-hidden />
            <span>{isNeon ? "Neutral" : "Neon"}</span>
          </button>
          <div className="text-xs text-muted-foreground">
            {totalClicks} clicks · {totalArrivals} arrivals
          </div>
        </div>
      </header>

      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No CTA activity in the {RANGE_DESCRIPTION[range]}. Clicks from the
          landing pages will appear here.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-[hsl(var(--panel-border)/0.5)]">
                <th className="py-2 pr-3 font-medium">Source</th>
                <th className="py-2 px-3 font-medium">
                  <span className="inline-flex items-center gap-1">
                    <MousePointerClick className="h-3.5 w-3.5" aria-hidden /> Clicks
                  </span>
                </th>
                <th className="py-2 px-3 font-medium">
                  <span className="inline-flex items-center gap-1">
                    <LogIn className="h-3.5 w-3.5" aria-hidden /> Arrivals
                  </span>
                </th>
                <th className="py-2 pl-3 font-medium">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([source, v]) => {
                const last =
                  v.lastArrivalAt && v.lastClickAt
                    ? new Date(v.lastArrivalAt) > new Date(v.lastClickAt)
                      ? v.lastArrivalAt
                      : v.lastClickAt
                    : v.lastArrivalAt ?? v.lastClickAt;
                return (
                  <tr
                    key={source}
                    className="border-b border-[hsl(var(--panel-border)/0.25)] last:border-0 hover:bg-[hsl(var(--neon)/0.04)] transition-colors"
                  >
                    <td className="py-2 pr-3 font-medium">
                      {SOURCE_LABEL[source] ?? source}
                    </td>
                    <td className="py-2 px-3 tabular-nums text-neon">{v.clicks}</td>
                    <td className="py-2 px-3 tabular-nums text-neon">{v.arrivals}</td>
                    <td className="py-2 pl-3 text-muted-foreground">
                      {formatRelative(last)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <p aria-live="polite">{formatCutoff(range)}</p>
        {paused && pausedAt && (
          <p className="text-primary" aria-live="polite">
            Paused at {CUTOFF_FORMATTER.format(new Date(pausedAt))}
            {pendingUpdates > 0
              ? ` · ${pendingUpdates} new event${pendingUpdates === 1 ? "" : "s"} waiting`
              : ""}
          </p>
        )}
      </div>
    </section>
  );
};

export default CtaStatsPanel;
