import { Link } from "react-router-dom";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { useSeo } from "@/lib/seo";
import { trackCtaClick } from "@/lib/ctaTracking";

const Compliance = () => {
  useSeo({
    title: "Fiverr Compliance Checker — Stay Policy-Safe & Avoid Account Bans",
    description:
      "Check your Fiverr messages and gigs for policy violations. Our compliance checker flags risky terms so you avoid warnings, suspensions, and bans.",
    canonical: "https://fiverr-keyword-checker.lovable.app/compliance",
    keywords:
      "fiverr compliance checker, fiverr policy checker, avoid fiverr ban, fiverr account safety, fiverr message safety, fiverr restricted words",
  });

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10 sm:py-14">
      <main className="mx-auto max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--neon))/0.5] bg-[hsl(var(--neon))/0.08] px-4 py-1.5 text-sm text-neon">
          <ShieldAlert className="h-4 w-4" /> Compliance
        </span>
        <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
          Fiverr <span className="text-neon">Compliance</span> Checker
        </h1>
        <p className="mt-4 text-[hsl(var(--foreground))/0.75] leading-relaxed">
          One careless word can trigger a Fiverr warning or even an account ban. Our compliance checker
          scans your text against Fiverr's Terms of Service and flags off-platform contact attempts,
          payment redirects, and restricted vocabulary — keeping your seller account safe.
        </p>

        <section className="panel mt-8 p-6">
          <h2 className="text-lg font-bold text-neon">What we check for</h2>
          <ul className="mt-3 space-y-2 text-sm text-[hsl(var(--foreground))/0.8] list-disc pl-5">
            <li>Off-platform contact (email, phone, social media handles)</li>
            <li>Payment redirection (PayPal, Stripe, bank transfers, crypto)</li>
            <li>Spam-trigger and review-manipulation phrases</li>
            <li>Custom forbidden terms you define yourself</li>
          </ul>
        </section>

        <Link
          to="/?mode=compliance"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--neon))] text-black font-bold px-5 py-3 hover:bg-[hsl(var(--neon-glow))] transition shadow-[0_0_30px_hsl(var(--neon)/0.4)]"
        >
          Run a compliance check <ArrowRight className="h-4 w-4" />
        </Link>
      </main>
    </div>
  );
};

export default Compliance;
