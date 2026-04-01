-- ── Occurrences ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS occurrences (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  protocolo        TEXT        NOT NULL,
  tipo             TEXT        NOT NULL,
  subtipo          TEXT,
  status           TEXT        NOT NULL DEFAULT 'registrada',
  triagem          TEXT,
  triagem_por      TEXT,
  triagem_em       TIMESTAMPTZ,
  dados            JSONB       NOT NULL DEFAULT '{}',
  desfecho         JSONB,
  historico_status JSONB       NOT NULL DEFAULT '[]',
  criado_por       UUID        REFERENCES users(id) ON DELETE SET NULL,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS occurrences_company_id_idx ON occurrences (company_id);
CREATE INDEX IF NOT EXISTS occurrences_status_idx      ON occurrences (status);
CREATE INDEX IF NOT EXISTS occurrences_tipo_idx        ON occurrences (tipo);
CREATE INDEX IF NOT EXISTS occurrences_criado_em_idx   ON occurrences (criado_em DESC);

-- Auto-update atualizado_em
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER occurrences_atualizado_em
  BEFORE UPDATE ON occurrences
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

-- ── Locais ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS locais (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome        TEXT        NOT NULL,
  descricao   TEXT,
  ativo       BOOLEAN     NOT NULL DEFAULT true,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS locais_company_id_idx ON locais (company_id);

-- ── Funcionários ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS funcionarios (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome        TEXT        NOT NULL,
  cargo       TEXT,
  setor       TEXT,
  email       TEXT,
  telefone    TEXT,
  ativo       BOOLEAN     NOT NULL DEFAULT true,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS funcionarios_company_id_idx ON funcionarios (company_id);

-- ── Médicos ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS medicos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome          TEXT        NOT NULL,
  crm           TEXT,
  especialidade TEXT,
  email         TEXT,
  telefone      TEXT,
  ativo         BOOLEAN     NOT NULL DEFAULT true,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS medicos_company_id_idx ON medicos (company_id);

-- ── Escalas ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS escalas (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome          TEXT        NOT NULL,
  mes           INTEGER     NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano           INTEGER     NOT NULL CHECK (ano >= 2020),
  local_id      UUID        REFERENCES locais(id) ON DELETE SET NULL,
  dados         JSONB       NOT NULL DEFAULT '{}',
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS escalas_company_id_idx ON escalas (company_id);
CREATE INDEX IF NOT EXISTS escalas_mes_ano_idx    ON escalas (ano DESC, mes DESC);

CREATE TRIGGER escalas_atualizado_em
  BEFORE UPDATE ON escalas
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
