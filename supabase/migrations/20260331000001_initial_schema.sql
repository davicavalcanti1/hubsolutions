-- ============================================================
-- HubSolutions — Migration única completa
-- Supabase (pool tier) + Auth
--
-- Roles:
--   superadmin → acesso total à plataforma (developer)
--   admin      → controla todas as configs da própria empresa
--   user       → acessa apenas os módulos ativos da empresa
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Helper functions ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin');
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_above()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('superadmin','admin'));
$$;

-- ── Plans ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plans (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text          NOT NULL UNIQUE,
  storage_limit_bytes bigint        NOT NULL,
  max_users           int           NOT NULL DEFAULT 5,
  price_monthly       numeric(10,2) NOT NULL DEFAULT 0,
  created_at          timestamptz   NOT NULL DEFAULT now()
);

INSERT INTO public.plans (name, storage_limit_bytes, max_users, price_monthly) VALUES
  ('free',       524288000,    3,   0.00),
  ('starter',    5368709120,   10,  99.00),
  ('pro',        53687091200,  50,  299.00),
  ('enterprise', 536870912000, -1,  999.00)
ON CONFLICT (name) DO NOTHING;

-- ── Tenants ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenants (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text          NOT NULL,
  slug                 text          NOT NULL UNIQUE,
  email                text,
  plan_id              uuid          NOT NULL REFERENCES public.plans(id),
  db_tier              text          NOT NULL DEFAULT 'supabase'
                                     CHECK (db_tier IN ('supabase','local')),
  db_connection_string text,
  storage_used_bytes   bigint        NOT NULL DEFAULT 0,
  display_name         text,
  logo_url             text,
  favicon_url          text,
  primary_color        text          NOT NULL DEFAULT '#a3e635',
  secondary_color      text          NOT NULL DEFAULT '#ffffff',
  active               boolean       NOT NULL DEFAULT true,
  created_at           timestamptz   NOT NULL DEFAULT now()
);

-- ── Profiles ──────────────────────────────────────────────────────────────────
-- Liga auth.users ao tenant + define o role do usuário.
-- superadmin pode ter tenant_id NULL (acesso global).
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   uuid        REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name   text        NOT NULL,
  email       text        NOT NULL,
  role        text        NOT NULL DEFAULT 'user'
                          CHECK (role IN ('superadmin','admin','user')),
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Modules ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.modules (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  key           text          NOT NULL UNIQUE,
  name          text          NOT NULL,
  description   text,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  created_at    timestamptz   NOT NULL DEFAULT now()
);

INSERT INTO public.modules (key, name, description, price_monthly) VALUES
  ('screenflow', 'ScreenFlow', 'Gestão de conteúdo para telas e painéis digitais',    99.00),
  ('flowdesk',   'FlowDesk',   'Recepção e check-in digital inteligente de pacientes', 149.00),
  ('nurselink',  'NurseLink',  'Central de chamados clínicos em tempo real',           199.00)
ON CONFLICT (key) DO NOTHING;

-- ── Company modules ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.company_modules (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_key   text        NOT NULL REFERENCES public.modules(key),
  active       boolean     NOT NULL DEFAULT true,
  activated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, module_key)
);

-- ── Invitations ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invitations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email       text        NOT NULL,
  role        text        NOT NULL DEFAULT 'user'
                          CHECK (role IN ('admin','user')),
  token       text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32),'hex'),
  accepted    boolean     NOT NULL DEFAULT false,
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Usage events ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.usage_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type   text        NOT NULL
                           CHECK (event_type IN ('insert','update','delete','storage_add','storage_remove')),
  table_name   text,
  size_bytes   bigint      NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usage_events_tenant_idx  ON public.usage_events(tenant_id);
CREATE INDEX IF NOT EXISTS usage_events_created_idx ON public.usage_events(created_at);

-- ── Feature requests ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feature_requests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  description text,
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','reviewing','planned','in_progress','done','rejected')),
  votes       int         NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feature_requests_status_idx ON public.feature_requests(status);
