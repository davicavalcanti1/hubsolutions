-- Queue entries
CREATE TABLE IF NOT EXISTS public.checkin_queue (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome                text        NOT NULL,
  cpf                 text,
  telefone            text,
  data_nasc           date,
  sexo                text        CHECK (sexo IN ('M', 'F')),
  tipo_agendamento    text        NOT NULL DEFAULT 'a_agendar'
                                  CHECK (tipo_agendamento IN ('agendado', 'a_agendar')),
  tipo_atendimento    text        NOT NULL DEFAULT 'normal'
                                  CHECK (tipo_atendimento IN ('normal', 'crianca', 'gestante', 'idoso', 'pcd', 'autista')),
  exame_nome          text,
  horario_agendamento timestamptz,
  status              text        NOT NULL DEFAULT 'aguardando'
                                  CHECK (status IN ('aguardando', 'confirmado', 'chegou', 'chamado', 'em_atendimento', 'finalizado', 'ausente')),
  origem              text        DEFAULT 'recepcao'
                                  CHECK (origem IN ('recepcao', 'qr_code', 'casa')),
  fila_virtual        boolean     NOT NULL DEFAULT false,
  checkin_em          timestamptz NOT NULL DEFAULT now(),
  chamado_em          timestamptz,
  atendido_em         timestamptz,
  finalizado_em       timestamptz,
  token_publico       text        NOT NULL UNIQUE DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checkin_queue_company_idx ON public.checkin_queue (company_id);
CREATE INDEX IF NOT EXISTS checkin_queue_status_idx  ON public.checkin_queue (status);
CREATE INDEX IF NOT EXISTS checkin_queue_token_idx   ON public.checkin_queue (token_publico);
CREATE INDEX IF NOT EXISTS checkin_queue_cpf_idx     ON public.checkin_queue (cpf);
CREATE INDEX IF NOT EXISTS checkin_queue_em_idx      ON public.checkin_queue (checkin_em);

-- TV displays for check-in
CREATE TABLE IF NOT EXISTS public.checkin_tvs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  slug          text        NOT NULL UNIQUE,
  active        boolean     NOT NULL DEFAULT true,
  orientacao    text        NOT NULL DEFAULT 'horizontal'
                            CHECK (orientacao IN ('horizontal', 'vertical')),
  last_seen_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checkin_tvs_company_idx ON public.checkin_tvs (company_id);
CREATE INDEX IF NOT EXISTS checkin_tvs_slug_idx    ON public.checkin_tvs (slug);

-- Enable realtime for queue
ALTER PUBLICATION supabase_realtime ADD TABLE public.checkin_queue;

-- ── RLS: checkin_queue ──────────────────────────────────────────────────────

ALTER TABLE public.checkin_queue ENABLE ROW LEVEL SECURITY;

-- Public read (queue tracker by token + totem CPF lookup)
DROP POLICY IF EXISTS checkin_queue_anon_read ON public.checkin_queue;
CREATE POLICY checkin_queue_anon_read ON public.checkin_queue
  FOR SELECT TO anon USING (true);

-- Public insert (totem walk-in check-in)
DROP POLICY IF EXISTS checkin_queue_anon_insert ON public.checkin_queue;
CREATE POLICY checkin_queue_anon_insert ON public.checkin_queue
  FOR INSERT TO anon WITH CHECK (true);

-- Public update (totem "chegou" transition)
DROP POLICY IF EXISTS checkin_queue_anon_update ON public.checkin_queue;
CREATE POLICY checkin_queue_anon_update ON public.checkin_queue
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Authenticated read (staff dashboard)
DROP POLICY IF EXISTS checkin_queue_auth_read ON public.checkin_queue;
CREATE POLICY checkin_queue_auth_read ON public.checkin_queue
  FOR SELECT TO authenticated
  USING (company_id = public.my_company_id() OR public.my_role() = 'superadmin');

-- Authenticated insert/update (staff actions)
DROP POLICY IF EXISTS checkin_queue_auth_write ON public.checkin_queue;
CREATE POLICY checkin_queue_auth_write ON public.checkin_queue
  FOR ALL TO authenticated
  USING (company_id = public.my_company_id() OR public.my_role() = 'superadmin')
  WITH CHECK (company_id = public.my_company_id() OR public.my_role() = 'superadmin');

-- ── RLS: checkin_tvs ────────────────────────────────────────────────────────

ALTER TABLE public.checkin_tvs ENABLE ROW LEVEL SECURITY;

-- Public read (TV display page)
DROP POLICY IF EXISTS checkin_tvs_anon_read ON public.checkin_tvs;
CREATE POLICY checkin_tvs_anon_read ON public.checkin_tvs
  FOR SELECT TO anon USING (true);

-- Public update last_seen_at (heartbeat from TV kiosk)
DROP POLICY IF EXISTS checkin_tvs_anon_update ON public.checkin_tvs;
CREATE POLICY checkin_tvs_anon_update ON public.checkin_tvs
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Authenticated read
DROP POLICY IF EXISTS checkin_tvs_auth_read ON public.checkin_tvs;
CREATE POLICY checkin_tvs_auth_read ON public.checkin_tvs
  FOR SELECT TO authenticated
  USING (company_id = public.my_company_id() OR public.my_role() = 'superadmin');

-- Admin write
DROP POLICY IF EXISTS checkin_tvs_admin_write ON public.checkin_tvs;
CREATE POLICY checkin_tvs_admin_write ON public.checkin_tvs
  FOR ALL TO authenticated
  USING (
    public.my_role() IN ('admin', 'superadmin') AND
    (company_id = public.my_company_id() OR public.my_role() = 'superadmin')
  )
  WITH CHECK (
    public.my_role() IN ('admin', 'superadmin') AND
    (company_id = public.my_company_id() OR public.my_role() = 'superadmin')
  );
