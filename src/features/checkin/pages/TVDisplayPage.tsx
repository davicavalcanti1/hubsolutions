import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL } from "@/integrations/supabase/client";
import { checkinService } from "@/features/checkin/services/checkinService";

// ── Audio ─────────────────────────────────────────────────────────────────────

let sharedAudioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") sharedAudioCtx = new AudioContext();
  return sharedAudioCtx;
}

async function unlockAudio(): Promise<void> {
  const ctx = getAudioCtx();
  if (ctx.state === "running") return;
  try {
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    await ctx.resume();
  } catch {}
}

function playBeep(): Promise<void> {
  return new Promise(resolve => {
    const ctx = getAudioCtx();
    const run = () => {
      const gain = ctx.createGain();
      gain.gain.value = 10;
      gain.connect(ctx.destination);
      const tones = [880, 660, 880];
      let t = ctx.currentTime;
      tones.forEach(freq => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        g.gain.setValueAtTime(1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(g); g.connect(gain);
        osc.start(t); osc.stop(t + 0.18);
        t += 0.2;
      });
      setTimeout(resolve, tones.length * 200 + 100);
    };
    ctx.state === "suspended" ? ctx.resume().then(run) : run();
  });
}

function speakWebSpeech(text: string) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "pt-BR"; u.volume = 1; u.rate = 0.85;
  const voices = window.speechSynthesis.getVoices();
  const pt = voices.find(v => v.lang.startsWith("pt")) ?? null;
  if (pt) u.voice = pt;
  window.speechSynthesis.speak(u);
}

