import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw } from "lucide-react";

const TEMPO_MEDIO_MIN = 15;
const PRIORITY_TYPES = ["crianca", "gestante", "idoso", "pcd", "autista"];

interface QueueEntry {
  id: string;
  company_id: string;
  nome?: string;
  status: "aguardando" | "confirmado" | "chegou" | "chamado" | "em_atendimento" | "finalizado" | "ausente";
  checkin_em: string;
  fila_virtual: boolean;
  tipo_atendimento?: string;
}

interface CompanyInfo { name: string; logo_url?: string; }

const STATUS_CONFIG: Record<string, { bg: string; ring: string; text: string; label: string; sublabel: string; pulse: boolean }> = {
  aguardando:    { bg: "bg-blue-600",   ring: "ring-blue-200",   text: "text-blue-700",   label: "Aguardando",       sublabel: "Aguarde, você será chamado em breve.", pulse: false },
  chegou:        { bg: "bg-blue-500",   ring: "ring-blue-200",   text: "text-blue-700",   label: "Aguardando",       sublabel: "Você está na fila. Aguarde ser chamado.", pulse: false },
  confirmado:    { bg: "bg-violet-500", ring: "ring-violet-200", text: "text-violet-700", label: "A Caminho",         sublabel: "Registre sua chegada na clínica.", pulse: false },
  chamado:       { bg: "bg-emerald-500", ring: "ring-emerald-200", text: "text-emerald-700", label: "🔔 É a sua vez!", sublabel: "Dirija-se à recepção agora.", pulse: true },
  em_atendimento:{ bg: "bg-indigo-600", ring: "ring-indigo-200", text: "text-indigo-700", label: "Em atendimento",   sublabel: "Você está sendo atendido.", pulse: false },
  finalizado:    { bg: "bg-slate-400",  ring: "ring-slate-200",  text: "text-slate-600",  label: "Concluído ✅",     sublabel: "Seu atendimento foi concluído.", pulse: false },
  ausente:       { bg: "bg-red-500",    ring: "ring-red-200",    text: "text-red-700",    label: "Ausente",           sublabel: "Você foi marcado como ausente. Fale com a recepção.", pulse: false },
};

export default function QueuePublicoPage() {
  const { token } = useParams<{ token: string }>();
  const [entry, setEntry] = useState<QueueEntry | null>(null);
  const [position, setPosition] = useState(1);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  const fetchData = async () => {
    if (!token) return;

    const { data: entryData, error: entryError } = await (supabase as any)
      .from("checkin_queue")
      .select("id, company_id, nome, status, checkin_em, fila_virtual, tipo_atendimento")
      .eq("token_publico", token)
      .maybeSingle();

    if (entryError || !entryData) {
      setError("Entrada não encontrada. Verifique o link ou realize um novo check-in.");
      setLoading(false);
      return;
    }

    setEntry(entryData as QueueEntry);
    setLastUpdated(new Date());

    // Count ahead in queue
    const { data: aheadData } = await (supabase as any)
      .from("checkin_queue")
      .select("id, tipo_atendimento, checkin_em")
      .eq("company_id", entryData.company_id)
      .in("status", ["aguardando", "chegou", "chamado"])
      .lt("checkin_em", entryData.checkin_em)
      .order("checkin_em", { ascending: true });

    const ahead = (aheadData || []) as { tipo_atendimento?: string; checkin_em: string }[];
    const sorted = [...ahead].sort((a, b) => {
      const ap = PRIORITY_TYPES.includes(a.tipo_atendimento || "") ? 0 : 1;
      const bp = PRIORITY_TYPES.includes(b.tipo_atendimento || "") ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return new Date(a.checkin_em).getTime() - new Date(b.checkin_em).getTime();
    });
    setPosition(sorted.length + 1);

    // Load company info
    const { data: companyData } = await (supabase as any)
      .from("companies")
      .select("name, logo_url")
      .eq("id", entryData.company_id)
      .maybeSingle();
    if (companyData) setCompany(companyData as CompanyInfo);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [token]);

  useEffect(() => {
    if (!token) return;
    channelRef.current = (supabase as any)
      .channel(`queue-entry-${token}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "checkin_queue", filter: `token_publico=eq.${token}` },
        (payload: any) => {
          setEntry(prev => prev ? { ...prev, ...payload.new } : payload.new);
          setLastUpdated(new Date());
          fetchData();
        }
      )
      .subscribe();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [token]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        <p className="text-slate-500 text-sm">Carregando sua posição...</p>
      </div>
    </div>
  );

  if (error || !entry) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="text-center space-y-3 max-w-sm">
        <p className="text-2xl">😕</p>
        <h2 className="text-xl font-bold text-slate-800">Entrada não encontrada</h2>
        <p className="text-slate-500 text-sm">{error || "Verifique o link ou realize um novo check-in."}</p>
      </div>
    </div>
  );

  const statusKey = entry.status || "aguardando";
  const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.aguardando;
  const nome = entry.nome || "Paciente";
  const estimatedMin = position * TEMPO_MEDIO_MIN;
  const isActive = ["aguardando", "chegou", "chamado"].includes(entry.status);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white border-b border-slate-100 py-4 px-6">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {company?.logo_url
            ? <img src={company.logo_url} alt="Logo" className="h-10 w-auto object-contain" />
            : <p className="text-sm font-bold text-slate-700">{company?.name || "Fila de Atendimento"}</p>
          }
          <button onClick={fetchData} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-md mx-auto w-full space-y-8">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">Olá, {nome.split(" ")[0]}! 👋</p>
          <p className="text-slate-500 text-sm mt-1">Aqui está sua posição na fila</p>
        </div>

        {isActive && (
          <div className="flex flex-col items-center gap-3">
            <div className={`w-32 h-32 rounded-full ${statusCfg.bg} ${statusCfg.pulse ? "animate-pulse" : ""} ring-8 ${statusCfg.ring} flex items-center justify-center shadow-xl`}>
              <span className="text-6xl font-extrabold text-white">{position}</span>
            </div>
            <p className="text-slate-700 font-semibold text-lg">
              Você é o <span className={`font-extrabold ${statusCfg.text}`}>Nº {position}</span> na fila
            </p>
            <p className="text-slate-500 text-sm">
              Tempo estimado: <span className="font-semibold text-slate-700">~{estimatedMin} minutos</span>
            </p>
          </div>
        )}

        <div className={`w-full rounded-2xl border-2 p-5 text-center space-y-1 ${statusCfg.pulse ? "border-emerald-300 bg-emerald-50 animate-pulse" : "border-slate-100 bg-slate-50"}`}>
          <p className={`text-xl font-bold ${statusCfg.text}`}>{statusCfg.label}</p>
          <p className="text-slate-600 text-sm">{statusCfg.sublabel}</p>
        </div>

        {isActive && position > 1 && (
          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Progresso estimado</span>
              <span>{Math.max(0, 100 - Math.round((position / (position + 3)) * 100))}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-2 bg-blue-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.max(5, 100 - Math.round((position / (position + 3)) * 100))}%` }} />
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400 text-center">
          Atualizado {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      </main>
    </div>
  );
}
