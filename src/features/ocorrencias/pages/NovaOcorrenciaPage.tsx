import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantTheme } from "@/features/tenant/context/TenantThemeContext";
import type { OccurrenceType, OccurrenceSubtype } from "../types/occurrence";
import { subtypesByType, typeLabels, subtypeLabels } from "../types/occurrence";
import {
  Briefcase, Stethoscope, FileText, UserRound, AlignLeft, ShieldAlert,
  ChevronRight, CheckCircle2, Loader2,
} from "lucide-react";

const TYPE_ICONS: Record<OccurrenceType, React.ComponentType<{ className?: string }>> = {
  administrativa:     Briefcase,
  revisao_exame:      FileText,
  enfermagem:         Stethoscope,
  paciente:           UserRound,
  livre:              AlignLeft,
  seguranca_paciente: ShieldAlert,
};

const TYPE_COLORS: Record<OccurrenceType, { bg: string; icon: string }> = {
  administrativa:     { bg: "bg-amber-50 border-amber-200",   icon: "text-amber-600"  },
  revisao_exame:      { bg: "bg-sky-50 border-sky-200",       icon: "text-sky-600"    },
  enfermagem:         { bg: "bg-emerald-50 border-emerald-200", icon: "text-emerald-600" },
  paciente:           { bg: "bg-violet-50 border-violet-200", icon: "text-violet-600" },
  livre:              { bg: "bg-slate-50 border-slate-200",   icon: "text-slate-500"  },
  seguranca_paciente: { bg: "bg-red-50 border-red-200",       icon: "text-red-600"    },
};

type Step = "type" | "subtype" | "form" | "done";

interface FormData {
  tipo: OccurrenceType | null;
  subtipo: OccurrenceSubtype | null;
  setor: string;
  cargo: string;
  unidadeLocal: string;
  dataHoraEvento: string;
  pacienteNome: string;
  descricaoDetalhada: string;
  acaoImediata: string;
  houveDano: boolean;
  descricaoDano: string;
  observacoes: string;
}

const INITIAL: FormData = {
  tipo: null, subtipo: null,
  setor: "", cargo: "", unidadeLocal: "", dataHoraEvento: "",
  pacienteNome: "", descricaoDetalhada: "", acaoImediata: "",
  houveDano: false, descricaoDano: "", observacoes: "",
};

function genProtocolo(tipo: OccurrenceType): string {
  const prefix: Record<OccurrenceType, string> = {
    administrativa:     "ADM",
    revisao_exame:      "REX",
    enfermagem:         "ENF",
    paciente:           "PAC",
    livre:              "LIV",
    seguranca_paciente: "SEG",
  };
  const ts = Date.now().toString(36).toUpperCase();
  return `${prefix[tipo] ?? "OCC"}-${ts}`;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-slate-600 mb-1.5">{children}</label>;
}