CREATE INDEX IF NOT EXISTS feature_requests_tenant_idx ON public.feature_requests(tenant_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.plans            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_modules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

-- ── plans ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='plans' AND policyname='plans_select_public') THEN
    CREATE POLICY plans_select_public ON public.plans FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='plans' AND policyname='plans_write_superadmin') THEN
    CREATE POLICY plans_write_superadmin ON public.plans FOR ALL
      USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());
  END IF;
END $$;

-- ── tenants ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenants' AND policyname='tenants_all_superadmin') THEN
    CREATE POLICY tenants_all_superadmin ON public.tenants FOR ALL
      USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());
  END IF;
END $$;
-- Leitura pública (slug, display_name, cores) — necessário para hub /:slug sem login
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenants' AND policyname='tenants_select_anon') THEN
    CREATE POLICY tenants_select_anon ON public.tenants FOR SELECT
      TO anon USING (active = true);
  END IF;
END $$;
-- Autenticado lê apenas o próprio tenant
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenants' AND policyname='tenants_select_own') THEN
    CREATE POLICY tenants_select_own ON public.tenants FOR SELECT
      USING (id = public.current_tenant_id());
  END IF;
END $$;
-- Admin atualiza o próprio tenant (white-label, configs)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenants' AND policyname='tenants_update_admin') THEN
    CREATE POLICY tenants_update_admin ON public.tenants FOR UPDATE
      USING (id = public.current_tenant_id() AND public.is_admin_or_above())
      WITH CHECK (id = public.current_tenant_id() AND public.is_admin_or_above());
  END IF;
END $$;

-- ── profiles ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_all_superadmin') THEN
    CREATE POLICY profiles_all_superadmin ON public.profiles FOR ALL
      USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());
  END IF;
END $$;
-- Lê profiles do próprio tenant (ou o seu próprio)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_select_tenant') THEN
    CREATE POLICY profiles_select_tenant ON public.profiles FOR SELECT
      USING (tenant_id = public.current_tenant_id() OR id = auth.uid());
  END IF;
END $$;
-- Qualquer um cria o próprio profile (signup)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_insert_own') THEN
    CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT
      WITH CHECK (id = auth.uid());
  END IF;
END $$;
-- User atualiza apenas o próprio; admin atualiza qualquer um do tenant
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_update') THEN
    CREATE POLICY profiles_update ON public.profiles FOR UPDATE
      USING (
        id = auth.uid()
        OR (tenant_id = public.current_tenant_id() AND public.is_admin_or_above())
      );
  END IF;
END $$;
-- Admin remove membros (não pode remover a si mesmo)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_delete_admin') THEN
    CREATE POLICY profiles_delete_admin ON public.profiles FOR DELETE
      USING (
        tenant_id = public.current_tenant_id()
        AND public.is_admin_or_above()
        AND id <> auth.uid()
      );
  END IF;
END $$;

-- ── modules ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='modules' AND policyname='modules_select_all') THEN
    CREATE POLICY modules_select_all ON public.modules FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='modules' AND policyname='modules_write_superadmin') THEN
    CREATE POLICY modules_write_superadmin ON public.modules FOR ALL
      USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());
  END IF;
END $$;

-- ── company_modules ───────────────────────────────────────────────────────────
-- Anon lê módulos ativos (hub público /:slug)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='company_modules' AND policyname='company_modules_select_anon') THEN
    CREATE POLICY company_modules_select_anon ON public.company_modules FOR SELECT
      TO anon USING (active = true);
  END IF;
END $$;
-- Autenticado lê módulos do próprio tenant
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='company_modules' AND policyname='company_modules_select_tenant') THEN
    CREATE POLICY company_modules_select_tenant ON public.company_modules FOR SELECT
      USING (tenant_id = public.current_tenant_id());
  END IF;
END $$;
-- Apenas admin gerencia módulos
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='company_modules' AND policyname='company_modules_write_admin') THEN
    CREATE POLICY company_modules_write_admin ON public.company_modules FOR ALL
      USING (tenant_id = public.current_tenant_id() AND public.is_admin_or_above())
      WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_admin_or_above());
  END IF;
END $$;

