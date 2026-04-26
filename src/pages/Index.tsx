import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, Copy, Trash2, Pencil, Sparkles, CheckCircle2, ShieldAlert, Settings, RefreshCw, Filter, X, Play } from "lucide-react";
import { toast } from "sonner";
import KeywordEditor, { type KeywordMap } from "@/components/KeywordEditor";
import { useSeo } from "@/lib/seo";
import { type CheckerMode, MODE_KEYWORDS, MODE_LABEL, MODE_DESCRIPTION, isCheckerMode } from "@/lib/modes";

import { hyphenateWith, HYPHEN_STYLE_KEY, type HyphenStyle } from "@/lib/hyphenate";

const STORAGE_KEY = "keyword-guard:keywords-v2";
const TEXT_KEY = "keyword-guard:text-v1";
const TEXTAREA_STATE_KEY = "keyword-guard:textarea-state-v1";
const AUTO_RUN_KEY = "keyword-guard:auto-run-v1";

// Default: empty string means "auto-hyphenate" (e.g. mail -> ma-il, pay -> pa-y).
// You can still set a custom replacement per keyword if you want one.
const DEFAULT_KEYWORDS: KeywordMap = {
  crypto: "", payment: "", instagram: "", linkedin: "",
  facebook: "", negative: "", star: "", transferwise: "",
  account: "", bank: "", messenger: "", skype: "",
  card: "", credit: "", purchase: "", whatsapp: "",
  password: "", inbox: "", sms: "", transaction: "",
  stripe: "", paypal: "", rating: "", rate: "",
  review: "", euro: "", dollar: "", money: "", pay: "",
  outside: "", contact: "", email: "", gmail: "",
  mail: "", "@": "(at)",
};

// Hyphenation helpers live in src/lib/hyphenate.ts.

