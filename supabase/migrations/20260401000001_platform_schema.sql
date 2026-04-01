-- ============================================================
-- HubSolutions — Schema completo
-- Rode no Supabase Dashboard → SQL Editor
-- ============================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Plans ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plans (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name             text NOT NULL UNIQUE,
  storage_limit_bytes bigint NOT NULL,
  max_users        integer DEFAULT 5 NOT NULL,
  price_monthly    numeric(10,2) DEFAULT 0 NOT NULL,
  created_at       timestamptz DEFAULT now() NOT NULL
);

-- ── Companies (clientes da plataforma) ────────────────────────
CREATE TABLE IF NOT EXISTS public.companies (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  email      text,
  phone      text,
  logo_url   text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ── Users (perfis locais — vinculados ao Supabase Auth) ───────
CREATE TABLE IF NOT EXISTS public.users (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  supabase_user_id uuid UNIQUE,
  company_id       uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name        text NOT NULL,
  email            text NOT NULL UNIQUE,
  role             text DEFAULT 'user' NOT NULL,
  avatar_url       text,
  created_at       timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT users_role_check CHECK (role IN ('superadmin','admin','user')),
  CONSTRAINT users_company_role_check CHECK (
    (role = 'superadmin' AND company_id IS NULL) OR
    (role <> 'superadmin' AND company_id IS NOT NULL)
  )
);

-- ── Modules (módulos disponíveis na plataforma) ───────────────
CREATE TABLE IF NOT EXISTS public.modules (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key           text NOT NULL UNIQUE,
  name          text NOT NULL,
  description   text,
  price_monthly numeric(10,2) DEFAULT 0 NOT NULL,
  created_at    timestamptz DEFAULT now() NOT NULL
);

-- ── Company Modules (módulos ativos por empresa) ──────────────
CREATE TABLE IF NOT EXISTS public.company_modules (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_key   text NOT NULL REFERENCES public.modules(key),
  active       boolean DEFAULT true NOT NULL,
  activated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (company_id, module_key)
);

-- ── Invitations ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invitations (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email      text NOT NULL,
  role       text DEFAULT 'user' NOT NULL,
  token      text DEFAULT encode(gen_random_bytes(32), 'hex') NOT NULL UNIQUE,
  accepted   boolean DEFAULT false NOT NULL,
  expires_at timestamptz DEFAULT (now() + interval '7 days') NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT invitations_role_check CHECK (role IN ('admin','user'))
);

-- ── Tenants (empresas gerenciadas pelo developer panel) ───────
-- Nota: companies = quem assina a plataforma
--       tenants   = empresas gerenciadas (podem ser os mesmos clientes)
CREATE TABLE IF NOT EXISTS public.tenants (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name                 text NOT NULL,
  slug                 text NOT NULL UNIQUE,
  email                text,
  plan_id              uuid NOT NULL REFERENCES public.plans(id),
  db_tier              text DEFAULT 'supabase' NOT NULL,
  db_connection_string text,  -- nunca exposto via API
  storage_used_bytes   bigint DEFAULT 0 NOT NULL,
  active               boolean DEFAULT true NOT NULL,
  display_name         text,
  logo_url             text,
  favicon_url          text,
  primary_color        text DEFAULT '#a3e635',
  secondary_color      text DEFAULT '#ffffff',
  created_at           timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT tenants_db_tier_check CHECK (db_tier IN ('supabase','local'))
);

-- ── Tenant Users ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_users (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supabase_user_id uuid NOT NULL UNIQUE,
  full_name        text NOT NULL,
  email            text NOT NULL,
  role             text DEFAULT 'user' NOT NULL,
  created_at       timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT tenant_users_role_check CHECK (role IN ('admin','user'))
);

-- ── Feature Requests ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feature_requests (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  status      text DEFAULT 'pending' NOT NULL,
  votes       integer DEFAULT 1 NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT feature_requests_status_check CHECK (
    status IN ('pending','reviewing','planned','in_progress','done','rejected')
  )
);

-- ── Usage Events ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.usage_events (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type  text NOT NULL,
  table_name  text,
  size_bytes  bigint DEFAULT 0 NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT usage_events_event_type_check CHECK (
    event_type IN ('insert','update','delete','storage_add','storage_remove')
  )
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS feature_requests_tenant_idx  ON public.feature_requests (tenant_id);
CREATE INDEX IF NOT EXISTS feature_requests_status_idx  ON public.feature_requests (status);
CREATE INDEX IF NOT EXISTS usage_events_tenant_id_idx   ON public.usage_events (tenant_id);
CREATE INDEX IF NOT EXISTS usage_events_created_at_idx  ON public.usage_events (created_at);

-- ── Seed: Plans ───────────────────────────────────────────────
INSERT INTO public.plans (name, storage_limit_bytes, max_users, price_monthly) VALUES
  ('free',       524288000,    3,    0.00),
  ('starter',    5368709120,   10,   99.00),
  ('pro',        53687091200,  50,  299.00),
  ('enterprise', 536870912000, -1,  999.00)
ON CONFLICT (name) DO NOTHING;

-- ── Seed: Modules ─────────────────────────────────────────────
INSERT INTO public.modules (key, name, description, price_monthly) VALUES
  ('controlemidia', 'Controle de Mídia',     'Gerenciamento de mídia em TVs e painéis', 99.00),
  ('checkin',       'Check-in',              'Sistema de check-in de pacientes',        149.00),
  ('enfermagem',    'Central de Enfermagem', 'Chamados e central de enfermagem',        199.00)
ON CONFLICT (key) DO NOTHING;

-- ── RLS: desabilitada por padrão (acesso controlado pelo backend) ──
-- O backend usa service_role para contornar RLS quando necessário.
-- Se quiser habilitar RLS no futuro, adicione as políticas abaixo.
ALTER TABLE public.companies       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events    DISABLE ROW LEVEL SECURITY;
