-- ============================================================
-- Migration 3: Consolidate companies ← tenants
-- A tabela `companies` passa a ser o único source of truth.
-- O developer panel e o hub passam a usar `companies`.
-- ============================================================

-- 1. Adicionar colunas que existiam só em `tenants`
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS plan_id              uuid REFERENCES public.plans(id),
  ADD COLUMN IF NOT EXISTS display_name         text,
  ADD COLUMN IF NOT EXISTS logo_url_extended    text,  -- já existe logo_url, este é alias compatível
  ADD COLUMN IF NOT EXISTS favicon_url          text,
  ADD COLUMN IF NOT EXISTS primary_color        text DEFAULT '#a3e635',
  ADD COLUMN IF NOT EXISTS secondary_color      text DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS active               boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS storage_used_bytes   bigint DEFAULT 0 NOT NULL;

-- 2. Definir plano padrão 'free' para companies sem plan_id
UPDATE public.companies
SET plan_id = (SELECT id FROM public.plans WHERE name = 'free' LIMIT 1)
WHERE plan_id IS NULL;

-- 3. Tornar plan_id NOT NULL após preencher
ALTER TABLE public.companies
  ALTER COLUMN plan_id SET NOT NULL;

-- 4. feature_requests: adicionar company_id (substitui tenant_id)
ALTER TABLE public.feature_requests
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS feature_requests_company_idx ON public.feature_requests (company_id);

-- 6. usage_events: adicionar company_id
ALTER TABLE public.usage_events
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS usage_events_company_idx ON public.usage_events (company_id);

-- 7. Índices úteis
CREATE INDEX IF NOT EXISTS companies_slug_idx   ON public.companies (slug);
CREATE INDEX IF NOT EXISTS companies_active_idx ON public.companies (active);
