import { Link } from "react-router-dom";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { useSeo } from "@/lib/seo";
import { trackCtaClick } from "@/lib/ctaTracking";

const ForbiddenWords = () => {
  useSeo({
    title: "Fiverr Forbidden Words Checker — Detect Banned Keywords Instantly",
    description:
      "Scan Fiverr messages for forbidden words and banned keywords in seconds. Avoid account warnings and post safely with our free detector.",
    canonical: "https://fiverr-keyword-checker.lovable.app/forbidden-words",
    keywords:
      "fiverr forbidden words, fiverr banned keywords, fiverr forbidden words list, fiverr restricted words, fiverr message checker, fiverr spam words detector",
  });

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10 sm:py-14">
      <main className="mx-auto max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--neon))/0.5] bg-[hsl(var(--neon))/0.08] px-4 py-1.5 text-sm text-neon">
          <ShieldAlert className="h-4 w-4" /> Forbidden Words
        </span>
        <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
          Fiverr <span className="text-neon">Forbidden Words</span> Checker
        </h1>
        <p className="mt-4 text-[hsl(var(--foreground))/0.75] leading-relaxed">
          Fiverr restricts certain words in messages and gigs to prevent off-platform contact and policy
          violations. Our free checker instantly highlights every forbidden or banned keyword in your
          text — including payment terms, contact methods, and external platforms — so you can rewrite
          before sending.
        </p>

        <section className="panel mt-8 p-6">
          <h2 className="text-lg font-bold text-neon">Common Fiverr forbidden words</h2>
          <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm text-[hsl(var(--foreground))/0.8]">
            {["whatsapp", "email", "paypal", "skype", "telegram", "phone", "outside", "contact", "gmail", "instagram", "bank", "card"].map((w) => (
              <li key={w} className="rounded-full bg-[hsl(var(--background))] border border-[hsl(var(--panel-border))/0.5] px-3 py-1 text-center">
                {w}
              </li>
            ))}
          </ul>
        </section>

        <Link
          to="/?mode=forbidden-words&cta=forbidden-words&run=1"
          onClick={() => trackCtaClick("forbidden-words")}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--neon))] text-black font-bold px-5 py-3 hover:bg-[hsl(var(--neon-glow))] transition shadow-[0_0_30px_hsl(var(--neon)/0.4)]"
        >
          Scan my text for forbidden words <ArrowRight className="h-4 w-4" />
        </Link>
      </main>
    </div>
  );
};

export default ForbiddenWords;
