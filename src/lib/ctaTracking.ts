// Lightweight client-side CTA click tracking.
//
// Each landing page has a unique CTA "source" id (e.g. "forbidden-words",
// "compliance", "gig-seo"). When a user clicks the CTA we increment a
// per-source counter in localStorage and notify any listeners via a
// CustomEvent on `window` so the app (or future analytics) can react.
//
// We intentionally avoid a backend: this gives the user / owner a quick
// view of which landing page CTAs perform best without adding deps.
//
// In addition to running totals (v1 key), we now also append every event
// to a capped event log (v2 key) so the panel can filter by time range
// (24h / 7d / 30d / all).

const STORAGE_KEY = "keyword-guard:cta-stats-v1";
const EVENTS_KEY = "keyword-guard:cta-events-v1";
const MAX_EVENTS = 1000; // keep storage bounded

export type CtaSource = "forbidden-words" | "compliance" | "gig-seo";

export type CtaStats = Record<
  string,
  { clicks: number; arrivals: number; lastClickAt?: string; lastArrivalAt?: string }
>;

export type CtaEventType = "click" | "arrival";

export type CtaEvent = {
  type: CtaEventType;
  source: string;
  at: string; // ISO timestamp
};

export type CtaRange = "24h" | "7d" | "30d" | "all";

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

const safeReadEvents = (): CtaEvent[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CtaEvent[]) : [];
  } catch {
    return [];
  }
};

const safeWriteEvents = (events: CtaEvent[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  } catch {
    /* ignore quota errors */
  }
};

const appendEvent = (type: CtaEventType, source: string, at: string) => {
  const events = safeReadEvents();
  events.push({ type, source, at });
  // Trim oldest if we exceed the cap.
  const trimmed = events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events;
  safeWriteEvents(trimmed);
};

const emit = (type: CtaEventType, source: string, stats: CtaStats) => {
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
  const at = new Date().toISOString();
  entry.lastClickAt = at;
  stats[source] = entry;
  safeWrite(stats);
  appendEvent("click", source, at);
  emit("click", source, stats);
  return entry;
};

/** Record a CTA arrival on the destination (after navigation). */
export const recordCtaArrival = (source: string | null | undefined) => {
  if (!source) return;
  const stats = safeRead();
  const entry = stats[source] ?? { clicks: 0, arrivals: 0 };
  entry.arrivals += 1;
  const at = new Date().toISOString();
  entry.lastArrivalAt = at;
  stats[source] = entry;
  safeWrite(stats);
  appendEvent("arrival", source, at);
  emit("arrival", source, stats);
};

export const readCtaStats = (): CtaStats => safeRead();

export const readCtaEvents = (): CtaEvent[] => safeReadEvents();

const RANGE_MS: Record<Exclude<CtaRange, "all">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

/**
 * Aggregate event log into per-source CtaStats, filtered by time range.
 * For "all", falls back to the running totals so historical data
 * (recorded before the event log existed) is still represented.
 */
export const readCtaStatsInRange = (range: CtaRange): CtaStats => {
  if (range === "all") {
    // Prefer totals (which include pre-event-log history). If there are
    // no totals but we do have events, derive from events instead.
    const totals = safeRead();
    if (Object.keys(totals).length > 0) return totals;
  }

  const events = safeReadEvents();
  const cutoff = range === "all" ? 0 : Date.now() - RANGE_MS[range];
  const out: CtaStats = {};

  for (const ev of events) {
    const t = new Date(ev.at).getTime();
    if (Number.isNaN(t) || t < cutoff) continue;
    const entry = out[ev.source] ?? { clicks: 0, arrivals: 0 };
    if (ev.type === "click") {
      entry.clicks += 1;
      if (!entry.lastClickAt || ev.at > entry.lastClickAt) entry.lastClickAt = ev.at;
    } else {
      entry.arrivals += 1;
      if (!entry.lastArrivalAt || ev.at > entry.lastArrivalAt) entry.lastArrivalAt = ev.at;
    }
    out[ev.source] = entry;
  }

  return out;
};
