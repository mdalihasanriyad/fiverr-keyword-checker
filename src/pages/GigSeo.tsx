import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { useSeo } from "@/lib/seo";
import { trackCtaClick } from "@/lib/ctaTracking";

const GigSeo = () => {
  useSeo({
    title: "Fiverr Gig SEO Checker — Optimize Titles, Tags & Rank Higher",
    description:
      "Boost your Fiverr gig SEO: scan titles, tags, and descriptions for risky or low-value keywords and get cleaner copy that ranks and converts.",
    canonical: "https://fiverr-keyword-checker.lovable.app/gig-seo",
    keywords:
      "fiverr gig seo, fiverr seo optimization, fiverr gig optimization, fiverr gig ranking, fiverr title optimizer, fiverr tags generator, fiverr description checker, best fiverr seo tool 2025",
  });

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10 sm:py-14">
      <main className="mx-auto max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--neon))/0.5] bg-[hsl(var(--neon))/0.08] px-4 py-1.5 text-sm text-neon">
          <Sparkles className="h-4 w-4" /> Gig SEO
        </span>
        <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
          Fiverr <span className="text-neon">Gig SEO</span> Checker
        </h1>
        <p className="mt-4 text-[hsl(var(--foreground))/0.75] leading-relaxed">
          Ranking on Fiverr starts with clean, keyword-rich, policy-safe copy. Paste your gig title,
          description, or tags into the checker to spot risky words, optimize for search, and improve
          impressions, clicks, and orders.
        </p>

        <section className="panel mt-8 p-6">
          <h2 className="text-lg font-bold text-neon">SEO best practices for Fiverr gigs</h2>
          <ol className="mt-3 space-y-2 text-sm text-[hsl(var(--foreground))/0.8] list-decimal pl-5">
            <li>Lead the title with your strongest keyword.</li>
            <li>Use all 5 tags with high-intent, on-topic search terms.</li>
            <li>Avoid forbidden or off-platform terms that hurt ranking.</li>
            <li>Write a clear, scannable description with natural keyword variations.</li>
          </ol>
        </section>

        <Link
          to="/?mode=gig-seo&cta=gig-seo&run=1"
          onClick={() => trackCtaClick("gig-seo")}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--neon))] text-black font-bold px-5 py-3 hover:bg-[hsl(var(--neon-glow))] transition shadow-[0_0_30px_hsl(var(--neon)/0.4)]"
        >
          Audit my gig SEO copy <ArrowRight className="h-4 w-4" />
        </Link>
      </main>
    </div>
  );
};

export default GigSeo;
