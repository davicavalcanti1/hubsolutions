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
DROP POLICY IF EXISTS "plans_public_read" ON public.plans;
CREATE POLICY "plans_public_read"
  ON public.plans FOR SELECT USING (true);

-- ── modules ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "modules_public_read" ON public.modules;
CREATE POLICY "modules_public_read"
  ON public.modules FOR SELECT USING (true);

-- ── companies ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "companies_public_read_active" ON public.companies;
CREATE POLICY "companies_public_read_active"
  ON public.companies FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "companies_superadmin_all" ON public.companies;
CREATE POLICY "companies_superadmin_all"
  ON public.companies FOR ALL
  USING (public.my_role() = 'superadmin')
  WITH CHECK (public.my_role() = 'superadmin');

-- ── users ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_own_row" ON public.users;
CREATE POLICY "users_own_row"
  ON public.users FOR SELECT
  USING (supabase_user_id = auth.uid());

DROP POLICY IF EXISTS "users_same_company_read" ON public.users;
CREATE POLICY "users_same_company_read"
  ON public.users FOR SELECT
  USING (
    company_id IS NOT NULL
    AND company_id = public.my_company_id()
  );

DROP POLICY IF EXISTS "users_superadmin_all" ON public.users;
CREATE POLICY "users_superadmin_all"
  ON public.users FOR ALL
  USING (public.my_role() = 'superadmin')
  WITH CHECK (public.my_role() = 'superadmin');

-- ── company_modules ───────────────────────────────────────────
DROP POLICY IF EXISTS "company_modules_company_read" ON public.company_modules;
CREATE POLICY "company_modules_company_read"
  ON public.company_modules FOR SELECT
  USING (company_id = public.my_company_id());

DROP POLICY IF EXISTS "company_modules_admin_write" ON public.company_modules;
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

DROP POLICY IF EXISTS "company_modules_superadmin_all" ON public.company_modules;
CREATE POLICY "company_modules_superadmin_all"
  ON public.company_modules FOR ALL
  USING (public.my_role() = 'superadmin')
  WITH CHECK (public.my_role() = 'superadmin');

-- ── invitations ───────────────────────────────────────────────
DROP POLICY IF EXISTS "invitations_anon_token_read" ON public.invitations;
CREATE POLICY "invitations_anon_token_read"
  ON public.invitations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "invitations_admin_insert" ON public.invitations;
CREATE POLICY "invitations_admin_insert"
  ON public.invitations FOR INSERT
  WITH CHECK (
    company_id = public.my_company_id()
    AND public.my_role() IN ('admin', 'superadmin')
  );

-- ── occurrences ───────────────────────────────────────────────
DROP POLICY IF EXISTS "occurrences_company_read" ON public.occurrences;
CREATE POLICY "occurrences_company_read"
  ON public.occurrences FOR SELECT
  USING (company_id = public.my_company_id());

DROP POLICY IF EXISTS "occurrences_company_insert" ON public.occurrences;
CREATE POLICY "occurrences_company_insert"
  ON public.occurrences FOR INSERT
  WITH CHECK (company_id = public.my_company_id());

DROP POLICY IF EXISTS "occurrences_company_update" ON public.occurrences;
CREATE POLICY "occurrences_company_update"
  ON public.occurrences FOR UPDATE
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

DROP POLICY IF EXISTS "occurrences_admin_delete" ON public.occurrences;
CREATE POLICY "occurrences_admin_delete"
  ON public.occurrences FOR DELETE
  USING (
    company_id = public.my_company_id()
    AND public.my_role() IN ('admin', 'superadmin')
  );

-- ── locais ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "locais_company_crud" ON public.locais;
CREATE POLICY "locais_company_crud"
  ON public.locais FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── funcionarios ──────────────────────────────────────────────
DROP POLICY IF EXISTS "funcionarios_company_crud" ON public.funcionarios;
CREATE POLICY "funcionarios_company_crud"
  ON public.funcionarios FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── medicos ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "medicos_company_crud" ON public.medicos;
CREATE POLICY "medicos_company_crud"
  ON public.medicos FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── escalas ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "escalas_company_crud" ON public.escalas;
CREATE POLICY "escalas_company_crud"
  ON public.escalas FOR ALL
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- ── feature_requests ─────────────────────────────────────────
DROP POLICY IF EXISTS "feature_requests_superadmin_all" ON public.feature_requests;
CREATE POLICY "feature_requests_superadmin_all"
  ON public.feature_requests FOR ALL
  USING (public.my_role() = 'superadmin')
  WITH CHECK (public.my_role() = 'superadmin');

DROP POLICY IF EXISTS "feature_requests_company_insert" ON public.feature_requests;
CREATE POLICY "feature_requests_company_insert"
  ON public.feature_requests FOR INSERT
  WITH CHECK (company_id = public.my_company_id());

DROP POLICY IF EXISTS "feature_requests_company_read" ON public.feature_requests;
CREATE POLICY "feature_requests_company_read"
  ON public.feature_requests FOR SELECT
  USING (company_id = public.my_company_id());
