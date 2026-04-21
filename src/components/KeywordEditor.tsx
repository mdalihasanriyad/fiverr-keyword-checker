import { useState } from "react";
import { Plus, Trash2, RotateCcw, X } from "lucide-react";

export type KeywordMap = Record<string, string>;

interface Props {
  open: boolean;
  onClose: () => void;
  keywords: KeywordMap;
  onChange: (next: KeywordMap) => void;
  onReset: () => void;
}

const KeywordEditor = ({ open, onClose, keywords, onChange, onReset }: Props) => {
  const [newKw, setNewKw] = useState("");
  const [newRep, setNewRep] = useState("");

  if (!open) return null;

  const entries = Object.entries(keywords).sort(([a], [b]) => a.localeCompare(b));

  const updateReplacement = (kw: string, rep: string) => {
    onChange({ ...keywords, [kw]: rep });
  };

  const remove = (kw: string) => {
    const next = { ...keywords };
    delete next[kw];
    onChange(next);
  };

  const add = () => {
    const kw = newKw.trim().toLowerCase();
    if (!kw) return;
    onChange({ ...keywords, [kw]: newRep.trim() || "***" });
    setNewKw("");
    setNewRep("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="panel glow-neon w-full max-w-2xl max-h-[85vh] flex flex-col bg-[hsl(var(--panel))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--panel-border))/0.5]">
          <div>
            <h2 className="text-xl font-bold text-neon">Edit Keywords</h2>
            <p className="text-xs text-[hsl(var(--foreground))/0.6] mt-0.5">
              Customize forbidden keywords and their replacements
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--panel-border))] px-2.5 py-1.5 text-xs hover:bg-[hsl(var(--neon))/0.08]"
              title="Reset to defaults"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <button
              onClick={onClose}
              className="rounded-md border border-[hsl(var(--panel-border))] p-1.5 hover:bg-[hsl(var(--danger))/0.15]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Add new */}
        <div className="p-5 border-b border-[hsl(var(--panel-border))/0.5]">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
            <input
              value={newKw}
              onChange={(e) => setNewKw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="New keyword..."
              className="rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--panel-border))] px-3 py-2 text-sm outline-none focus:border-[hsl(var(--neon))]"
            />
            <input
              value={newRep}
              onChange={(e) => setNewRep(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Replacement (optional)"
              className="rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--panel-border))] px-3 py-2 text-sm outline-none focus:border-[hsl(var(--neon))]"
            />
            <button
              onClick={add}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[hsl(var(--neon))] text-black font-bold px-4 py-2 text-sm hover:bg-[hsl(var(--neon-glow))]"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="text-xs uppercase tracking-wider text-neon font-bold mb-3">
            {entries.length} Keyword{entries.length !== 1 ? "s" : ""}
          </div>
          <div className="flex flex-col gap-2">
            {entries.map(([kw, rep]) => (
              <div
                key={kw}
                className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 rounded-md border border-[hsl(var(--panel-border))/0.5] bg-[hsl(var(--background))/0.5] p-2"
              >
                <div className="px-2 py-1 font-mono text-sm text-[hsl(var(--danger))] truncate">{kw}</div>
                <span className="text-[hsl(var(--foreground))/0.4]">→</span>
                <input
                  value={rep}
                  onChange={(e) => updateReplacement(kw, e.target.value)}
                  className="rounded bg-[hsl(var(--panel))] border border-[hsl(var(--panel-border))/0.5] px-2 py-1 text-sm outline-none focus:border-[hsl(var(--neon))]"
                />
                <button
                  onClick={() => remove(kw)}
                  className="rounded p-1.5 text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger))/0.15]"
                  aria-label={`Remove ${kw}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {entries.length === 0 && (
              <div className="text-center text-sm text-[hsl(var(--foreground))/0.5] py-8">
                No keywords. Add one above.
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-[hsl(var(--panel-border))/0.5] text-xs text-[hsl(var(--foreground))/0.5] text-center">
          Changes are saved automatically to your browser
        </div>
      </div>
    </div>
  );
};

export default KeywordEditor;
