-- ============================================================
-- HubSolutions — Schema completo
-- Migration 1/2: Tabelas, índices, seeds
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Plans ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plans (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text          NOT NULL UNIQUE,
  storage_limit_bytes bigint        NOT NULL,
  max_users           integer       NOT NULL DEFAULT 5,
  price_monthly       numeric(10,2) NOT NULL DEFAULT 0,
  created_at          timestamptz   NOT NULL DEFAULT now()
);

INSERT INTO public.plans (name, storage_limit_bytes, max_users, price_monthly) VALUES
  ('free',       524288000,    3,    0.00),
  ('starter',    5368709120,   10,   99.00),
  ('pro',        53687091200,  50,  299.00),
  ('enterprise', 536870912000, -1,  999.00)
ON CONFLICT (name) DO NOTHING;

-- ── Companies ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.companies (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text          NOT NULL,
  slug                text          NOT NULL UNIQUE,
  email               text,
  phone               text,
  logo_url            text,
  plan_id             uuid          REFERENCES public.plans(id),
  display_name        text,
  favicon_url         text,
  primary_color       text          NOT NULL DEFAULT '#3b82f6',
  secondary_color     text          NOT NULL DEFAULT '#ffffff',
  active              boolean       NOT NULL DEFAULT true,
  storage_used_bytes  bigint        NOT NULL DEFAULT 0,
  created_at          timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS companies_slug_idx   ON public.companies (slug);
CREATE INDEX IF NOT EXISTS companies_active_idx ON public.companies (active);

-- ── Users ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_user_id uuid        UNIQUE,
  company_id       uuid        REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name        text        NOT NULL,
  email            text        NOT NULL UNIQUE,
  role             text        NOT NULL DEFAULT 'user'
                               CHECK (role IN ('superadmin', 'admin', 'user')),
  avatar_url       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_company_role_check CHECK (
    (role = 'superadmin' AND company_id IS NULL) OR
    (role <> 'superadmin' AND company_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS users_supabase_user_id_idx ON public.users (supabase_user_id);
CREATE INDEX IF NOT EXISTS users_company_id_idx       ON public.users (company_id);

-- ── Modules ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.modules (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  key           text          NOT NULL UNIQUE,
  name          text          NOT NULL,
  description   text,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  created_at    timestamptz   NOT NULL DEFAULT now()
);

INSERT INTO public.modules (key, name, description, price_monthly) VALUES
  ('controlemidia', 'Controle de Mídia',     'Gerenciamento de mídia em TVs e painéis digitais',   99.00),
  ('checkin',       'Check-in',              'Sistema de check-in de pacientes',                   149.00),
  ('enfermagem',    'Central de Enfermagem', 'Chamados e central de enfermagem em tempo real',     199.00),
  ('ocorrencias',   'Ocorrências',           'Registro e controle de ocorrências operacionais',    149.00),
  ('escala',        'Escala',                'Gestão de escalas, locais, funcionários e médicos',  199.00)
ON CONFLICT (key) DO NOTHING;

-- ── Company Modules ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.company_modules (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_key   text        NOT NULL REFERENCES public.modules(key),
  active       boolean     NOT NULL DEFAULT true,
  activated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, module_key)
);

CREATE INDEX IF NOT EXISTS company_modules_company_id_idx ON public.company_modules (company_id);

-- ── Invitations ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invitations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email      text        NOT NULL,
  role       text        NOT NULL DEFAULT 'user'
                         CHECK (role IN ('admin', 'user')),
  token      text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted   boolean     NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invitations_token_idx      ON public.invitations (token);
CREATE INDEX IF NOT EXISTS invitations_company_id_idx ON public.invitations (company_id);

-- ── Occurrences ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.occurrences (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocolo        text        NOT NULL,
  tipo             text        NOT NULL,
  subtipo          text,
  status           text        NOT NULL DEFAULT 'registrada',
  triagem          text,
  triagem_por      text,
  triagem_em       timestamptz,
  dados            jsonb       NOT NULL DEFAULT '{}',
  desfecho         jsonb,
  historico_status jsonb       NOT NULL DEFAULT '[]',
  criado_por       uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  atualizado_em    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS occurrences_company_id_idx ON public.occurrences (company_id);
CREATE INDEX IF NOT EXISTS occurrences_status_idx     ON public.occurrences (status);
CREATE INDEX IF NOT EXISTS occurrences_criado_em_idx  ON public.occurrences (criado_em DESC);

CREATE OR REPLACE FUNCTION public.update_atualizado_em()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS occurrences_atualizado_em ON public.occurrences;
CREATE TRIGGER occurrences_atualizado_em
  BEFORE UPDATE ON public.occurrences
  FOR EACH ROW EXECUTE FUNCTION public.update_atualizado_em();

-- ── Locais ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.locais (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome       text        NOT NULL,
  descricao  text,
  ativo      boolean     NOT NULL DEFAULT true,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS locais_company_id_idx ON public.locais (company_id);

-- ── Funcionários ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.funcionarios (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome       text        NOT NULL,
  cargo      text,
  setor      text,
  email      text,
  telefone   text,
  ativo      boolean     NOT NULL DEFAULT true,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS funcionarios_company_id_idx ON public.funcionarios (company_id);

-- ── Médicos ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.medicos (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome          text        NOT NULL,
  crm           text,
  especialidade text,
  email         text,
  telefone      text,
  ativo         boolean     NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS medicos_company_id_idx ON public.medicos (company_id);

-- ── Escalas ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.escalas (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome          text        NOT NULL,
  mes           integer     NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano           integer     NOT NULL CHECK (ano >= 2020),
  local_id      uuid        REFERENCES public.locais(id) ON DELETE SET NULL,
  dados         jsonb       NOT NULL DEFAULT '{}',
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS escalas_company_id_idx ON public.escalas (company_id);
CREATE INDEX IF NOT EXISTS escalas_mes_ano_idx    ON public.escalas (ano DESC, mes DESC);

DROP TRIGGER IF EXISTS escalas_atualizado_em ON public.escalas;
CREATE TRIGGER escalas_atualizado_em
  BEFORE UPDATE ON public.escalas
  FOR EACH ROW EXECUTE FUNCTION public.update_atualizado_em();

-- ── Feature Requests ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feature_requests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid        REFERENCES public.companies(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  description text,
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','reviewing','planned','in_progress','done','rejected')),
  votes       integer     NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feature_requests_company_id_idx ON public.feature_requests (company_id);
CREATE INDEX IF NOT EXISTS feature_requests_status_idx     ON public.feature_requests (status);

-- ── RLS desabilitado por padrão (migration 2 habilita) ────────
ALTER TABLE public.plans            DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users            DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_modules  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrences      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.locais           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicos          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalas          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_requests DISABLE ROW LEVEL SECURITY;
