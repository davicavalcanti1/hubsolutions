-- ── RLS Policies ──────────────────────────────────────────────────────────────
-- Enable RLS on all tables
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans            ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_modules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE occurrences      ENABLE ROW LEVEL SECURITY;
ALTER TABLE locais           ENABLE ROW LEVEL SECURITY;
ALTER TABLE funcionarios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;

-- ── Helper functions ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT company_id FROM users WHERE supabase_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM users WHERE supabase_user_id = auth.uid() LIMIT 1;
$$;

-- ── companies ─────────────────────────────────────────────────────────────────
-- Active companies are readable by anyone (anon included — needed for slug lookup)
CREATE POLICY "companies_public_read_active"
  ON companies FOR SELECT
  USING (active = true);

-- Superadmin sees all companies (including inactive)
CREATE POLICY "companies_superadmin_all"
  ON companies FOR ALL
  USING (my_role() = 'superadmin')
  WITH CHECK (my_role() = 'superadmin');

-- ── plans ─────────────────────────────────────────────────────────────────────
CREATE POLICY "plans_public_read"
  ON plans FOR SELECT
  USING (true);

-- ── modules ───────────────────────────────────────────────────────────────────
CREATE POLICY "modules_public_read"
  ON modules FOR SELECT
  USING (true);

-- ── users ─────────────────────────────────────────────────────────────────────
-- Own row is always readable
CREATE POLICY "users_own_row"
  ON users FOR SELECT
  USING (supabase_user_id = auth.uid());

-- Same-company users are readable
CREATE POLICY "users_same_company_read"
  ON users FOR SELECT
  USING (
    company_id IS NOT NULL
    AND company_id = my_company_id()
  );

-- Superadmin sees all
CREATE POLICY "users_superadmin_all"
  ON users FOR ALL
  USING (my_role() = 'superadmin')
  WITH CHECK (my_role() = 'superadmin');

-- Service role can do everything (insert/delete for edge functions)
-- (service_role bypasses RLS by default, no explicit policy needed)

-- ── company_modules ───────────────────────────────────────────────────────────
CREATE POLICY "company_modules_company_read"
  ON company_modules FOR SELECT
  USING (company_id = my_company_id());

CREATE POLICY "company_modules_superadmin_all"
  ON company_modules FOR ALL
  USING (my_role() = 'superadmin')
  WITH CHECK (my_role() = 'superadmin');

-- Admins of the company can also upsert their own modules
CREATE POLICY "company_modules_admin_write"
  ON company_modules FOR ALL
  USING (
    company_id = my_company_id()
    AND my_role() IN ('admin', 'superadmin')
  )
  WITH CHECK (
    company_id = my_company_id()
    AND my_role() IN ('admin', 'superadmin')
  );

-- ── occurrences ───────────────────────────────────────────────────────────────
CREATE POLICY "occurrences_company_read"
  ON occurrences FOR SELECT
  USING (company_id = my_company_id());

CREATE POLICY "occurrences_company_insert"
  ON occurrences FOR INSERT
  WITH CHECK (company_id = my_company_id());

CREATE POLICY "occurrences_company_update"
  ON occurrences FOR UPDATE
  USING (company_id = my_company_id())
  WITH CHECK (company_id = my_company_id());

-- Only admin/superadmin can delete occurrences
CREATE POLICY "occurrences_admin_delete"
  ON occurrences FOR DELETE
  USING (
    company_id = my_company_id()
    AND my_role() IN ('admin', 'superadmin')
  );

-- ── locais ────────────────────────────────────────────────────────────────────
CREATE POLICY "locais_company_crud"
  ON locais FOR ALL
  USING (company_id = my_company_id())
  WITH CHECK (company_id = my_company_id());

-- ── funcionarios ──────────────────────────────────────────────────────────────
CREATE POLICY "funcionarios_company_crud"
  ON funcionarios FOR ALL
  USING (company_id = my_company_id())
  WITH CHECK (company_id = my_company_id());

-- ── medicos ───────────────────────────────────────────────────────────────────
CREATE POLICY "medicos_company_crud"
  ON medicos FOR ALL
  USING (company_id = my_company_id())
  WITH CHECK (company_id = my_company_id());

-- ── escalas ───────────────────────────────────────────────────────────────────
CREATE POLICY "escalas_company_crud"
  ON escalas FOR ALL
  USING (company_id = my_company_id())
  WITH CHECK (company_id = my_company_id());

-- ── feature_requests ─────────────────────────────────────────────────────────
-- Superadmin can CRUD all
CREATE POLICY "feature_requests_superadmin_all"
  ON feature_requests FOR ALL
  USING (my_role() = 'superadmin')
  WITH CHECK (my_role() = 'superadmin');

-- Company members can insert their own requests
CREATE POLICY "feature_requests_company_insert"
  ON feature_requests FOR INSERT
  WITH CHECK (company_id = my_company_id());

-- Company members can read their own requests
CREATE POLICY "feature_requests_company_read"
  ON feature_requests FOR SELECT
  USING (company_id = my_company_id());

-- ── invitations ───────────────────────────────────────────────────────────────
-- Company members can read their own invitations
CREATE POLICY "invitations_company_read"
  ON invitations FOR SELECT
  USING (company_id = my_company_id());

-- Admins can insert invitations for their company
CREATE POLICY "invitations_admin_insert"
  ON invitations FOR INSERT
  WITH CHECK (
    company_id = my_company_id()
    AND my_role() IN ('admin', 'superadmin')
  );

-- Allow anon to read invitation by token (for the accept-invite page)
CREATE POLICY "invitations_anon_token_read"
  ON invitations FOR SELECT
  USING (true);
