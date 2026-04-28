import { useEffect, useMemo, useRef, useState } from "react";
import { Languages, ArrowLeftRight, Copy, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Direction = "en-bn" | "bn-en";

const SOURCE_KEY = "translator:source-v1";
const DIR_KEY = "translator:direction-v1";
const AUTO_KEY = "translator:auto-v1";

const DIR_LABEL: Record<Direction, { from: string; to: string; full: string }> = {
  "en-bn": { from: "English", to: "Bangla", full: "English → Bangla" },
  "bn-en": { from: "Bangla", to: "English", full: "Bangla → English" },
};

const TranslatorPanel = () => {
  const [source, setSource] = useState<string>(() => {
    try { return localStorage.getItem(SOURCE_KEY) ?? ""; } catch { return ""; }
  });
  const [direction, setDirection] = useState<Direction>(() => {
    try {
      const v = localStorage.getItem(DIR_KEY);
      return v === "bn-en" ? "bn-en" : "en-bn";
    } catch { return "en-bn"; }
  });
  const [autoTranslate, setAutoTranslate] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(AUTO_KEY);
      return v === null ? true : v === "1";
    } catch { return true; }
  });
  const [translation, setTranslation] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => { try { localStorage.setItem(SOURCE_KEY, source); } catch {} }, [source]);
  useEffect(() => { try { localStorage.setItem(DIR_KEY, direction); } catch {} }, [direction]);
  useEffect(() => { try { localStorage.setItem(AUTO_KEY, autoTranslate ? "1" : "0"); } catch {} }, [autoTranslate]);

  const runTranslate = async (text: string, dir: Direction) => {
    const trimmed = text.trim();
    if (!trimmed) { setTranslation(""); setError(null); return; }
    const id = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("translate", {
        body: { text: trimmed, direction: dir },
      });
      if (id !== reqIdRef.current) return;
      if (fnError) {
        const msg = (fnError as { message?: string })?.message ?? "Translation failed";
        setError(msg); toast.error(msg); return;
      }
      if (data?.error) { setError(data.error); toast.error(data.error); return; }
      setTranslation((data?.translation ?? "").toString());
    } catch (e) {
      if (id !== reqIdRef.current) return;
      const msg = e instanceof Error ? e.message : "Translation failed";
      setError(msg); toast.error(msg);
    } finally {
      if (id === reqIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!autoTranslate) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { runTranslate(source, direction); }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, direction, autoTranslate]);

  const counts = useMemo(() => ({ src: source.length, out: translation.length }), [source, translation]);

  const swap = () => {
    const nextDir: Direction = direction === "en-bn" ? "bn-en" : "en-bn";
    setDirection(nextDir);
    if (translation) { setSource(translation); setTranslation(""); }
  };

  const copyOut = async () => {
    if (!translation) return;
    try { await navigator.clipboard.writeText(translation); toast.success("Translation copied"); }
    catch { toast.error("Could not copy"); }
  };

  const clearAll = () => { setSource(""); setTranslation(""); setError(null); };

  const dirLabel = DIR_LABEL[direction];

  return (
    <section className="panel p-5 mt-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h3 className="text-sm font-bold tracking-wider text-neon uppercase inline-flex items-center gap-2">
          <Languages className="h-4 w-4" /> English ⇄ Bangla Translator
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Direction" className="inline-flex rounded-lg border border-[hsl(var(--panel-border))/0.6] bg-[hsl(var(--background))/0.6] p-0.5">
            {(["en-bn", "bn-en"] as Direction[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={`px-2.5 py-1 rounded-md text-xs transition ${
                  direction === d
                    ? "bg-[hsl(var(--neon))] text-black font-semibold"
                    : "text-[hsl(var(--foreground))/0.7] hover:text-neon"
                }`}
              >
                {DIR_LABEL[d].full}
              </button>
            ))}
          </div>
          <button type="button" onClick={swap} className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--panel-border))/0.6] bg-[hsl(var(--background))/0.6] px-2.5 py-1 text-xs hover:text-neon transition">
            <ArrowLeftRight className="h-3.5 w-3.5" /> Swap
          </button>
          <label className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--panel-border))/0.6] bg-[hsl(var(--background))/0.6] px-2.5 py-1 text-xs cursor-pointer">
            <input type="checkbox" checked={autoTranslate} onChange={(e) => setAutoTranslate(e.target.checked)} className="accent-[hsl(var(--neon))]" />
            Auto-translate
          </label>
          {!autoTranslate && (
            <button type="button" onClick={() => runTranslate(source, direction)} disabled={loading || !source.trim()} className="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--neon))] text-black font-semibold px-3 py-1 text-xs hover:bg-[hsl(var(--neon-glow))] transition disabled:opacity-50">
              Translate
            </button>
          )}
          <button type="button" onClick={clearAll} className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--panel-border))/0.6] bg-[hsl(var(--background))/0.6] px-2.5 py-1 text-xs hover:text-neon transition">
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-[hsl(var(--panel-border))/0.6] bg-[hsl(var(--background))/0.4] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neon">{dirLabel.from}</span>
            <span className="text-xs text-[hsl(var(--foreground))/0.6]">{counts.src} chars</span>
          </div>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder={direction === "en-bn" ? "Type or paste English text…" : "এখানে বাংলা লেখা পেস্ট করুন…"}
            className="w-full min-h-[160px] resize-y bg-transparent outline-none text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--foreground))/0.4]"
            maxLength={5000}
          />
        </div>

        <div className="rounded-lg border border-[hsl(var(--panel-border))/0.6] bg-[hsl(var(--background))/0.4] p-3 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neon inline-flex items-center gap-2">
              {dirLabel.to}
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[hsl(var(--foreground))/0.6]">{counts.out} chars</span>
              <button type="button" onClick={copyOut} disabled={!translation} className="inline-flex items-center gap-1 text-xs text-[hsl(var(--foreground))/0.75] hover:text-neon transition disabled:opacity-40">
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
          </div>
          <div className="w-full min-h-[160px] whitespace-pre-wrap text-[hsl(var(--foreground))]">
            {translation ? translation : (
              <span className="text-[hsl(var(--foreground))/0.4]">
                {loading ? "Translating…" : "Translation will appear here."}
              </span>
            )}
          </div>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
      </div>
      <p className="mt-3 text-xs text-[hsl(var(--foreground))/0.5]">
        Powered by AI. Review important text before sending.
      </p>
    </section>
  );
};

export default TranslatorPanel;