-- ── invitations ───────────────────────────────────────────────────────────────
-- Anon lê por token (aceitar convite sem login)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='invitations' AND policyname='invitations_select_anon') THEN
    CREATE POLICY invitations_select_anon ON public.invitations FOR SELECT
      TO anon USING (true);
  END IF;
END $$;
-- Autenticado lê convites do próprio tenant
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='invitations' AND policyname='invitations_select_tenant') THEN
    CREATE POLICY invitations_select_tenant ON public.invitations FOR SELECT
      USING (tenant_id = public.current_tenant_id());
  END IF;
END $$;
-- Apenas admin cria convites
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='invitations' AND policyname='invitations_insert_admin') THEN
    CREATE POLICY invitations_insert_admin ON public.invitations FOR INSERT
      WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_admin_or_above());
  END IF;
END $$;
-- Anon aceita convite (marca accepted = true via token)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='invitations' AND policyname='invitations_accept_anon') THEN
    CREATE POLICY invitations_accept_anon ON public.invitations FOR UPDATE
      TO anon USING (accepted = false AND expires_at > now());
  END IF;
END $$;
-- Admin deleta convites do próprio tenant
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='invitations' AND policyname='invitations_delete_admin') THEN
    CREATE POLICY invitations_delete_admin ON public.invitations FOR DELETE
      USING (tenant_id = public.current_tenant_id() AND public.is_admin_or_above());
  END IF;
END $$;

-- ── usage_events ──────────────────────────────────────────────────────────────
-- Admin lê uso do próprio tenant; superadmin lê tudo
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='usage_events' AND policyname='usage_events_select_admin') THEN
    CREATE POLICY usage_events_select_admin ON public.usage_events FOR SELECT
      USING (
        public.is_superadmin()
        OR (tenant_id = public.current_tenant_id() AND public.is_admin_or_above())
      );
  END IF;
END $$;
-- Inserção pelo backend (service_role bypassa RLS)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='usage_events' AND policyname='usage_events_insert_any') THEN
    CREATE POLICY usage_events_insert_any ON public.usage_events FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- ── feature_requests ──────────────────────────────────────────────────────────
-- Superadmin lê tudo
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='feature_requests' AND policyname='feature_requests_superadmin') THEN
    CREATE POLICY feature_requests_superadmin ON public.feature_requests FOR ALL
      USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());
  END IF;
END $$;
-- Tenant lê as próprias sugestões (admin e user)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='feature_requests' AND policyname='feature_requests_select_tenant') THEN
    CREATE POLICY feature_requests_select_tenant ON public.feature_requests FOR SELECT
      USING (tenant_id = public.current_tenant_id());
  END IF;
END $$;
-- Admin e user criam sugestões para o próprio tenant
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='feature_requests' AND policyname='feature_requests_insert_tenant') THEN
    CREATE POLICY feature_requests_insert_tenant ON public.feature_requests FOR INSERT
      WITH CHECK (tenant_id = public.current_tenant_id());
  END IF;
END $$;
-- Tenant pode votar (update votes) nas próprias sugestões
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='feature_requests' AND policyname='feature_requests_vote_tenant') THEN
    CREATE POLICY feature_requests_vote_tenant ON public.feature_requests FOR UPDATE
      USING (tenant_id = public.current_tenant_id());
  END IF;
END $$;

-- ── Trigger: atualiza storage_used_bytes no tenant ────────────────────────────
CREATE OR REPLACE FUNCTION public.update_tenant_storage()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.event_type IN ('storage_add','insert') AND NEW.size_bytes > 0 THEN
    UPDATE public.tenants
    SET storage_used_bytes = GREATEST(0, storage_used_bytes + NEW.size_bytes)
    WHERE id = NEW.tenant_id;
  ELSIF NEW.event_type IN ('storage_remove','delete') AND NEW.size_bytes > 0 THEN
    UPDATE public.tenants
    SET storage_used_bytes = GREATEST(0, storage_used_bytes - NEW.size_bytes)
    WHERE id = NEW.tenant_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_tenant_storage ON public.usage_events;
CREATE TRIGGER trg_update_tenant_storage
  AFTER INSERT ON public.usage_events
  FOR EACH ROW EXECUTE FUNCTION public.update_tenant_storage();