async function speakTTS(text: string) {
  await playBeep();
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.playbackRate = 1.25;
    const ctx = getAudioCtx();
    const source = ctx.createMediaElementSource(audio);
    const gainNode = ctx.createGain();
    gainNode.gain.value = 3;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    const play = () => { audio.play(); audio.onended = () => URL.revokeObjectURL(url); };
    ctx.state === "suspended" ? ctx.resume().then(play) : play();
  } catch {
    speakWebSpeech(text);
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface QueueEntry {
  id: string;
  nome: string;
  tipo_atendimento: string;
  status: string;
  checkin_em: string;
}

const PRIORITY_TYPES = ["crianca", "gestante", "idoso", "pcd", "autista"];
const PRIORITY_EMOJI: Record<string, string> = {
  normal: "", crianca: "⭐", gestante: "🤰", idoso: "👴", pcd: "♿", autista: "🧩",
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function TVDisplayPage() {
  const { tvSlug } = useParams<{ tvSlug: string }>();

  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [tvId, setTvId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [calledPatient, setCalledPatient] = useState<string | null>(null);
  const [callHistory, setCallHistory] = useState<string[]>([]);
  const [queuePreview, setQueuePreview] = useState<QueueEntry[]>([]);

  const callQueueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);
  const callTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tvIdRef = useRef<string | null>(null);
  const companyIdRef = useRef<string | null>(null);

  // Unlock audio on mount
  useEffect(() => {
    unlockAudio();
    const interval = setInterval(() => {
      const ctx = getAudioCtx();
      if (ctx.state === "running") { clearInterval(interval); return; }
      unlockAudio();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Load TV info
  useEffect(() => {
    if (!tvSlug) return;
    checkinService.getTVBySlug(tvSlug).then(({ data, error: e }: any) => {
      if (e || !data) { setError("TV não encontrada"); setLoaded(true); return; }
      const co = data.companies as any;
      tvIdRef.current = data.id;
      companyIdRef.current = data.company_id;
      setTvId(data.id);
      setCompanyId(data.company_id);
      setCompanyName(co?.name ?? "");
      setCompanyLogo(co?.logo_url ?? null);
      setPrimaryColor(co?.primary_color ?? "#6366f1");
      setLoaded(true);
    });
  }, [tvSlug]);

  // Load queue preview
  const loadQueuePreview = useCallback(async () => {
    const cid = companyIdRef.current;
    if (!cid) return;
    const { data } = await (supabase as any)
      .from("checkin_queue")
      .select("id, nome, tipo_atendimento, status, checkin_em")
      .eq("company_id", cid)
      .in("status", ["aguardando", "chegou"])
      .order("checkin_em", { ascending: true })
      .limit(8);
    if (data) {
      const sorted = [...data].sort((a: any, b: any) => {
        const ap = PRIORITY_TYPES.includes(a.tipo_atendimento) ? 0 : 1;
        const bp = PRIORITY_TYPES.includes(b.tipo_atendimento) ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return new Date(a.checkin_em).getTime() - new Date(b.checkin_em).getTime();
      });
      setQueuePreview(sorted.slice(0, 6));
    }
  }, []);

  useEffect(() => {
    if (!companyId) return;
    loadQueuePreview();
    const interval = setInterval(loadQueuePreview, 15_000);
    return () => clearInterval(interval);
  }, [companyId, loadQueuePreview]);

  // Heartbeat
  useEffect(() => {
    if (!tvId) return;
    const ping = () => checkinService.updateTVHeartbeat(tvId);
    ping();
    const interval = setInterval(ping, 60_000);
    return () => clearInterval(interval);
  }, [tvId]);

  // Process call
  const processCall = useCallback((nome: string) => {
    isProcessingRef.current = true;
    setCalledPatient(nome);
    setCallHistory(prev => [nome, ...prev].slice(0, 5));
    speakTTS(`Atenção, ${nome}, comparecer ao atendimento.`);
    loadQueuePreview();

    if (callTimerRef.current) clearTimeout(callTimerRef.current);
    callTimerRef.current = setTimeout(() => {
      setCalledPatient(null);
      const next = callQueueRef.current.shift();
      if (next) {
        setTimeout(() => processCall(next), 800);
      } else {
        isProcessingRef.current = false;
      }
    }, 10_000);
  }, [loadQueuePreview]);

  // Subscribe to broadcast calls
  useEffect(() => {
    if (!loaded) return;
    const channel = (supabase as any)
      .channel("totem-checkin")
      .on("broadcast", { event: "call" }, ({ payload }: any) => {
        const nome: string = payload.nome;
        const targetCompany: string | undefined = payload.company_id;
        if (targetCompany && companyIdRef.current && targetCompany !== companyIdRef.current) return;
        if (isProcessingRef.current) {
          callQueueRef.current.push(nome);
        } else {
          processCall(nome);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (callTimerRef.current) clearTimeout(callTimerRef.current);
    };
  }, [loaded, processCall]);

  // Subscribe realtime queue changes
  useEffect(() => {
    if (!companyId) return;
    const channel = (supabase as any)
      .channel(`tv-queue-${companyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "checkin_queue", filter: `company_id=eq.${companyId}` },
        () => { loadQueuePreview(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId, loadQueuePreview]);

  if (!loaded) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/40 text-lg">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col overflow-hidden select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-4">
          {companyLogo
            ? <img src={companyLogo} alt={companyName} className="h-12 w-auto object-contain" />
            : <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow"
                style={{ background: primaryColor }}>
                {companyName.charAt(0)}
              </div>
          }
          <div>
            <p className="font-bold text-lg">{companyName}</p>
            <p className="text-white/40 text-xs">Painel de Chamadas</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white/40 text-xs">Horário</p>
          <Clock />
        </div>
      </header>

      <div className="flex-1 grid grid-cols-3 gap-0">
        {/* Left: Call display */}
        <div className="col-span-2 flex flex-col items-center justify-center p-8 gap-6 border-r border-white/10">
          {calledPatient ? (
            <div className="text-center space-y-4 animate-in fade-in duration-300">
              <div className="text-white/50 text-lg font-medium uppercase tracking-widest">Chamando</div>
              <div className="text-6xl md:text-7xl font-black tracking-tight leading-none text-white animate-pulse"
                style={{ textShadow: `0 0 40px ${primaryColor}` }}>
                {calledPatient}
              </div>
              <div className="text-white/50 text-lg">comparecer ao atendimento</div>
              <div className="flex justify-center gap-2 mt-4">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                    style={{ background: primaryColor, animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <div className="text-white/15 text-2xl font-bold">Aguardando próxima chamada</div>
              <div className="text-white/10 text-sm">O nome do paciente será exibido aqui quando chamado</div>
            </div>
          )}

          {/* Call history */}
          {callHistory.length > 0 && (
            <div className="mt-6 w-full max-w-md">
              <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-3">Últimas chamadas</p>
              <div className="space-y-2">
                {callHistory.map((nome, i) => (
                  <div key={i} className={`px-4 py-2 rounded-xl flex items-center gap-3 ${i === 0 && calledPatient ? "bg-white/5 text-white/50" : "text-white/30"}`}>
                    <span className="text-xs text-white/20">{i + 1}.</span>
                    <span className="text-sm font-medium">{nome}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Queue preview */}
        <div className="flex flex-col p-6">
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">Próximos na fila</p>
          {queuePreview.length === 0 ? (
            <p className="text-white/20 text-sm mt-4">Fila vazia</p>
          ) : (
            <div className="space-y-2">
              {queuePreview.map((entry, i) => {
                const isPriority = PRIORITY_TYPES.includes(entry.tipo_atendimento);
                return (
                  <div key={entry.id} className={`px-4 py-3 rounded-xl flex items-center gap-3 border ${isPriority ? "border-red-500/30 bg-red-500/10" : "border-white/10 bg-white/5"}`}>
                    <span className={`text-xs font-bold w-5 text-center ${isPriority ? "text-red-400" : "text-white/30"}`}>{i + 1}</span>
                    <span className={`flex-1 text-sm font-medium truncate ${isPriority ? "text-red-200" : "text-white/70"}`}>{entry.nome}</span>
                    {isPriority && (
                      <span className="text-sm">{PRIORITY_EMOJI[entry.tipo_atendimento]}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-auto pt-4 border-t border-white/10">
            <p className="text-white/20 text-[10px] text-center">
              {queuePreview.length} aguardando
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <p className="text-white font-bold text-xl font-mono">
      {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
    </p>
  );
}
