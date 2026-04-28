import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Languages, ArrowLeftRight, Copy, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSeo } from "@/lib/seo";
import { recordCtaArrival, trackCtaClick } from "@/lib/ctaTracking";

type Direction = "en-bn" | "bn-en";

const SOURCE_KEY = "translator:source-v1";
const DIR_KEY = "translator:direction-v1";
const AUTO_KEY = "translator:auto-v1";

const DIR_LABEL: Record<Direction, { from: string; to: string; full: string }> = {
  "en-bn": { from: "English", to: "Bangla", full: "English → Bangla" },
  "bn-en": { from: "Bangla", to: "English", full: "Bangla → English" },
};

const Translator = () => {
  useSeo({
    title: "Free English ⇄ Bangla Translator — Instant Bengali Translation",
    description:
      "Translate between English and Bangla (Bengali) instantly. Auto-translate as you type or paste, with one-click copy and language swap.",
    canonical: "https://fiverr-keyword-checker.lovable.app/translator",
    keywords:
      "english to bangla translator, bangla to english translator, bengali translator, free bangla translation, instant bengali translator",
  });

  const [searchParams] = useSearchParams();
  const [source, setSource] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(SOURCE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [direction, setDirection] = useState<Direction>(() => {
    if (typeof window === "undefined") return "en-bn";
    try {
      const v = localStorage.getItem(DIR_KEY);
      return v === "bn-en" ? "bn-en" : "en-bn";
    } catch {
      return "en-bn";
    }
  });
  const [autoTranslate, setAutoTranslate] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const v = localStorage.getItem(AUTO_KEY);
      return v === null ? true : v === "1";
    } catch {
      return true;
    }
  });
  const [translation, setTranslation] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);

  // Track CTA arrivals from landing page.
  useEffect(() => {
    const cta = searchParams.get("cta");
    if (cta) recordCtaArrival(cta);
  }, [searchParams]);

  // Persist inputs.
  useEffect(() => {
    try {
      localStorage.setItem(SOURCE_KEY, source);
    } catch {}
  }, [source]);
  useEffect(() => {
    try {
      localStorage.setItem(DIR_KEY, direction);
    } catch {}
  }, [direction]);
  useEffect(() => {
    try {
      localStorage.setItem(AUTO_KEY, autoTranslate ? "1" : "0");
    } catch {}
  }, [autoTranslate]);

  const runTranslate = async (text: string, dir: Direction) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setTranslation("");
      setError(null);
      return;
    }
    const id = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("translate", {
        body: { text: trimmed, direction: dir },
      });
      if (id !== reqIdRef.current) return; // stale
      if (fnError) {
        const msg =
          (fnError as { message?: string })?.message ?? "Translation failed";
        setError(msg);
        toast.error(msg);
        return;
      }
      if (data?.error) {
        setError(data.error);
        toast.error(data.error);
        return;
      }
      setTranslation((data?.translation ?? "").toString());
    } catch (e) {
      if (id !== reqIdRef.current) return;
      const msg = e instanceof Error ? e.message : "Translation failed";
      setError(msg);
      toast.error(msg);
    } finally {
      if (id === reqIdRef.current) setLoading(false);
    }
  };

  // Auto-translate on edit/paste with debounce.
  useEffect(() => {
    if (!autoTranslate) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runTranslate(source, direction);
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, direction, autoTranslate]);

  const counts = useMemo(
    () => ({
      src: source.length,
      out: translation.length,
    }),
    [source, translation],
  );

  const swap = () => {
    const nextDir: Direction = direction === "en-bn" ? "bn-en" : "en-bn";
    setDirection(nextDir);
    if (translation) {
      setSource(translation);
      setTranslation("");
    }
  };

  const copyOut = async () => {
    if (!translation) return;
    try {
      await navigator.clipboard.writeText(translation);
      toast.success("Translation copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const clearAll = () => {
    setSource("");
    setTranslation("");
    setError(null);
  };

  const dirLabel = DIR_LABEL[direction];

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10 sm:py-14">
      <main className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--neon))/0.5] bg-[hsl(var(--neon))/0.08] px-4 py-1.5 text-sm text-neon">
            <Languages className="h-4 w-4" /> Translator
          </span>
          <Link
            to="/"
            onClick={() => trackCtaClick("translator-home")}
            className="text-sm text-[hsl(var(--foreground))/0.7] hover:text-neon transition"
          >
            ← Back to checker
          </Link>
        </div>

        <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
          English <span className="text-neon">⇄</span> Bangla Translator
        </h1>
        <p className="mt-3 text-[hsl(var(--foreground))/0.75] leading-relaxed">
          Paste or type text and get an instant translation. Auto-translation runs
          shortly after you stop typing.
        </p>

        {/* Controls */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Translation direction"
            className="inline-flex rounded-xl border border-[hsl(var(--panel-border))/0.6] bg-[hsl(var(--panel))] p-1"
          >
            {(["en-bn", "bn-en"] as Direction[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={`px-3 py-1.5 rounded-lg text-sm transition ${
                  direction === d
                    ? "bg-[hsl(var(--neon))] text-black font-semibold"
                    : "text-[hsl(var(--foreground))/0.75] hover:text-neon"
                }`}
              >
                {DIR_LABEL[d].full}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={swap}
            className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--panel-border))/0.6] bg-[hsl(var(--panel))] px-3 py-1.5 text-sm hover:text-neon transition"
            aria-label="Swap direction"
          >
            <ArrowLeftRight className="h-4 w-4" /> Swap
          </button>

          <label className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--panel-border))/0.6] bg-[hsl(var(--panel))] px-3 py-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={autoTranslate}
              onChange={(e) => setAutoTranslate(e.target.checked)}
              className="accent-[hsl(var(--neon))]"
            />
            Auto-translate on edit/paste
          </label>

          {!autoTranslate && (
            <button
              type="button"
              onClick={() => runTranslate(source, direction)}
              disabled={loading || !source.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--neon))] text-black font-bold px-4 py-1.5 text-sm hover:bg-[hsl(var(--neon-glow))] transition disabled:opacity-50"
            >
              Translate
            </button>
          )}

          <button
            type="button"
            onClick={clearAll}
            className="ml-auto inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--panel-border))/0.6] bg-[hsl(var(--panel))] px-3 py-1.5 text-sm hover:text-neon transition"
          >
            <Trash2 className="h-4 w-4" /> Clear
          </button>
        </div>

        {/* Editors */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="panel p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-neon">{dirLabel.from}</h2>
              <span className="text-xs text-[hsl(var(--foreground))/0.6]">
                {counts.src} chars
              </span>
            </div>
            <textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={
                direction === "en-bn"
                  ? "Type or paste English text…"
                  : "এখানে বাংলা লেখা পেস্ট করুন…"
              }
              className="w-full min-h-[220px] resize-y bg-transparent outline-none text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--foreground))/0.4]"
              maxLength={5000}
            />
          </section>

          <section className="panel p-4 relative">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-neon flex items-center gap-2">
                {dirLabel.to}
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[hsl(var(--foreground))/0.6]">
                  {counts.out} chars
                </span>
                <button
                  type="button"
                  onClick={copyOut}
                  disabled={!translation}
                  className="inline-flex items-center gap-1 text-xs text-[hsl(var(--foreground))/0.75] hover:text-neon transition disabled:opacity-40"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
              </div>
            </div>
            <div className="w-full min-h-[220px] whitespace-pre-wrap text-[hsl(var(--foreground))]">
              {translation ? (
                translation
              ) : (
                <span className="text-[hsl(var(--foreground))/0.4]">
                  {loading ? "Translating…" : "Translation will appear here."}
                </span>
              )}
            </div>
            {error && (
              <p className="mt-3 text-xs text-red-400">{error}</p>
            )}
          </section>
        </div>

        <p className="mt-6 text-xs text-[hsl(var(--foreground))/0.5]">
          Powered by AI. Translations may not be perfect — review important text
          before sending.
        </p>
      </main>
    </div>
  );
};

export default Translator;
