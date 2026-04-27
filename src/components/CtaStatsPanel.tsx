import { useEffect, useState } from "react";
import { BarChart3, MousePointerClick, LogIn } from "lucide-react";
import { readCtaStats, type CtaStats } from "@/lib/ctaTracking";
import { MODE_LABEL } from "@/lib/modes";

// Friendly label for each known CTA source. Falls back to the raw key.
const SOURCE_LABEL: Record<string, string> = {
  "forbidden-words": MODE_LABEL["forbidden-words"],
  compliance: MODE_LABEL.compliance,
  "gig-seo": MODE_LABEL["gig-seo"],
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

const CtaStatsPanel = () => {
  const [stats, setStats] = useState<CtaStats>(() => readCtaStats());

  useEffect(() => {
    const refresh = () => setStats(readCtaStats());
    refresh();
    window.addEventListener("cta-click", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("cta-click", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const entries = Object.entries(stats).sort(
    (a, b) => (b[1].clicks + b[1].arrivals) - (a[1].clicks + a[1].arrivals),
  );

  const totalClicks = entries.reduce((sum, [, v]) => sum + v.clicks, 0);
  const totalArrivals = entries.reduce((sum, [, v]) => sum + v.arrivals, 0);

  return (
    <section
      aria-label="Landing CTA performance"
      className="mt-6 rounded-lg border border-[hsl(var(--panel-border))/0.5] bg-card/40 p-4 sm:p-5"
    >
      <header className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-neon" aria-hidden />
          <h2 className="text-sm font-semibold tracking-tight">Landing CTA performance</h2>
        </div>
        <div className="text-xs text-muted-foreground">
          {totalClicks} clicks · {totalArrivals} arrivals
        </div>
      </header>

      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No CTA activity yet. Clicks from the landing pages will appear here.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-[hsl(var(--panel-border))/0.4]">
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
                  <tr key={source} className="border-b border-[hsl(var(--panel-border))/0.2] last:border-0">
                    <td className="py-2 pr-3 font-medium">
                      {SOURCE_LABEL[source] ?? source}
                    </td>
                    <td className="py-2 px-3 tabular-nums">{v.clicks}</td>
                    <td className="py-2 px-3 tabular-nums">{v.arrivals}</td>
                    <td className="py-2 pl-3 text-muted-foreground">{formatRelative(last)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default CtaStatsPanel;
