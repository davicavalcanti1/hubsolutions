-- ============================================================
-- HubSolutions — RLS
-- Migration 2/2: Habilita RLS + helper functions + políticas
-- ============================================================

-- ── Habilita RLS ──────────────────────────────────────────────
ALTER TABLE public.plans            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_modules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrences      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locais           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

-- ── Helper functions ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT company_id FROM public.users WHERE supabase_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.users WHERE supabase_user_id = auth.uid() LIMIT 1;
$$;

-- ── plans ─────────────────────────────────────────────────────
CREATE POLICY "plans_public_read"
  ON public.plans FOR SELECT USING (true);

-- ── modules ───────────────────────────────────────────────────
CREATE POLICY "modules_public_read"
  ON public.modules FOR SELECT USING (true);

-- ── companies ─────────────────────────────────────────────────
-- Anon e autenticado leem empresas ativas (necessário para hub /:slug)
CREATE POLICY "companies_public_read_active"
  ON public.companies FOR SELECT
  USING (active = true);

-- Superadmin vê e gerencia tudo (incluindo inativas)
CREATE POLICY "companies_superadmin_all"
  ON public.companies FOR ALL
  USING (public.my_role() = 'superadmin')
  WITH CHECK (public.my_role() = 'superadmin');

-- ── users ─────────────────────────────────────────────────────
-- Cada usuário lê o próprio registro
CREATE POLICY "users_own_row"
  ON public.users FOR SELECT
  USING (supabase_user_id = auth.uid());

-- Usuários da mesma empresa se veem
CREATE POLICY "users_same_company_read"
  ON public.users FOR SELECT
  USING (
    company_id IS NOT NULL
    AND company_id = public.my_company_id()
  );

-- Superadmin gerencia tudo
CREATE POLICY "users_superadmin_all"
  ON public.users FOR ALL
  USING (public.my_role() = 'superadmin')
  WITH CHECK (public.my_role() = 'superadmin');

-- ── company_modules ───────────────────────────────────────────
-- Membros da empresa leem seus módulos
CREATE POLICY "company_modules_company_read"
  ON public.company_modules FOR SELECT
  USING (company_id = public.my_company_id());

-- Admin da empresa gerencia módulos
CREATE POLICY "company_modules_admin_write"
  ON public.company_modules FOR ALL
  USING (
    company_id = public.my_company_id()
    AND public.my_role() IN ('admin', 'superadmin')
  )
  WITH CHECK (
    company_id = public.my_company_id()
    AND public.my_role() IN ('admin', 'superadmin')
  );

-- Superadmin gerencia tudo
CREATE POLICY "company_modules_superadmin_all"
  ON public.company_modules FOR ALL
  USING (public.my_role() = 'superadmin')
  WITH CHECK (public.my_role() = 'superadmin');

-- ── invitations ───────────────────────────────────────────────
-- Qualquer um pode ler convites por token (página accept-invite sem login)
CREATE POLICY "invitations_anon_token_read"
  ON public.invitations FOR SELECT
  USING (true);

-- Admin da empresa cria convites
CREATE POLICY "invitations_admin_insert"
  ON public.invitations FOR INSERT
  WITH CHECK (
    company_id = public.my_company_id()
    AND public.my_role() IN ('admin', 'superadmin')
  );

-- ── occurrences ───────────────────────────────────────────────
CREATE POLICY "occurrences_company_read"
  ON public.occurrences FOR SELECT
  USING (company_id = public.my_company_id());

CREATE POLICY "occurrences_company_insert"
  ON public.occurrences FOR INSERT
  WITH CHECK (company_id = public.my_company_id());

CREATE POLICY "occurrences_company_update"
  ON public.occurrences FOR UPDATE
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

CREATE POLICY "occurrences_admin_delete"
  ON public.occurrences FOR DELETE
  USING (
    company_id = public.my_company_id()
    AND public.my_role() IN ('admin', 'superadmin')
  );

-- ── locais ────────────────────────────────────────────────────
CREATE POLICY "locais_company_crud"
  ON public.locais FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── funcionarios ──────────────────────────────────────────────
CREATE POLICY "funcionarios_company_crud"
  ON public.funcionarios FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── medicos ───────────────────────────────────────────────────
CREATE POLICY "medicos_company_crud"
  ON public.medicos FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── escalas ───────────────────────────────────────────────────
CREATE POLICY "escalas_company_crud"
  ON public.escalas FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── feature_requests ─────────────────────────────────────────
-- Superadmin gerencia tudo
CREATE POLICY "feature_requests_superadmin_all"
  ON public.feature_requests FOR ALL
  USING (public.my_role() = 'superadmin')
  WITH CHECK (public.my_role() = 'superadmin');

-- Membros da empresa criam e leem as próprias sugestões
CREATE POLICY "feature_requests_company_insert"
  ON public.feature_requests FOR INSERT
  WITH CHECK (company_id = public.my_company_id());

CREATE POLICY "feature_requests_company_read"
  ON public.feature_requests FOR SELECT
  USING (company_id = public.my_company_id());
