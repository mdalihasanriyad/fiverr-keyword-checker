import { useEffect, useRef, useState } from "react";
import { Languages, ArrowLeftRight, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Direction = "en-bn" | "bn-en";

const DIR_KEY = "translator:direction-v1";

const DIR_LABEL: Record<Direction, { from: string; to: string; full: string }> = {
  "en-bn": { from: "English", to: "Bangla", full: "EN → BN" },
  "bn-en": { from: "Bangla", to: "English", full: "BN → EN" },
};

interface InlineTranslatorProps {
  source: string;
}

const InlineTranslator = ({ source }: InlineTranslatorProps) => {
  const [direction, setDirection] = useState<Direction>(() => {
    try {
      const v = localStorage.getItem(DIR_KEY);
      return v === "bn-en" ? "bn-en" : "en-bn";
    } catch { return "en-bn"; }
  });
  const [translation, setTranslation] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => { try { localStorage.setItem(DIR_KEY, direction); } catch {} }, [direction]);

  const runTranslate = async (text: string, dir: Direction) => {
    const trimmed = text.trim();
    if (!trimmed) { setTranslation(""); setError(null); setLoading(false); return; }
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
        setError(msg); return;
      }
      if (data?.error) { setError(data.error); return; }
      setTranslation((data?.translation ?? "").toString());
    } catch (e) {
      if (id !== reqIdRef.current) return;
      setError(e instanceof Error ? e.message : "Translation failed");
    } finally {
      if (id === reqIdRef.current) setLoading(false);
    }
  };

  // Auto-translate whenever source or direction changes (debounced).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { runTranslate(source, direction); }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, direction]);

  const swap = () => setDirection((d) => (d === "en-bn" ? "bn-en" : "en-bn"));

  const copyOut = async () => {
    if (!translation) return;
    try { await navigator.clipboard.writeText(translation); toast.success("Translation copied"); }
    catch { toast.error("Could not copy"); }
  };

  const dirLabel = DIR_LABEL[direction];

  return (
    <div className="panel p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h3 className="text-sm font-bold tracking-wider text-neon uppercase inline-flex items-center gap-2">
          <Languages className="h-4 w-4" /> Translation
        </h3>
        <div className="flex items-center gap-1.5">
          <div role="group" aria-label="Direction" className="inline-flex rounded-md border border-[hsl(var(--panel-border))/0.6] bg-[hsl(var(--background))/0.6] p-0.5">
            {(["en-bn", "bn-en"] as Direction[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={`px-2 py-0.5 rounded text-[11px] transition ${
                  direction === d
                    ? "bg-[hsl(var(--neon))] text-black font-semibold"
                    : "text-[hsl(var(--foreground))/0.7] hover:text-neon"
                }`}
              >
                {DIR_LABEL[d].full}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={swap}
            title="Swap direction"
            className="inline-flex items-center justify-center rounded-md border border-[hsl(var(--panel-border))/0.6] bg-[hsl(var(--background))/0.6] h-6 w-6 hover:text-neon transition"
          >
            <ArrowLeftRight className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={copyOut}
            disabled={!translation}
            className="inline-flex items-center gap-1 rounded-md border border-[hsl(var(--neon))/0.4] bg-[hsl(var(--neon))/0.08] px-2 py-0.5 text-[11px] text-neon hover:bg-[hsl(var(--neon))/0.15] transition disabled:opacity-40"
          >
            <Copy className="h-3 w-3" /> Copy
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2 text-[11px] text-[hsl(var(--foreground))/0.55]">
        <span>{dirLabel.from} → {dirLabel.to}</span>
        <span className="inline-flex items-center gap-1">
          {loading && <Loader2 className="h-3 w-3 animate-spin" />}
          {translation.length} chars
        </span>
      </div>

      <div className="whitespace-pre-wrap leading-relaxed text-[hsl(var(--foreground))/0.95] min-h-[120px] flex-1">
        {translation ? (
          translation
        ) : (
          <span className="text-[hsl(var(--foreground))/0.4]">
            {source.trim()
              ? (loading ? "Translating…" : "Translation will appear here.")
              : "Type or paste text in the input on the left to see the translation here."}
          </span>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
};

export default InlineTranslator;
