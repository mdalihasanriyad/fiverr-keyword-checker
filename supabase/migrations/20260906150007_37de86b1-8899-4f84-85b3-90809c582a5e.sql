CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  headline text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  avatar_color text NOT NULL DEFAULT 'neon',
  rating numeric(2,1) NOT NULL DEFAULT 5.0,
  review_count integer NOT NULL DEFAULT 0,
  level text NOT NULL DEFAULT 'New Seller',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are publicly readable" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text,
  tags text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.portfolio_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_items TO authenticated;
GRANT ALL ON public.portfolio_items TO service_role;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Portfolio publicly readable" ON public.portfolio_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners manage portfolio" ON public.portfolio_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  price_usd numeric(10,2) NOT NULL DEFAULT 5,
  delivery_days integer NOT NULL DEFAULT 3,
  category text NOT NULL DEFAULT 'General',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Services publicly readable" ON public.services FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners manage services" ON public.services FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.conversations ADD COLUMN profile_slug text;
UPDATE public.conversations SET profile_slug = lower(replace(contact_name, ' ', '-')) WHERE profile_slug IS NULL;

INSERT INTO public.profiles (slug, display_name, headline, bio, location, avatar_color, rating, review_count, level) VALUES
('amelia-brooks', 'Amelia Brooks', 'Brand strategist & startup founder', 'I run a small DTC skincare brand and order design work regularly. I value clear communication, fast turnarounds and designers who ask the right questions before starting.', 'London, UK', 'neon', 4.9, 132, 'Top Buyer'),
('daniel-okafor', 'Daniel Okafor', 'Product manager at a SaaS startup', 'I commission UI mockups, pitch decks and explainer copy for our product team. I like detailed briefs and honest timelines.', 'Lagos, Nigeria', 'neon', 4.8, 58, 'Verified Buyer'),
('sora-tanaka', 'Sora Tanaka', 'Indie game studio lead', 'Repeat client for character art, key visuals and localisation. I usually book several gigs a month and prefer long-term collaborations.', 'Osaka, Japan', 'neon', 5.0, 210, 'Repeat Client');

INSERT INTO public.portfolio_items (profile_id, title, description, tags, sort_order)
SELECT p.id, v.title, v.description, v.tags, v.sort_order FROM public.profiles p
JOIN (VALUES
 ('amelia-brooks', 'Glow Ritual rebrand', 'Full identity refresh for a skincare line — logo, packaging and social kit.', ARRAY['branding','packaging'], 1),
 ('amelia-brooks', 'Launch campaign visuals', 'Paid-social creative set for a spring product launch.', ARRAY['social','ads'], 2),
 ('daniel-okafor', 'Analytics dashboard redesign', 'Clean data-dense dashboard concept for a B2B SaaS product.', ARRAY['ui','saas'], 1),
 ('daniel-okafor', 'Series A pitch deck', '18-slide investor deck with custom illustrations.', ARRAY['deck','illustration'], 2),
 ('sora-tanaka', 'Neon Drift key art', 'Hero key visual for a cyberpunk racing game.', ARRAY['key art','game'], 1),
 ('sora-tanaka', 'Character sheet — Kaito', 'Turnaround and expression sheet for the lead character.', ARRAY['character','concept'], 2)
) AS v(slug, title, description, tags, sort_order) ON v.slug = p.slug;

INSERT INTO public.services (profile_id, title, description, price_usd, delivery_days, category, sort_order)
SELECT p.id, v.title, v.description, v.price, v.days, v.category, v.sort_order FROM public.profiles p
JOIN (VALUES
 ('amelia-brooks', 'Brand strategy consultation', '60-minute call to align positioning, tone and visual direction.', 120.00, 2, 'Consulting', 1),
 ('amelia-brooks', 'Skincare packaging review', 'Detailed feedback on packaging concepts before print.', 60.00, 3, 'Design', 2),
 ('daniel-okafor', 'Product spec writing', 'Turn a rough idea into a developer-ready feature spec.', 90.00, 4, 'Writing', 1),
 ('daniel-okafor', 'UX audit', 'Heuristic review of your web app with prioritised fixes.', 150.00, 5, 'UX', 2),
 ('sora-tanaka', 'Game pitch feedback', 'Studio-lead review of your game pitch and art direction.', 80.00, 3, 'Games', 1),
 ('sora-tanaka', 'Japanese localisation QA', 'Native review of in-game text and store copy.', 110.00, 5, 'Localisation', 2)
) AS v(slug, title, description, price, days, category, sort_order) ON v.slug = p.slug;