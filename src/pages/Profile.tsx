import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, BadgeCheck, Briefcase, Clock, Images, Loader2, MapPin, MessageSquare,
  Pencil, Plus, Save, Star, Trash2, User, X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useSeo } from "@/lib/seo";

type Profile = {
  id: string;
  user_id: string | null;
  slug: string;
  display_name: string;
  headline: string;
  bio: string;
  location: string;
  rating: number;
  review_count: number;
  level: string;
};

type PortfolioItem = {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  tags: string[];
};

type Service = {
  id: string;
  title: string;
  description: string;
  price_usd: number;
  delivery_days: number;
  category: string;
};

const initials = (name: string) =>
  name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "seller";

const inputCls =
  "mt-1 w-full rounded-xl border border-[hsl(var(--panel-border))/0.6] bg-[hsl(var(--panel))] px-3 py-2 text-sm outline-none focus:border-[hsl(var(--neon))/0.7]";
const ghostBtn =
  "inline-flex items-center gap-1.5 text-xs text-[hsl(var(--foreground))/0.75] hover:text-neon transition disabled:opacity-40";
const primaryBtn =
  "inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--neon))] px-4 py-2 text-sm font-bold text-black hover:bg-[hsl(var(--neon-glow))] transition disabled:opacity-50";

const Profile = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthSession();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ display_name: "", headline: "", bio: "", location: "" });
  const [saving, setSaving] = useState(false);

  const [newItem, setNewItem] = useState({ title: "", description: "", tags: "" });
  const [newService, setNewService] = useState({
    title: "", description: "", price_usd: "25", delivery_days: "3", category: "General",
  });

  const isMe = slug === "me";
  const isOwner = !!profile && !!user && profile.user_id === user.id;

  useSeo({
    title: profile
      ? `${profile.display_name} — Fiverr Profile, Portfolio & Services`
      : "Fiverr Seller Profile",
    description: profile
      ? `${profile.headline}. View ${profile.display_name}'s bio, portfolio and service listings.`
      : "Fiverr-style seller profile with bio, portfolio and services.",
    canonical: `https://fiverr-keyword-checker.lovable.app/profile/${slug ?? ""}`,
  });

  const loadChildren = useCallback(async (profileId: string) => {
    const [pf, sv] = await Promise.all([
      supabase.from("portfolio_items").select("id, title, description, image_url, tags")
        .eq("profile_id", profileId).order("sort_order"),
      supabase.from("services").select("id, title, description, price_usd, delivery_days, category")
        .eq("profile_id", profileId).order("sort_order"),
    ]);
    setPortfolio((pf.data ?? []) as PortfolioItem[]);
    setServices((sv.data ?? []) as Service[]);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (isMe && !user) {
      navigate("/auth", { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotFound(false);
      const cols = "id, user_id, slug, display_name, headline, bio, location, rating, review_count, level";
      let q = supabase.from("profiles").select(cols);
      q = isMe ? q.eq("user_id", user!.id) : q.eq("slug", slug ?? "");
      const { data, error } = await q.maybeSingle();
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      let p = data as Profile | null;
      if (!p && isMe && user) {
        // First visit: create the signed-in user's own profile.
        const base = user.email?.split("@")[0] ?? "seller";
        const { data: created, error: cErr } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            slug: `${slugify(base)}-${user.id.slice(0, 6)}`,
            display_name: base,
            headline: "Fiverr seller",
            bio: "Tell buyers what you do best.",
          })
          .select(cols)
          .single();
        if (cErr) toast.error(cErr.message);
        p = (created as Profile | null) ?? null;
      }
      if (!p) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setProfile(p);
      setForm({ display_name: p.display_name, headline: p.headline, bio: p.bio, location: p.location });
      await loadChildren(p.id);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, isMe, user, authLoading, navigate, loadChildren]);

  const saveProfile = async () => {
    if (!profile || saving) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", profile.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setProfile({ ...profile, ...form });
    setEditing(false);
    toast.success("Profile saved");
  };

  const addItem = async () => {
    if (!profile || !newItem.title.trim()) return;
    const { data, error } = await supabase
      .from("portfolio_items")
      .insert({
        profile_id: profile.id,
        title: newItem.title.trim(),
        description: newItem.description.trim(),
        tags: newItem.tags.split(",").map((t) => t.trim()).filter(Boolean),
        sort_order: portfolio.length + 1,
      })
      .select("id, title, description, image_url, tags")
      .single();
    if (error) return toast.error(error.message);
    setPortfolio((p) => [...p, data as PortfolioItem]);
    setNewItem({ title: "", description: "", tags: "" });
    toast.success("Portfolio item added");
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from("portfolio_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setPortfolio((p) => p.filter((i) => i.id !== id));
  };

  const addService = async () => {
    if (!profile || !newService.title.trim()) return;
    const { data, error } = await supabase
      .from("services")
      .insert({
        profile_id: profile.id,
        title: newService.title.trim(),
        description: newService.description.trim(),
        price_usd: Number(newService.price_usd) || 5,
        delivery_days: Number(newService.delivery_days) || 1,
        category: newService.category.trim() || "General",
        sort_order: services.length + 1,
      })
      .select("id, title, description, price_usd, delivery_days, category")
      .single();
    if (error) return toast.error(error.message);
    setServices((s) => [...s, data as Service]);
    setNewService({ title: "", description: "", price_usd: "25", delivery_days: "3", category: "General" });
    toast.success("Service added");
  };

  const removeService = async (id: string) => {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setServices((s) => s.filter((i) => i.id !== id));
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neon" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-extrabold">Profile not found</h1>
        <Link to="/inbox" className="text-neon hover:underline text-sm">← Back to inbox</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-3 sm:px-4 py-6 sm:py-10">
      <div className="mx-auto w-full" style={{ maxWidth: 1500 }}>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--neon))/0.5] bg-[hsl(var(--neon))/0.08] px-4 py-1.5 text-sm text-neon">
            <User className="h-4 w-4" /> Seller Profile
          </span>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/inbox" className="inline-flex items-center gap-1.5 text-[hsl(var(--foreground))/0.7] hover:text-neon transition">
              <ArrowLeft className="h-4 w-4" /> Inbox
            </Link>
            <Link to="/" className="text-[hsl(var(--foreground))/0.7] hover:text-neon transition">
              Keyword checker
            </Link>
          </div>
        </header>

        {/* Bio header */}
        <section className="panel mt-6 p-5 sm:p-7" data-testid="profile-header">
          <div className="flex flex-col sm:flex-row gap-5">
            <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--neon))/0.15] text-2xl font-extrabold text-neon glow-neon">
              {initials(profile.display_name)}
            </span>
            <div className="min-w-0 flex-1">
              {editing ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-1">
                    <span className="text-xs text-[hsl(var(--foreground))/0.65]">Display name</span>
                    <input className={inputCls} value={form.display_name}
                      onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
                  </label>
                  <label className="block">
                    <span className="text-xs text-[hsl(var(--foreground))/0.65]">Location</span>
                    <input className={inputCls} value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })} />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-xs text-[hsl(var(--foreground))/0.65]">Headline</span>
                    <input className={inputCls} value={form.headline}
                      onChange={(e) => setForm({ ...form, headline: e.target.value })} />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-xs text-[hsl(var(--foreground))/0.65]">Bio</span>
                    <textarea className={`${inputCls} min-h-[110px] resize-y`} value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })} />
                  </label>
                  <div className="flex gap-3 sm:col-span-2">
                    <button onClick={saveProfile} disabled={saving} className={primaryBtn}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save
                    </button>
                    <button onClick={() => setEditing(false)} className={ghostBtn}>
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                      {profile.display_name}
                    </h1>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--neon))/0.4] px-2.5 py-0.5 text-xs text-neon">
                      <BadgeCheck className="h-3.5 w-3.5" /> {profile.level}
                    </span>
                  </div>
                  <p className="mt-1 text-sm sm:text-base text-[hsl(var(--foreground))/0.8]">
                    {profile.headline}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[hsl(var(--foreground))/0.6]">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-neon" fill="currentColor" />
                      <strong className="text-[hsl(var(--foreground))]">{Number(profile.rating).toFixed(1)}</strong>
                      ({profile.review_count})
                    </span>
                    {profile.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {profile.location}
                      </span>
                    )}
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[hsl(var(--foreground))/0.85]">
                    {profile.bio}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {isOwner ? (
                      <button onClick={() => setEditing(true)} className={primaryBtn}>
                        <Pencil className="h-4 w-4" /> Edit profile
                      </button>
                    ) : (
                      <Link to={`/inbox?contact=${encodeURIComponent(profile.slug)}`} className={primaryBtn}>
                        <MessageSquare className="h-4 w-4" /> Message {profile.display_name.split(" ")[0]}
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Portfolio */}
          <section className="panel p-4 sm:p-5" data-testid="profile-portfolio">
            <h2 className="flex items-center gap-2 text-sm font-bold text-neon">
              <Images className="h-4 w-4" /> Portfolio
              <span className="ml-auto text-xs font-normal text-[hsl(var(--foreground))/0.55]">
                {portfolio.length} item{portfolio.length === 1 ? "" : "s"}
              </span>
            </h2>
            {portfolio.length === 0 && (
              <p className="mt-4 text-sm text-[hsl(var(--foreground))/0.45]">No portfolio items yet.</p>
            )}
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {portfolio.map((item) => (
                <li key={item.id} className="rounded-xl border border-[hsl(var(--panel-border))/0.5] bg-[hsl(var(--panel))] overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} loading="lazy" className="h-32 w-full object-cover" />
                  ) : (
                    <div className="h-24 w-full bg-[radial-gradient(circle_at_30%_20%,hsl(var(--neon)/0.35),transparent_60%)] border-b border-[hsl(var(--panel-border))/0.4]" />
                  )}
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold">{item.title}</h3>
                      {isOwner && (
                        <button onClick={() => removeItem(item.id)} className={ghostBtn} aria-label="Remove item">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[hsl(var(--foreground))/0.65]">{item.description}</p>
                    {item.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.tags.map((t) => (
                          <span key={t} className="rounded-full bg-[hsl(var(--neon))/0.1] px-2 py-0.5 text-[10px] text-neon">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {isOwner && (
              <div className="mt-4 space-y-2 border-t border-[hsl(var(--panel-border))/0.4] pt-4">
                <input className={inputCls} placeholder="Project title" value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} />
                <input className={inputCls} placeholder="Short description" value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} />
                <input className={inputCls} placeholder="Tags (comma separated)" value={newItem.tags}
                  onChange={(e) => setNewItem({ ...newItem, tags: e.target.value })} />
                <button onClick={addItem} disabled={!newItem.title.trim()} className={primaryBtn}>
                  <Plus className="h-4 w-4" /> Add portfolio item
                </button>
              </div>
            )}
          </section>

          {/* Services */}
          <section className="panel p-4 sm:p-5" data-testid="profile-services">
            <h2 className="flex items-center gap-2 text-sm font-bold text-neon">
              <Briefcase className="h-4 w-4" /> Services
              <span className="ml-auto text-xs font-normal text-[hsl(var(--foreground))/0.55]">
                {services.length} listing{services.length === 1 ? "" : "s"}
              </span>
            </h2>
            {services.length === 0 && (
              <p className="mt-4 text-sm text-[hsl(var(--foreground))/0.45]">No services listed yet.</p>
            )}
            <ul className="mt-3 space-y-3">
              {services.map((s) => (
                <li key={s.id} className="rounded-xl border border-[hsl(var(--panel-border))/0.5] bg-[hsl(var(--panel))] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase tracking-wide text-[hsl(var(--foreground))/0.5]">
                        {s.category}
                      </span>
                      <h3 className="text-sm font-semibold">{s.title}</h3>
                      <p className="mt-1 text-xs text-[hsl(var(--foreground))/0.65]">{s.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-extrabold text-neon">${Number(s.price_usd).toFixed(0)}</div>
                      <div className="inline-flex items-center gap-1 text-[10px] text-[hsl(var(--foreground))/0.55]">
                        <Clock className="h-3 w-3" /> {s.delivery_days}d delivery
                      </div>
                      {isOwner && (
                        <button onClick={() => removeService(s.id)} className={`${ghostBtn} mt-1`} aria-label="Remove service">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {isOwner && (
              <div className="mt-4 space-y-2 border-t border-[hsl(var(--panel-border))/0.4] pt-4">
                <input className={inputCls} placeholder="Service title" value={newService.title}
                  onChange={(e) => setNewService({ ...newService, title: e.target.value })} />
                <input className={inputCls} placeholder="What's included" value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })} />
                <div className="grid grid-cols-3 gap-2">
                  <input className={inputCls} type="number" min={5} placeholder="Price (USD)" value={newService.price_usd}
                    onChange={(e) => setNewService({ ...newService, price_usd: e.target.value })} />
                  <input className={inputCls} type="number" min={1} placeholder="Days" value={newService.delivery_days}
                    onChange={(e) => setNewService({ ...newService, delivery_days: e.target.value })} />
                  <input className={inputCls} placeholder="Category" value={newService.category}
                    onChange={(e) => setNewService({ ...newService, category: e.target.value })} />
                </div>
                <button onClick={addService} disabled={!newService.title.trim()} className={primaryBtn}>
                  <Plus className="h-4 w-4" /> Add service
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Profile;
