// Lightweight client-side CTA click tracking.
//
// Each landing page has a unique CTA "source" id (e.g. "forbidden-words",
// "compliance", "gig-seo"). When a user clicks the CTA we increment a
// per-source counter in localStorage and notify any listeners via a
// CustomEvent on `window` so the app (or future analytics) can react.
//
// We intentionally avoid a backend: this gives the user / owner a quick
// view of which landing page CTAs perform best without adding deps.

const STORAGE_KEY = "keyword-guard:cta-stats-v1";

export type CtaSource = "forbidden-words" | "compliance" | "gig-seo";

export type CtaStats = Record<
  string,
  { clicks: number; arrivals: number; lastClickAt?: string; lastArrivalAt?: string }
>;

const safeRead = (): CtaStats => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? (parsed as CtaStats) : {};
  } catch {
    return {};
  }
};

const safeWrite = (stats: CtaStats) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    /* ignore quota errors */
  }
};

const emit = (type: "click" | "arrival", source: string, stats: CtaStats) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("cta-click", { detail: { type, source, stats } }),
  );
};

/** Record a CTA click on a landing page. Returns the updated entry. */
export const trackCtaClick = (source: CtaSource | string) => {
  const stats = safeRead();
  const entry = stats[source] ?? { clicks: 0, arrivals: 0 };
  entry.clicks += 1;
  entry.lastClickAt = new Date().toISOString();
  stats[source] = entry;
  safeWrite(stats);
  emit("click", source, stats);
  return entry;
};

/** Record a CTA arrival on the destination (after navigation). */
export const recordCtaArrival = (source: string | null | undefined) => {
  if (!source) return;
  const stats = safeRead();
  const entry = stats[source] ?? { clicks: 0, arrivals: 0 };
  entry.arrivals += 1;
  entry.lastArrivalAt = new Date().toISOString();
  stats[source] = entry;
  safeWrite(stats);
  emit("arrival", source, stats);
};

export const readCtaStats = (): CtaStats => safeRead();
