import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useSeo } from "@/lib/seo";

const Auth = () => {
  useSeo({
    title: "Sign in — Fiverr Message Inbox",
    description:
      "Sign in to your Fiverr Keyword Checker inbox to write, screen and send messages safely.",
    canonical: "https://fiverr-keyword-checker.lovable.app/auth",
  });

  const navigate = useNavigate();
  const { user, loading } = useAuthSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/inbox", { replace: true });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/inbox` },
        });
        if (error) throw error;
        toast.success("Account created. Check your email to confirm, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/inbox", { replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/inbox` },
    });
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-14 flex items-center justify-center">
      <main className="w-full max-w-md">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--neon))/0.5] bg-[hsl(var(--neon))/0.08] px-4 py-1.5 text-sm text-neon">
            <ShieldCheck className="h-4 w-4" /> Fiverr Message Inbox
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
            {mode === "signin" ? "Sign in to your inbox" : "Create your inbox"}
          </h1>
          <p className="mt-2 text-sm text-[hsl(var(--foreground))/0.7]">
            Write, screen for forbidden words, and send — all in one place.
          </p>
        </div>

        <div className="panel mt-6 p-6">
          <button
            type="button"
            onClick={google}
            className="w-full rounded-xl border border-[hsl(var(--panel-border))/0.6] px-4 py-2.5 text-sm font-semibold hover:text-neon transition"
          >
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-[hsl(var(--foreground))/0.45]">
            <span className="h-px flex-1 bg-[hsl(var(--panel-border))/0.5]" />
            or use email
            <span className="h-px flex-1 bg-[hsl(var(--panel-border))/0.5]" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              <span className="text-xs text-[hsl(var(--foreground))/0.65]">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="mt-1 w-full rounded-xl border border-[hsl(var(--panel-border))/0.6] bg-[hsl(var(--panel))] px-3 py-2 text-sm outline-none focus:border-[hsl(var(--neon))/0.7]"
                placeholder="you@example.com"
              />
            </label>
            <label className="block">
              <span className="text-xs text-[hsl(var(--foreground))/0.65]">Password</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="mt-1 w-full rounded-xl border border-[hsl(var(--panel-border))/0.6] bg-[hsl(var(--panel))] px-3 py-2 text-sm outline-none focus:border-[hsl(var(--neon))/0.7]"
                placeholder="••••••••"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--neon))] text-black font-bold px-4 py-2.5 text-sm hover:bg-[hsl(var(--neon-glow))] transition disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-[hsl(var(--foreground))/0.65]">
            {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-neon hover:underline"
            >
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-sm">
          <Link to="/" className="text-[hsl(var(--foreground))/0.6] hover:text-neon transition">
            ← Back to keyword checker
          </Link>
        </p>
      </main>
    </div>
  );
};

export default Auth;
