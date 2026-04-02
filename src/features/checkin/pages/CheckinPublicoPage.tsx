import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { checkinService } from "@/features/checkin/services/checkinService";
import { Loader2, CheckCircle2, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";

type Step = "cpf" | "dados" | "sucesso";
type TipoAtendimento = "normal" | "crianca" | "gestante" | "idoso" | "pcd" | "autista";

const ATTENDANCE_OPTIONS: { value: TipoAtendimento; label: string; subtitle: string; emoji: string; priority: boolean }[] = [
  { value: "normal",   label: "Atendimento Normal",         subtitle: "Sem prioridade especial",            emoji: "👤", priority: false },
  { value: "idoso",    label: "Idoso",                      subtitle: "Pessoa com 60 anos ou mais",         emoji: "👴", priority: true  },
  { value: "pcd",      label: "PCD / Mobilidade Reduzida",  subtitle: "Deficiência ou mobilidade reduzida", emoji: "♿", priority: true  },
  { value: "gestante", label: "Gestante / Criança de Colo", subtitle: "Gestante ou com criança de colo",    emoji: "🤰", priority: true  },
  { value: "autista",  label: "Autista / Doador de Sangue", subtitle: "Espectro autista ou doador de sangue", emoji: "🧩", priority: true },
  { value: "crianca",  label: "Outros Prioritários",        subtitle: "Demais casos previstos em lei",      emoji: "⭐", priority: true  },
];

function validateCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +d[i] * (10 - i);
  let r = (s * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== +d[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +d[i] * (11 - i);
  r = (s * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === +d[10];
}

function formatCPF(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length > 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0,3)}.${d.slice(3)}`;
  return d;
}

function formatPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length > 7) return `(${d.slice(0,2)}) ${d.slice(2,3)} ${d.slice(3,7)}-${d.slice(7)}`;
  if (d.length > 3) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length > 0) return `(${d}`;
  return d;
}

export default function CheckinPublicoPage() {
  const { companySlug } = useParams<{ companySlug: string }>();
  const companyIdRef = useRef<string>("");
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#2563eb");

  const [step, setStep] = useState<Step>("cpf");
  const [cpf, setCpf]   = useState("");
  const [cpfError, setCpfError] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [welcomeBack, setWelcomeBack] = useState(false);
  const [existingEntryId, setExistingEntryId] = useState<string | null>(null);
  const [patientData, setPatientData] = useState({ nome: "", telefone: "", data_nasc: "", sexo: "" });
  const [tipoAtendimento, setTipoAtendimento] = useState<TipoAtendimento>("normal");
  const [successNome, setSuccessNome] = useState("");

  // Load company info
  useEffect(() => {
    if (!companySlug) return;
    checkinService.getCompanyBySlug(companySlug).then(({ data }: any) => {
      if (data) {
        companyIdRef.current = data.id;
        setCompanyName(data.name);
        setCompanyLogo(data.logo_url ?? null);
        setPrimaryColor(data.primary_color ?? "#2563eb");
      }
    });
  }, [companySlug]);

  const handleCpfNext = async () => {
    const digits = cpf.replace(/\D/g, "");
    if (!validateCPF(digits)) { setCpfError("CPF inválido. Verifique os números digitados."); return; }
    setCpfError("");
    setIsLookingUp(true);
    try {
      const today = new Date(); today.setHours(0,0,0,0);
      const cid = companyIdRef.current;

      // Check if already checked in today (confirmado)
      const { data: existing } = await (supabase as any)
        .from("checkin_queue")
        .select("id, nome, telefone, data_nasc, sexo, tipo_atendimento")
        .eq("cpf", digits)
        .eq("company_id", cid)
        .eq("status", "confirmado")
        .gte("checkin_em", today.toISOString())
        .limit(1)
        .maybeSingle();

      if (existing) {
        setExistingEntryId(existing.id);
        setPatientData({ nome: existing.nome || "", telefone: existing.telefone || "", data_nasc: existing.data_nasc || "", sexo: existing.sexo || "" });
        setTipoAtendimento(existing.tipo_atendimento || "normal");
        setWelcomeBack(true);
      } else {
        // Pre-fill from previous visit
        const { data: prev } = await (supabase as any)
          .from("checkin_queue")
          .select("nome, telefone, data_nasc, sexo")
          .eq("cpf", digits)
          .eq("company_id", cid)
          .not("nome", "is", null)
          .order("checkin_em", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (prev?.nome) {
          setPatientData({ nome: prev.nome || "", telefone: prev.telefone || "", data_nasc: prev.data_nasc || "", sexo: prev.sexo || "" });
          setWelcomeBack(true);
        }
      }
    } finally {
      setIsLookingUp(false);
    }
    setStep("dados");
  };

  const handleSubmit = useCallback(async () => {
    if (!patientData.nome.trim()) { setError("Informe seu nome completo."); return; }
    const cid = companyIdRef.current;
    if (!cid) { setError("Clínica não identificada. Tente novamente."); return; }
    setIsSubmitting(true);
    setError(null);
    const digits = cpf.replace(/\D/g, "");
    try {
      if (existingEntryId) {
        await (supabase as any).from("checkin_queue")
          .update({ status: "chegou", origem: "qr_code" }).eq("id", existingEntryId);
      } else {
        await (supabase as any).from("checkin_queue").insert([{
          company_id:        cid,
          nome:              patientData.nome.trim(),
          cpf:               digits || null,
          telefone:          patientData.telefone || null,
          data_nasc:         patientData.data_nasc || null,
          sexo:              patientData.sexo || null,
          tipo_atendimento:  tipoAtendimento,
          tipo_agendamento:  "a_agendar",
          status:            "chegou",
          origem:            "qr_code",
          checkin_em:        new Date().toISOString(),
          fila_virtual:      false,
        }]);
      }
      setSuccessNome(patientData.nome.trim());
      setStep("sucesso");
    } catch (err: any) {
      setError(err?.message || "Erro ao realizar check-in. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }, [cpf, patientData, tipoAtendimento, existingEntryId]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center gap-3">
          {companyLogo
            ? <img src={companyLogo} alt={companyName} className="h-10 w-auto object-contain" />
            : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm" style={{ background: primaryColor }}>
                {companyName.charAt(0).toUpperCase() || "H"}
              </div>
          }
          <div>
            <p className="font-bold text-slate-800 text-sm">{companyName || "Check-in Digital"}</p>
            <p className="text-[11px] text-slate-400">Auto-atendimento</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center px-6 py-8 w-full max-w-md mx-auto">

        {/* Sucesso */}
        {step === "sucesso" && (
          <div className="w-full bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center space-y-5 animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Chegada Registrada! ✅</h2>
            <p className="text-slate-600">
              Olá, <strong>{successNome.split(" ")[0]}</strong>! Você está na fila. Aguarde ser chamado.
            </p>
            <p className="text-xs text-slate-400">Você pode acompanhar sua posição na TV ou com o link enviado.</p>
          </div>
        )}

        {/* CPF */}
        {step === "cpf" && (
          <div className="w-full space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-slate-900">Boas-vindas</h2>
              <p className="text-slate-500 text-sm">Informe seu CPF para registrar sua chegada</p>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">CPF</label>
              <div className="relative">
                <input
                  type="text" inputMode="numeric" placeholder="000.000.000-00"
                  value={cpf} onChange={e => { setCpf(formatCPF(e.target.value)); setCpfError(""); }}
                  maxLength={14} disabled={isLookingUp}
                  className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 text-xl font-medium focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm disabled:opacity-60"
                />
                {isLookingUp && <div className="absolute right-5 top-1/2 -translate-y-1/2"><Loader2 className="h-5 w-5 animate-spin text-blue-500" /></div>}
              </div>
              {cpfError && <p className="text-sm text-red-600 mt-2">{cpfError}</p>}
            </div>
            <button
              onClick={handleCpfNext}
              disabled={cpf.replace(/\D/g,"").length < 11 || isLookingUp}
              style={{ background: primaryColor }}
              className="w-full disabled:opacity-50 text-white font-bold py-5 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
            >
              {isLookingUp ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continuar <ArrowRight className="h-5 w-5" /></>}
            </button>
          </div>
        )}

        {/* Dados */}
        {step === "dados" && (
          <div className="w-full space-y-5">
            {welcomeBack && patientData.nome && (
              <div className={`border rounded-2xl px-5 py-4 text-center ${existingEntryId ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
                <p className={`font-semibold ${existingEntryId ? 'text-emerald-700' : 'text-blue-700'}`}>
                  {existingEntryId ? `✅ Check-in encontrado, ${patientData.nome.split(" ")[0]}!` : `Bem-vindo de volta, ${patientData.nome.split(" ")[0]}! 👋`}
                </p>
                {existingEntryId && <p className="text-xs text-emerald-600 mt-0.5">Vamos registrar sua chegada na clínica.</p>}
              </div>
            )}
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-slate-900">{existingEntryId ? "Confirmar chegada" : "Seus dados"}</h2>
              <p className="text-slate-400 text-sm">{existingEntryId ? "Confirme que é você" : "Confirme ou preencha suas informações"}</p>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nome Completo *</label>
              {patientData.nome
                ? <p className="text-base font-semibold text-slate-800 px-1">{patientData.nome}</p>
                : <input type="text" placeholder="Seu nome completo" value={patientData.nome}
                    onChange={e => setPatientData({ ...patientData, nome: e.target.value })}
                    className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-3 text-sm font-medium focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
              }
            </div>
            {!existingEntryId && (
              <>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Telefone</label>
                  <input type="tel" inputMode="numeric" placeholder="(00) 9 0000-0000" value={patientData.telefone}
                    onChange={e => setPatientData({ ...patientData, telefone: formatPhone(e.target.value) })}
                    className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-3 text-sm font-medium focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nascimento</label>
                    <input type="date" value={patientData.data_nasc} onChange={e => setPatientData({ ...patientData, data_nasc: e.target.value })}
                      className="w-full bg-white border-2 border-slate-200 rounded-2xl px-3 py-3 text-sm font-medium focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Sexo</label>
                    <div className="flex gap-2">
                      {[{ v: "M", l: "Masc." }, { v: "F", l: "Fem." }].map(({ v, l }) => (
                        <button key={v} type="button" onClick={() => setPatientData({ ...patientData, sexo: v })}
                          className={`flex-1 py-3 rounded-2xl border-2 text-sm font-semibold transition-all ${patientData.sexo === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Tipo de Atendimento</label>
                  <div className="grid grid-cols-2 gap-3">
                    {ATTENDANCE_OPTIONS.map(opt => (
                      <button key={opt.value} type="button" onClick={() => setTipoAtendimento(opt.value)}
                        className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center ${opt.priority ? "border-red-200 bg-red-50 hover:bg-red-100" : "border-slate-200 bg-white hover:bg-slate-50"} ${tipoAtendimento === opt.value ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}>
                        {opt.priority && <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full uppercase">Prior.</span>}
                        <span className="text-3xl">{opt.emoji}</span>
                        <span className={`text-xs font-semibold ${opt.priority ? "text-red-700" : "text-slate-700"}`}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">{error}</p>}
            <button onClick={handleSubmit} disabled={isSubmitting}
              style={{ background: "#059669" }}
              className="w-full disabled:opacity-50 text-white font-bold py-5 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98]">
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (existingEntryId ? "Confirmar Chegada ✅" : "Registrar Chegada ✅")}
            </button>
            <button onClick={() => { setStep("cpf"); setError(null); setExistingEntryId(null); setWelcomeBack(false); }}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 mx-auto">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
          </div>
        )}

        {step !== "sucesso" && (
          <div className="mt-8 flex items-center gap-2 text-slate-400 bg-slate-100 px-4 py-2 rounded-full text-xs">
            <ShieldCheck className="h-4 w-4" />
            <span>Seus dados estão protegidos pela LGPD</span>
          </div>
        )}
      </main>
    </div>
  );
}
