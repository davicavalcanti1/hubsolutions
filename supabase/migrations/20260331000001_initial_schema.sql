-- HubSolutions initial schema
-- Bridge model: shared DB for pool-tier companies, dedicated connection string for silo-tier

-- ── Companies ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.companies (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,
  slug                 text NOT NULL UNIQUE,
  email                text,
  phone                text,
  logo_url             text,
  db_tier              text NOT NULL DEFAULT 'pool' CHECK (db_tier IN ('pool', 'silo')),
  db_connection_string text, -- Only for silo-tier companies
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ── Modules ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.modules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key           text NOT NULL UNIQUE,  -- e.g. 'checkin', 'enfermagem', 'controlemidia'
  name          text NOT NULL,
  description   text,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Seed default modules
INSERT INTO public.modules (key, name, description, price_monthly) VALUES
  ('checkin',       'Check-in',          'Sistema de check-in de pacientes',        149.00),
  ('enfermagem',    'Central de Enfermagem', 'Chamados e central de enfermagem',     199.00),
  ('controlemidia', 'Controle de Mídia', 'Gerenciamento de mídia em TVs e painéis', 99.00)
ON CONFLICT (key) DO NOTHING;

-- ── Company Modules (which modules each company has active) ───────────────────
CREATE TABLE IF NOT EXISTS public.company_modules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_key   text NOT NULL REFERENCES public.modules(key),
  active       boolean NOT NULL DEFAULT true,
  activated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, module_key)
);

-- ── Profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'user' CHECK (role IN ('superadmin', 'admin', 'user')),
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Invitations ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  token       text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted    boolean NOT NULL DEFAULT false,
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.companies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations     ENABLE ROW LEVEL SECURITY;

-- Modules: anyone can read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='modules' AND policyname='modules_select_all') THEN
    CREATE POLICY modules_select_all ON public.modules FOR SELECT USING (true);
  END IF;
END $$;

-- Companies: users can read their own company
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='companies' AND policyname='companies_select_own') THEN
    CREATE POLICY companies_select_own ON public.companies FOR SELECT
      USING (id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- Profiles: users can read profiles in their company
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_select_company') THEN
    CREATE POLICY profiles_select_company ON public.profiles FOR SELECT
      USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_insert_own') THEN
    CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT
      WITH CHECK (id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_update_own') THEN
    CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE
      USING (id = auth.uid());
  END IF;
END $$;

-- Company modules: users can read their company's modules
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='company_modules' AND policyname='company_modules_select_own') THEN
    CREATE POLICY company_modules_select_own ON public.company_modules FOR SELECT
      USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- Invitations: admins manage, anyone can read by token (for accept flow)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='invitations' AND policyname='invitations_select_anon') THEN
    CREATE POLICY invitations_select_anon ON public.invitations FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='invitations' AND policyname='invitations_update_anon') THEN
    CREATE POLICY invitations_update_anon ON public.invitations FOR UPDATE USING (true);
  END IF;
END $$;
