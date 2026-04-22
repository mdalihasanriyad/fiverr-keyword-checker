import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Copy, Trash2, Pencil, Sparkles, CheckCircle2, ShieldAlert, Settings } from "lucide-react";
import KeywordEditor, { type KeywordMap } from "@/components/KeywordEditor";
import { hyphenateWith, HYPHEN_STYLE_KEY, type HyphenStyle } from "@/lib/hyphenate";

const STORAGE_KEY = "keyword-guard:keywords-v2";

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
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea: grows with content, capped at responsive max height.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const resize = () => {
      el.style.height = "auto";
      const isMobile = window.matchMedia("(max-width: 639px)").matches;
      const isTablet = window.matchMedia("(max-width: 1023px)").matches;
      const max = isMobile ? 260 : isTablet ? 360 : 460;
      const min = isMobile ? 140 : 200;
      el.style.height = Math.max(min, Math.min(el.scrollHeight, max)) + "px";
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
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

  const keywordList = useMemo(() => Object.keys(keywords), [keywords]);

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
    setText(out);
  };

  const copy = (val: string) => navigator.clipboard.writeText(val);
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
            Keyword <span className="text-neon">Guard</span>
          </h1>
          <p className="text-muted-foreground/80 text-[hsl(var(--foreground))/0.6]">
            Check if your Fiverr content contains any forbidden keywords
          </p>
        </div>

        {/* Main grid */}
        <div className="mt-8 sm:mt-10 grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Input */}
          <div className="panel glow-neon p-3 sm:p-4 relative flex flex-col gap-3">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your Fiverr message here..."
              rows={5}
              className="w-full min-h-[140px] sm:min-h-[200px] resize-none bg-transparent outline-none text-base leading-relaxed placeholder:text-[hsl(var(--foreground))/0.3] custom-scroll overflow-y-auto"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => copy(text)}
                className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--panel-border))] bg-[hsl(var(--background))/0.6] px-3 py-1.5 text-sm hover:bg-[hsl(var(--neon))/0.08] transition"
              >
                <Copy className="h-4 w-4" /> Copy
              </button>
              <button
                onClick={() => setText("")}
                className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--panel-border))] bg-[hsl(var(--background))/0.6] px-3 py-1.5 text-sm hover:bg-[hsl(var(--danger))/0.15] transition"
              >
                <Trash2 className="h-4 w-4" /> Clear
              </button>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">
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
              Forbidden Keywords ({keywordList.length})
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
