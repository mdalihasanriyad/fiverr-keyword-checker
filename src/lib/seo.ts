import { useEffect } from "react";

type SeoOptions = {
  title: string;
  description: string;
  canonical?: string;
  keywords?: string;
};

const upsertMeta = (selector: string, attr: "name" | "property", key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const upsertCanonical = (href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

/**
 * Lightweight client-side SEO updater. Sets title, meta description,
 * canonical, and OG/Twitter mirrors on mount + when inputs change.
 */
export const useSeo = ({ title, description, canonical, keywords }: SeoOptions) => {
  useEffect(() => {
    document.title = title;
    upsertMeta('meta[name="description"]', "name", "description", description);
    if (keywords) {
      upsertMeta('meta[name="keywords"]', "name", "keywords", keywords);
    }
    upsertMeta('meta[property="og:title"]', "property", "og:title", title);
    upsertMeta('meta[property="og:description"]', "property", "og:description", description);
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    if (canonical) {
      upsertCanonical(canonical);
      upsertMeta('meta[property="og:url"]', "property", "og:url", canonical);
    }
  }, [title, description, canonical, keywords]);
};