function TextInput({ value, onChange, type = "text", placeholder, className = "" }: {
  value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 ${className}`}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 resize-none"
    />
  );
}

export function NovaOcorrenciaPage() {
  const { slug } = useParams<{ slug: string }>();
  const { theme } = useTenantTheme();
  const { user } = useAuth();
  const primary = theme?.primary_color ?? "#2563eb";

  const [step, setStep] = useState<Step>("type");
  const [form, setForm] = useState<FormData>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const subtypes    = form.tipo ? subtypesByType[form.tipo] : [];
  const needsSubtype = subtypes.length > 0;

  const handleTypeSelect = (t: OccurrenceType) => {
    set("tipo", t);
    set("subtipo", null);
    setStep(subtypesByType[t].length > 0 ? "subtype" : "form");
  };

  const handleSubtypeSelect = (s: OccurrenceSubtype) => {
    set("subtipo", s);
    setStep("form");
  };

  const handleSubmit = async () => {
    if (!form.tipo)               return setError("Selecione o tipo de ocorrência");
    if (!form.descricaoDetalhada) return setError("Descrição detalhada é obrigatória");
    if (!form.dataHoraEvento)     return setError("Data e hora do evento são obrigatórias");
    if (!user?.company_id)        return setError("Usuário sem empresa associada");

    setSaving(true);
    setError(null);
    try {
      const { error: insertError } = await supabase
        .from("occurrences")
        .insert({
          company_id:      user.company_id,
          protocolo:       genProtocolo(form.tipo),
          tipo:            form.tipo,
          subtipo:         form.subtipo,
          status:          "registrada",
          historico_status: [],
          criado_por:      user.id,
          dados: {
            registrador:        { setor: form.setor, cargo: form.cargo },
            unidadeLocal:       form.unidadeLocal,
            dataHoraEvento:     form.dataHoraEvento,
            paciente:           { nomeCompleto: form.pacienteNome },
            descricaoDetalhada: form.descricaoDetalhada,
            acaoImediata:       form.acaoImediata,
            houveDano:          form.houveDano,
            descricaoDano:      form.descricaoDano,
            observacoes:        form.observacoes,
          },
        });

      if (insertError) throw new Error(insertError.message);
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao registrar ocorrência. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link to={`/${slug}/ocorrencias`} className="text-slate-400 hover:text-slate-600 text-sm transition-colors">
            ← Ocorrências
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-semibold text-slate-900">Nova Ocorrência</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">

        {/* Step: type selection */}
        {step === "type" && (
          <div>
            <h1 className="text-2xl font-black mb-2 text-slate-900">Tipo de Ocorrência</h1>
            <p className="text-slate-500 text-sm mb-8">Selecione a categoria que melhor descreve o evento.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(Object.keys(typeLabels) as OccurrenceType[]).map(t => {
                const Icon    = TYPE_ICONS[t];
                const colors  = TYPE_COLORS[t];
                return (
                  <button
                    key={t}
                    onClick={() => handleTypeSelect(t)}
                    className={`group text-left rounded-2xl border p-5 hover:shadow-md transition-all ${colors.bg}`}
                  >
                    <Icon className={`h-5 w-5 mb-3 ${colors.icon}`} />
                    <p className="text-sm font-semibold mb-0.5 text-slate-900">{typeLabels[t]}</p>
                    <div className="flex items-center gap-1 text-xs text-slate-400 group-hover:text-slate-600 transition-colors">
                      Selecionar <ChevronRight className="h-3 w-3" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step: subtype selection */}
        {step === "subtype" && form.tipo && (
          <div>
            <button onClick={() => setStep("type")} className="text-slate-400 hover:text-slate-600 text-sm mb-6 transition-colors">
              ← Voltar
            </button>
            <h1 className="text-2xl font-black mb-2 text-slate-900">{typeLabels[form.tipo]}</h1>
            <p className="text-slate-500 text-sm mb-8">Selecione o subtipo específico.</p>
            <div className="space-y-3">
              {subtypes.map(s => (
                <button
                  key={s}
                  onClick={() => handleSubtypeSelect(s)}
                  className="w-full text-left rounded-2xl border border-slate-200 bg-white px-5 py-4 hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between group"
                >
                  <span className="text-sm font-medium text-slate-900">{subtypeLabels[s]}</span>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: main form */}
        {step === "form" && (
          <div className="space-y-6">
            <div>
              <button onClick={() => setStep(needsSubtype ? "subtype" : "type")} className="text-slate-400 hover:text-slate-600 text-sm mb-6 transition-colors">
                ← Voltar
              </button>
              <h1 className="text-2xl font-black mb-1 text-slate-900">Detalhes da Ocorrência</h1>
              <p className="text-slate-500 text-sm">
                {form.tipo ? typeLabels[form.tipo] : ""}
                {form.subtipo ? ` · ${subtypeLabels[form.subtipo]}` : ""}
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Registrador */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Registrador</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Setor</FieldLabel>
                  <TextInput value={form.setor} onChange={v => set("setor", v)} placeholder="Ex: Radiologia" />
                </div>
                <div>
                  <FieldLabel>Cargo</FieldLabel>
                  <TextInput value={form.cargo} onChange={v => set("cargo", v)} placeholder="Ex: Técnico de RX" />
                </div>
              </div>
            </div>

            {/* Evento */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Dados do Evento</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Local / Unidade</FieldLabel>
                  <TextInput value={form.unidadeLocal} onChange={v => set("unidadeLocal", v)} placeholder="Ex: Sala 3" />
                </div>
                <div>
                  <FieldLabel>Data e Hora do Evento *</FieldLabel>
                  <TextInput type="datetime-local" value={form.dataHoraEvento} onChange={v => set("dataHoraEvento", v)} />
                </div>
              </div>
              <div>
                <FieldLabel>Nome do Paciente / Envolvido</FieldLabel>
                <TextInput value={form.pacienteNome} onChange={v => set("pacienteNome", v)} placeholder="Nome completo" />
              </div>
            </div>

            {/* Descrição */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Descrição</h3>
              <div>
                <FieldLabel>Descrição Detalhada *</FieldLabel>
                <TextArea
                  value={form.descricaoDetalhada}
                  onChange={v => set("descricaoDetalhada", v)}
                  placeholder="Descreva o que aconteceu de forma objetiva e completa..."
                  rows={4}
                />
              </div>
              <div>
                <FieldLabel>Ação Imediata Tomada</FieldLabel>
                <TextArea
                  value={form.acaoImediata}
                  onChange={v => set("acaoImediata", v)}
                  placeholder="Descreva as ações tomadas imediatamente após o evento..."
                />
              </div>
            </div>

            {/* Dano */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Dano / Lesão</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => set("houveDano", !form.houveDano)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.houveDano ? "bg-blue-600" : "bg-slate-200"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.houveDano ? "left-5" : "left-0.5"}`} />
                </button>
                <span className="text-sm text-slate-600">Houve dano ou lesão?</span>
              </div>
              {form.houveDano && (
                <div>
                  <FieldLabel>Descrição do Dano</FieldLabel>
                  <TextArea
                    value={form.descricaoDano}
                    onChange={v => set("descricaoDano", v)}
                    placeholder="Descreva o dano ou lesão causada..."
                  />
                </div>
              )}
            </div>

            {/* Observações */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <FieldLabel>Observações Adicionais</FieldLabel>
              <TextArea
                value={form.observacoes}
                onChange={v => set("observacoes", v)}
                placeholder="Informações complementares..."
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: primary }}
            >
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Registrando...</> : "Registrar Ocorrência"}
            </button>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-black mb-2 text-slate-900">Ocorrência Registrada</h1>
            <p className="text-slate-500 text-sm mb-8">O registro foi criado com sucesso. A equipe responsável será notificada.</p>
            <div className="flex gap-3 justify-center">
              <Link
                to={`/${slug}/ocorrencias`}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm hover:bg-slate-200 transition-colors"
              >
                Voltar às Ocorrências
              </Link>
              <button
                onClick={() => { setStep("type"); setForm(INITIAL); }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ background: primary }}
              >
                Registrar Outra
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
