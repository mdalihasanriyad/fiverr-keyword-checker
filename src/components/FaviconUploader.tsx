import { useEffect, useRef, useState } from "react";
import { Upload, RotateCcw, ImageIcon } from "lucide-react";
import { toast } from "sonner";

const FAVICON_KEY = "fiverr-keyword-checker:favicon-v1";
const DEFAULT_FAVICON = "/favicon.png";
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"];
const MAX_BYTES = 1024 * 1024; // 1MB

const mimeToType = (mime: string) => {
  if (mime === "image/svg+xml") return "image/svg+xml";
  if (mime === "image/x-icon" || mime === "image/vnd.microsoft.icon") return "image/x-icon";
  if (mime === "image/jpeg") return "image/jpeg";
  if (mime === "image/webp") return "image/webp";
  return "image/png";
};

const applyFavicon = (href: string, type: string) => {
  // Remove every existing icon link to prevent the browser from picking the old one.
  document
    .querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="shortcut icon"]')
    .forEach((node) => node.parentNode?.removeChild(node));

  const link = document.createElement("link");
  link.rel = "icon";
  link.type = type;
  link.href = href;
  document.head.appendChild(link);
};

const FaviconUploader = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Restore persisted favicon on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVICON_KEY);
      if (!raw) return;
      const { href, type } = JSON.parse(raw) as { href: string; type: string };
      if (href && type) {
        applyFavicon(href, type);
        setPreview(href);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleFile = (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Unsupported file type", {
        description: "Use PNG, JPG, WEBP, SVG, or ICO.",
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image too large", {
        description: `Max 1MB. This file is ${(file.size / 1024).toFixed(0)}KB.`,
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const href = String(reader.result || "");
      if (!href) {
        toast.error("Could not read image", { description: "Please try a different file." });
        return;
      }
      const type = mimeToType(file.type);
      applyFavicon(href, type);
      setPreview(href);
      try {
        localStorage.setItem(FAVICON_KEY, JSON.stringify({ href, type }));
      } catch {
        toast.warning("Favicon applied for this session only", {
          description: "Browser storage is full or unavailable; it won't persist across reloads.",
        });
        return;
      }
      toast.success("Favicon updated", {
        description: `${file.name} is now your site icon.`,
      });
    };
    reader.onerror = () => {
      toast.error("Could not read image", { description: "Please try a different file." });
    };
    reader.readAsDataURL(file);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so picking the same file again still triggers onChange.
    e.target.value = "";
  };

  const reset = () => {
    try {
      localStorage.removeItem(FAVICON_KEY);
    } catch {
      // ignore
    }
    applyFavicon(DEFAULT_FAVICON, "image/png");
    setPreview(null);
    toast.success("Favicon reset", { description: "Restored the default site icon." });
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--panel-border))] bg-[hsl(var(--panel))]/60 px-3 py-1.5">
      <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-md border border-[hsl(var(--panel-border))] bg-[hsl(var(--background))]">
        {preview ? (
          <img src={preview} alt="Current favicon preview" className="h-full w-full object-contain" width={24} height={24} />
        ) : (
          <ImageIcon className="h-3.5 w-3.5 text-[hsl(var(--foreground))/0.5]" />
        )}
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-neon hover:bg-[hsl(var(--neon))/0.1] transition"
      >
        <Upload className="h-3.5 w-3.5" /> Upload favicon
      </button>
      {preview && (
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[hsl(var(--foreground))/0.7] hover:bg-[hsl(var(--background))/0.6] transition"
          title="Restore default favicon"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
        onChange={onPick}
        className="hidden"
      />
    </div>
  );
};

export default FaviconUploader;