// Preserve the original casing of `match` when applying `replacement`.
const matchCase = (match: string, replacement: string) => {
  if (match.toUpperCase() === match) return replacement.toUpperCase();
  if (match[0] === match[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
};

const Index = () => {
  useSeo({
    title: "Free Fiverr Keyword Checker Tool (Forbidden Keyword Detector)",
    description:
      "Free Fiverr Keyword Checker: instantly detect forbidden words, avoid bans, and boost gig SEO to rank higher and win more orders.",
    canonical: "https://fiverr-keyword-checker.lovable.app/",
  });

  const [text, setText] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(TEXT_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);

  // Helper: compute capped height based on viewport.
  const computeHeight = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    const isMobile = window.matchMedia("(max-width: 639px)").matches;
    const isTablet = window.matchMedia("(max-width: 1023px)").matches;
    const max = isMobile ? 260 : isTablet ? 360 : 460;
    const min = isMobile ? 140 : 200;
    return Math.max(min, Math.min(el.scrollHeight, max));
  };

  // Auto-resize textarea: grows with content, capped at responsive max height.
  // Debounced via requestAnimationFrame so it stays smooth on large inputs.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    let frame = 0;
    let saveTimer: ReturnType<typeof setTimeout> | undefined;

    const resize = () => {
      const h = computeHeight(el);
      el.style.height = h + "px";
      // Persist height + scroll (debounced).
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        try {
          localStorage.setItem(
            TEXTAREA_STATE_KEY,
            JSON.stringify({ height: h, scrollTop: el.scrollTop }),
          );
        } catch {}
      }, 200);
    };
    const scheduleResize = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(resize);
    };
    const saveScroll = () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        try {
          const raw = localStorage.getItem(TEXTAREA_STATE_KEY);
          const prev = raw ? JSON.parse(raw) : {};
          localStorage.setItem(
            TEXTAREA_STATE_KEY,
            JSON.stringify({ ...prev, scrollTop: el.scrollTop }),
          );
        } catch {}
      }, 150);
    };

    // Restore previous height + scroll on first mount.
    if (!restoredRef.current) {
      restoredRef.current = true;
      try {
        const raw = localStorage.getItem(TEXTAREA_STATE_KEY);
        if (raw) {
          const { height, scrollTop } = JSON.parse(raw) as {
            height?: number;
            scrollTop?: number;
          };
          if (typeof height === "number") el.style.height = height + "px";
          requestAnimationFrame(() => {
            if (typeof scrollTop === "number") el.scrollTop = scrollTop;
          });
        } else {
          scheduleResize();
        }
      } catch {
        scheduleResize();
      }
    }

    el.addEventListener("input", scheduleResize);
    el.addEventListener("scroll", saveScroll);
    window.addEventListener("resize", scheduleResize);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (saveTimer) clearTimeout(saveTimer);
      el.removeEventListener("input", scheduleResize);
      el.removeEventListener("scroll", saveScroll);
      window.removeEventListener("resize", scheduleResize);
    };
  }, []);

  // Re-measure when text is set programmatically (Clear, Rewrite, etc.)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.style.height = computeHeight(el) + "px";
    });
    return () => cancelAnimationFrame(id);
  }, [text]);

  // Persist the text itself.
  useEffect(() => {
    try {
      localStorage.setItem(TEXT_KEY, text);
    } catch {}
  }, [text]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [hyphenStyle, setHyphenStyle] = useState<HyphenStyle>(() => {
    if (typeof window === "undefined") return "after-second";
    try {
      const raw = localStorage.getItem(HYPHEN_STYLE_KEY);
      if (raw === "after-second" || raw === "middle" || raw === "after-first-vowel") return raw;
    } catch {}
    return "after-second";
  });
  const [keywords, setKeywords] = useState<KeywordMap>(() => {
    if (typeof window === "undefined") return DEFAULT_KEYWORDS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as KeywordMap;
    } catch {}
    return DEFAULT_KEYWORDS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keywords));
    } catch {}
  }, [keywords]);

  useEffect(() => {
    try {
      localStorage.setItem(HYPHEN_STYLE_KEY, hyphenStyle);
    } catch {}
  }, [hyphenStyle]);


  // Mode is driven by ?mode= query param so landing page CTAs can preselect a focus.
  const [searchParams, setSearchParams] = useSearchParams();
  const modeParam = searchParams.get("mode");
  const mode: CheckerMode = isCheckerMode(modeParam) ? modeParam : "all";

  const setMode = (next: CheckerMode) => {
    const params = new URLSearchParams(searchParams);
    if (next === "all") params.delete("mode");
    else params.set("mode", next);
    setSearchParams(params, { replace: true });
  };

  const allKeywordList = useMemo(() => Object.keys(keywords), [keywords]);

  // When a focused mode is active, restrict detection to that subset (intersected
  // with the user's current keyword map so removed keywords don't reappear).
  const keywordList = useMemo(() => {
    if (mode === "all") return allKeywordList;
    const allowed = new Set(MODE_KEYWORDS[mode]);
    const filtered = allKeywordList.filter((k) => allowed.has(k.toLowerCase()));
    return filtered.length > 0 ? filtered : allKeywordList;
  }, [mode, allKeywordList]);

  // Toast once when arriving from a landing page CTA so the user knows mode is active.
  const announcedModeRef = useRef<CheckerMode | null>(null);
  useEffect(() => {
    if (mode === "all") {
      announcedModeRef.current = "all";
      return;
    }
    if (announcedModeRef.current === mode) return;
    announcedModeRef.current = mode;
    toast.success(`${MODE_LABEL[mode]} mode active`, {
      description: MODE_DESCRIPTION[mode],
    });
  }, [mode]);

  const detected = useMemo(() => {
    const found: { keyword: string; index: number; length: number }[] = [];
    if (!text) return found;
    keywordList.forEach((kw) => {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = /^[a-z0-9]/i.test(kw)
        ? new RegExp(`\\b${escaped}\\b`, "gi")
        : new RegExp(escaped, "gi");
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(text)) !== null) {
        found.push({ keyword: kw, index: m.index, length: m[0].length });
      }
    });
    return found.sort((a, b) => a.index - b.index);
  }, [text, keywordList]);

  const uniqueDetected = useMemo(
    () => Array.from(new Set(detected.map((d) => d.keyword.toLowerCase()))),
    [detected],
  );

  const highlighted = useMemo(() => {
    if (detected.length === 0) return [{ type: "text" as const, value: text }];
    const parts: { type: "text" | "hit"; value: string }[] = [];
    let cursor = 0;
    // dedupe overlapping
    const sorted = [...detected].sort((a, b) => a.index - b.index);
    const cleaned: typeof sorted = [];
    sorted.forEach((d) => {
      const last = cleaned[cleaned.length - 1];
      if (!last || d.index >= last.index + last.length) cleaned.push(d);
    });
    cleaned.forEach((d) => {
      if (d.index > cursor) parts.push({ type: "text", value: text.slice(cursor, d.index) });
      parts.push({ type: "hit", value: text.slice(d.index, d.index + d.length) });
      cursor = d.index + d.length;
    });
    if (cursor < text.length) parts.push({ type: "text", value: text.slice(cursor) });
    return parts;
  }, [text, detected]);

  const rewrite = () => {
    if (detected.length === 0) {
      toast.info("Nothing to rewrite", {
        description: "No forbidden keywords found in your text.",
      });
      return;
    }
    let out = text;
    keywordList.forEach((kw) => {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = /^[a-z0-9]/i.test(kw)
        ? new RegExp(`\\b${escaped}\\b`, "gi")
        : new RegExp(escaped, "gi");
      const custom = (keywords[kw] ?? "").trim();
      out = out.replace(pattern, (match) =>
        custom ? matchCase(match, custom) : hyphenateWith(match, hyphenStyle),
      );
    });
    const count = detected.length;
    const uniqueCount = uniqueDetected.length;
    setText(out);
    toast.success(`Rewrote ${count} keyword${count > 1 ? "s" : ""}`, {
      description: `${uniqueCount} unique keyword${uniqueCount > 1 ? "s" : ""} replaced across your text.`,
    });
  };

  const copy = async (val: string) => {
    if (!val) {
      toast.error("Nothing to copy", {
        description: "Your text is empty.",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(val);
      const chars = val.length;
      const words = val.trim().split(/\s+/).filter(Boolean).length;
      toast.success("Copied to clipboard", {
        description: `${chars} character${chars !== 1 ? "s" : ""} · ${words} word${words !== 1 ? "s" : ""} copied.`,
      });
    } catch {
      toast.error("Copy failed", {
        description: "Clipboard access was blocked by your browser.",
      });
    }
  };

  const clearText = () => {
    if (!text) {
      toast.info("Nothing to clear", {
        description: "The editor is already empty.",
      });
      return;
    }
    const count = detected.length;
    setText("");
    toast.success("Text cleared", {
      description: count > 0
        ? `Removed your text along with ${count} flagged keyword${count > 1 ? "s" : ""}.`
        : "Your editor is now empty.",
    });
  };

  const resetEditor = () => {
    try {
      localStorage.removeItem(TEXT_KEY);
      localStorage.removeItem(TEXTAREA_STATE_KEY);
    } catch {}
    setText("");
    const el = textareaRef.current;
    if (el) {
      el.style.height = "";
      el.scrollTop = 0;
    }
    toast.success("Editor reset", {
      description: "Text, height, and scroll position restored to defaults.",
    });
  };

  // Triggered by the "Run this mode" button in the mode switcher.
  // If the editor is empty, focus it so the user can paste. Otherwise scroll
  // the results into view and surface a quick summary based on the active mode.
  const runMode = () => {
    const label = MODE_LABEL[mode];
    if (!text.trim()) {
      textareaRef.current?.focus();
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.info(`${label} ready`, {
        description: "Paste your Fiverr text above to scan it now.",
      });
      return;
    }
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (detected.length === 0) {
      toast.success(`${label}: all clear`, {
        description: "No flagged keywords found in your text for this mode.",
      });
    } else {
      const u = uniqueDetected.length;
      toast.warning(`${label}: ${detected.length} hit${detected.length > 1 ? "s" : ""}`, {
        description: `${u} unique keyword${u > 1 ? "s" : ""} flagged. Review the results below.`,
      });
    }
  };

  const violations = detected.length;
  const clean = violations === 0;

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--neon))/0.5] bg-[hsl(var(--neon))/0.08] px-4 py-1.5 text-sm text-neon">
            <ShieldAlert className="h-4 w-4" />
            Fiverr Compliance Tool
          </span>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight">
            Fiverr Keyword <span className="text-neon">Checker</span>
          </h1>
          <p className="text-muted-foreground/80 text-[hsl(var(--foreground))/0.6]">
            Check if your Fiverr content contains any forbidden keywords
          </p>
          <nav aria-label="Related tools" className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Link to="/forbidden-words" className="rounded-full border border-[hsl(var(--panel-border))/0.6] bg-[hsl(var(--background))/0.6] px-3 py-1 text-xs sm:text-sm text-[hsl(var(--foreground))/0.75] hover:border-[hsl(var(--neon))/0.5] hover:text-neon transition">
              Forbidden Words
            </Link>
            <Link to="/compliance" className="rounded-full border border-[hsl(var(--panel-border))/0.6] bg-[hsl(var(--background))/0.6] px-3 py-1 text-xs sm:text-sm text-[hsl(var(--foreground))/0.75] hover:border-[hsl(var(--neon))/0.5] hover:text-neon transition">
              Compliance
            </Link>
            <Link to="/gig-seo" className="rounded-full border border-[hsl(var(--panel-border))/0.6] bg-[hsl(var(--background))/0.6] px-3 py-1 text-xs sm:text-sm text-[hsl(var(--foreground))/0.75] hover:border-[hsl(var(--neon))/0.5] hover:text-neon transition">
              Gig SEO
            </Link>
          </nav>
        </div>

        {/* Mode switcher: preselected by landing page CTAs (?mode=). */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-[hsl(var(--foreground))/0.55]">
            <Filter className="h-3.5 w-3.5" /> Mode:
          </span>
          {(["all", "forbidden-words", "compliance", "gig-seo"] as const).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={active}
                className={
                  active
                    ? "rounded-full bg-[hsl(var(--neon))] text-black px-3 py-1 text-xs sm:text-sm font-semibold shadow-[0_0_18px_hsl(var(--neon)/0.45)]"
                    : "rounded-full border border-[hsl(var(--panel-border))/0.6] bg-[hsl(var(--background))/0.6] px-3 py-1 text-xs sm:text-sm text-[hsl(var(--foreground))/0.75] hover:border-[hsl(var(--neon))/0.5] hover:text-neon transition"
                }
              >
                {MODE_LABEL[m]}
              </button>
            );
          })}
          {mode !== "all" && (
            <button
              onClick={() => setMode("all")}
              aria-label="Clear mode filter"
              className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--panel-border))/0.6] bg-[hsl(var(--background))/0.6] px-2.5 py-1 text-xs text-[hsl(var(--foreground))/0.6] hover:text-neon hover:border-[hsl(var(--neon))/0.5] transition"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
          <button
            onClick={runMode}
            aria-label={`Run ${MODE_LABEL[mode]} check now`}
            title="Scan your text using the current mode"
            className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--neon))/0.5] bg-[hsl(var(--neon))/0.12] px-3 py-1 text-xs sm:text-sm font-semibold text-neon hover:bg-[hsl(var(--neon))/0.2] transition shadow-[0_0_14px_hsl(var(--neon)/0.25)]"
          >
            <Play className="h-3.5 w-3.5" /> Run this mode
          </button>
        </div>
        {mode !== "all" && (
          <p className="mt-2 text-center text-xs text-[hsl(var(--foreground))/0.55]">
            {MODE_DESCRIPTION[mode]}
          </p>
        )}

        {/* Main grid */}
        <div className="mt-8 sm:mt-10 grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Input */}
          <div className="panel glow-neon relative flex flex-col overflow-hidden">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your Fiverr message here..."
              rows={5}
              className="w-full flex-1 min-h-[140px] sm:min-h-[200px] resize-none bg-transparent outline-none text-base leading-relaxed placeholder:text-[hsl(var(--foreground))/0.3] custom-scroll overflow-y-auto p-3 sm:p-4"
            />
            <div className="flex flex-wrap justify-end gap-2 border-t border-[hsl(var(--panel-border))] bg-[hsl(var(--background))/0.4] px-3 sm:px-4 py-2">
              <button
                onClick={() => copy(text)}
                className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--panel-border))] bg-[hsl(var(--background))/0.6] px-3 py-1.5 text-sm hover:bg-[hsl(var(--neon))/0.08] transition"
              >
                <Copy className="h-4 w-4" /> Copy
              </button>
              <button
                onClick={clearText}
                className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--panel-border))] bg-[hsl(var(--background))/0.6] px-3 py-1.5 text-sm hover:bg-[hsl(var(--danger))/0.15] transition"
              >
                <Trash2 className="h-4 w-4" /> Clear
              </button>
              <button
                onClick={resetEditor}
                title="Clear text and reset saved height/scroll"
                className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--panel-border))] bg-[hsl(var(--background))/0.6] px-3 py-1.5 text-sm hover:bg-[hsl(var(--neon))/0.08] transition"
              >
                <RefreshCw className="h-4 w-4" /> Reset editor
              </button>
            </div>
          </div>

          {/* Right column */}
          <div ref={resultsRef} className="flex flex-col gap-6 scroll-mt-6">
            {/* Preview */}
            <div className="panel p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold tracking-wider text-neon uppercase">Preview with Highlights</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditorOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--neon))/0.4] bg-[hsl(var(--neon))/0.08] px-2.5 py-1 text-xs text-neon hover:bg-[hsl(var(--neon))/0.15]"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => copy(text)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--neon))/0.4] bg-[hsl(var(--neon))/0.08] px-2.5 py-1 text-xs text-neon hover:bg-[hsl(var(--neon))/0.15]"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy Result
                  </button>
                </div>
              </div>
              <div className="whitespace-pre-wrap leading-relaxed text-[hsl(var(--foreground))/0.95] min-h-[120px]">
                {highlighted.map((p, i) =>
                  p.type === "hit" ? (
                    <span
                      key={i}
                      className="rounded-md bg-[hsl(var(--danger))/0.25] text-[hsl(var(--danger))] px-1.5 py-0.5 mx-0.5 border border-[hsl(var(--danger))/0.5]"
                    >
                      {p.value}
                    </span>
                  ) : (
                    <span key={i}>{p.value}</span>
                  ),
                )}
              </div>
            </div>

            {/* Status */}
            {clean ? (
              <div className="panel p-6 border-[hsl(var(--neon))/0.5] bg-[hsl(var(--neon))/0.06]">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="rounded-full bg-[hsl(var(--neon))/0.15] p-3">
                    <CheckCircle2 className="h-7 w-7 text-neon" />
                  </div>
                  <div className="text-xl font-bold text-neon">All Clear</div>
                  <div className="text-sm text-[hsl(var(--foreground))/0.7]">
                    No forbidden keywords detected. Safe to post!
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-6 border border-[hsl(var(--danger))/0.5] bg-[hsl(var(--danger-bg))]">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="rounded-full bg-[hsl(var(--danger))/0.2] p-3">
                    <AlertTriangle className="h-7 w-7 text-[hsl(var(--danger))]" />
                  </div>
                  <div className="text-xl font-bold text-[hsl(var(--danger))]">
                    {violations} Violation{violations > 1 ? "s" : ""} Found
                  </div>
                  <div className="text-sm text-[hsl(var(--foreground))/0.7]">
                    Found {violations} forbidden keyword{violations > 1 ? "s" : ""} - Remove them before posting!
                  </div>
                </div>
              </div>
            )}

            {/* Detected keywords */}
            {!clean && (
              <div className="panel p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-[hsl(var(--danger))]" />
                  <h3 className="text-sm font-bold tracking-wider text-[hsl(var(--danger))] uppercase">
                    Detected Keywords
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {uniqueDetected.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full bg-[hsl(var(--danger))] text-white px-3 py-1 text-sm font-medium"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
                <div className="flex flex-col gap-1.5 font-mono text-sm">
                  {uniqueDetected.map((kw) => (
                    <div key={kw} className="flex items-center gap-2">
                      <span className="text-[hsl(var(--foreground))/0.6]">{kw}</span>
                      <span className="text-[hsl(var(--foreground))/0.4]">=</span>
                      <span className="rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--panel-border))/0.5] px-2 py-0.5">
                        {(keywords[kw] ?? "").trim() || hyphenateWith(kw, hyphenStyle)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rewrite button */}
        <button
          onClick={rewrite}
          disabled={clean}
          className="mt-6 w-full rounded-xl bg-[hsl(var(--neon))] text-black font-bold py-4 text-base hover:bg-[hsl(var(--neon-glow))] disabled:opacity-40 disabled:cursor-not-allowed transition shadow-[0_0_30px_hsl(var(--neon)/0.4)]"
        >
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Fix & Rewrite Message <Sparkles className="h-5 w-5" />
          </span>
        </button>

        {/* Forbidden keywords list */}
        <div className="panel p-5 mt-6">
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <h3 className="text-sm font-bold tracking-wider text-neon uppercase">
              {mode === "all" ? "Forbidden Keywords" : `${MODE_LABEL[mode]} Keywords`} ({keywordList.length})
            </h3>
            <button
              onClick={() => setEditorOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--neon))/0.4] bg-[hsl(var(--neon))/0.08] px-3 py-1.5 text-xs text-neon hover:bg-[hsl(var(--neon))/0.15]"
            >
              <Settings className="h-3.5 w-3.5" /> Manage Keywords
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {keywordList.map((kw) => {
              const isHit = uniqueDetected.includes(kw.toLowerCase());
              return (
                <span
                  key={kw}
                  className={
                    isHit
                      ? "rounded-full bg-[hsl(var(--danger))] text-white px-3 py-1 text-sm font-medium"
                      : "rounded-full bg-[hsl(var(--background))] border border-[hsl(var(--panel-border))/0.5] text-[hsl(var(--foreground))/0.7] px-3 py-1 text-sm"
                  }
                >
                  {kw}
                </span>
              );
            })}
          </div>
        </div>

        <p className="text-center text-sm text-[hsl(var(--foreground))/0.5] mt-10">
          📌 Always review your content before posting on Fiverr
        </p>

        <footer className="mt-8 border-t border-[hsl(var(--panel-border))/0.5] pt-5 pb-2">
          <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-1 px-4 text-center sm:flex-row sm:gap-2">
            <span className="text-xs sm:text-sm text-[hsl(var(--foreground))/0.55] leading-relaxed">
              Developed by
            </span>
            <span className="text-xs sm:text-sm font-semibold text-neon leading-relaxed break-words">
              Sales CMS Claystone
            </span>
          </div>
        </footer>
      </div>

      <KeywordEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        keywords={keywords}
        onChange={setKeywords}
        onReset={() => setKeywords(DEFAULT_KEYWORDS)}
        hyphenStyle={hyphenStyle}
        onHyphenStyleChange={setHyphenStyle}
      />
    </div>
  );
};

export default Index;
