import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Monitor, UserCheck, Bell, Shield, ArrowRight, Check,
  ChevronRight, Lock, Globe, Layers, Star, Menu, X,
  Database, Server, RefreshCw, Sparkles,
  AlertTriangle, CalendarClock, ClipboardList, FileSignature,
  ChevronLeft,
} from "lucide-react";

// ── Module data ───────────────────────────────────────────────────────────────
const MODULES = [
  {
    icon: Monitor,
    name: "VitrineCast",
    tag: "Mídia nas telas",
    headline: "Suas TVs trabalhando por você",
    description:
      "Transforme cada tela da clínica em um canal de comunicação. Programe anúncios, campanhas e avisos com agendamento inteligente.",
    color: "from-sky-400 to-blue-500",
    glow: "rgba(56,189,248,0.12)",
    features: ["Programação automática", "Conteúdo por localidade", "Métricas de exibição"],
  },
  {
    icon: UserCheck,
    name: "PortalCheg",
    tag: "Check-in inteligente",
    headline: "O paciente chega e o sistema já sabe",
    description:
      "Totem ou QR Code na entrada. O paciente faz check-in sozinho, a recepção acompanha tudo no painel e a fila simplesmente desaparece.",
    color: "from-blue-500 to-indigo-600",
    glow: "rgba(99,102,241,0.12)",
    features: ["Check-in por QR Code", "Fila digital em tempo real", "Integração com cadastro"],
  },
  {
    icon: Bell,
    name: "PulsarEnf",
    tag: "Chamado de enfermagem",
    headline: "Um toque. Atendimento na hora.",
    description:
      "O paciente aperta um botão, a enfermagem recebe na tela. Sem gritos no corredor, sem perda de tempo, com histórico completo.",
    color: "from-indigo-500 to-blue-700",
    glow: "rgba(79,70,229,0.12)",
    features: ["Alerta sonoro e visual", "Mapa de leitos", "Tempo de resposta medido"],
  },
  {
    icon: AlertTriangle,
    name: "VigiaMed",
    tag: "Gestão de ocorrências",
    headline: "Cada incidente rastreado, cada ação documentada",
    description:
      "Registre ocorrências, classifique por gravidade, crie planos de ação corretiva e gere relatórios prontos para a Anvisa.",
    color: "from-amber-400 to-orange-500",
    glow: "rgba(251,191,36,0.12)",
    features: ["Triagem automatizada", "CAPA integrado", "Relatórios regulatórios"],
  },
  {
    icon: CalendarClock,
    name: "PlantoNet",
    tag: "Escalas e plantões",
    headline: "Monte a escala do mês em minutos",
    description:
      "Distribua turnos de médicos e equipe de forma visual. Sem conflito de horários, sem planilha, sem dor de cabeça.",
    color: "from-emerald-400 to-teal-500",
    glow: "rgba(52,211,153,0.12)",
    features: ["Montagem visual de turnos", "Controle por unidade", "Exportação em PDF"],
  },
  {
    icon: ClipboardList,
    name: "AnamneSync",
    tag: "Anamnese digital",
    headline: "O paciente preenche. O médico já recebe.",
    description:
      "Formulários inteligentes por especialidade, preenchidos pelo paciente antes da consulta. Tudo organizado, legível e salvo.",
    color: "from-violet-400 to-purple-600",
    glow: "rgba(139,92,246,0.12)",
    features: ["Modelos por especialidade", "Preenchimento antecipado", "Prontuário integrado"],
  },
  {
    icon: FileSignature,
    name: "ConsentaDoc",
    tag: "Termo de consentimento",
    headline: "Assinatura digital. Zero papel. Validade total.",
    description:
      "Termos assinados na tela pelo paciente com timestamp e IP. Armazenamento criptografado e acesso instantâneo quando precisar.",
    color: "from-rose-400 to-pink-600",
    glow: "rgba(244,63,94,0.12)",
    features: ["Assinatura com toque", "Selo de tempo e IP", "Busca por paciente"],
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "R$ 299",
    description: "Ideal para clínicas pequenas com 1 módulo",
    features: ["1 módulo à escolha", "Até 5 usuários", "500 MB de armazenamento", "Suporte por e-mail", "Atualizações incluídas"],
    highlight: false,
    cta: "Começar agora",
  },
  {
    name: "Pro",
    price: "R$ 599",
    description: "Para clínicas em crescimento com múltiplos módulos",
    features: ["Até 3 módulos", "Até 20 usuários", "5 GB de armazenamento", "Suporte prioritário", "White-label completo", "Banco dedicado"],
    highlight: true,
    cta: "Mais escolhido",
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    description: "Para redes hospitalares e grandes operações",
    features: ["Todos os módulos", "Usuários ilimitados", "Armazenamento ilimitado", "SLA garantido", "Onboarding dedicado", "Infraestrutura isolada"],
    highlight: false,
    cta: "Falar com vendas",
  },
];

const STATS = [
  { value: "99.9%",    label: "Uptime garantido" },
  { value: "<200ms",   label: "Latência média" },
  { value: "ISO 27001",label: "Certificação de segurança" },
  { value: "24/7",     label: "Monitoramento ativo" },
];

const SECURITY_ITEMS = [
  { icon: Lock,      title: "Dados isolados por tenant",      desc: "Cada empresa tem seus dados completamente isolados. Zero risco de vazamento entre clientes." },
  { icon: Shield,    title: "Criptografia end-to-end",        desc: "Todas as comunicações e dados em repouso são criptografados com AES-256." },
  { icon: Database,  title: "Backup automático",              desc: "Snapshots diários com retenção de 30 dias. Restauração em minutos." },
  { icon: Server,    title: "Infraestrutura local opcional",  desc: "Clientes Enterprise podem rodar em servidor dedicado na própria rede." },
  { icon: Globe,     title: "LGPD compliant",                 desc: "Conformidade total com a Lei Geral de Proteção de Dados Pessoais." },
  { icon: RefreshCw, title: "SLA 99.9%",                      desc: "Garantia contratual de disponibilidade. Compensação automática em caso de falha." },
];

// ── Component ─────────────────────────────────────────────────────────────────
export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  // ── Carousel (infinite loop, 3 visíveis, slide contínuo) ─────────────────
  const [current, setCurrent] = useState(0);
  const [paused, setPaused]   = useState(false);
  const total = MODULES.length;

  // Duplica os módulos para criar efeito infinito (original + cópia)
  const extended = [...MODULES, ...MODULES, ...MODULES];
  const offset = total; // começa no meio para poder voltar

  const next = useCallback(() => setCurrent(c => c + 1), []);
  const prev = useCallback(() => setCurrent(c => c - 1), []);

  // Reseta posição silenciosamente quando sai do range visível
  const trackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (current >= total) {
      const timer = setTimeout(() => {
        if (trackRef.current) trackRef.current.style.transition = "none";
        setCurrent(current - total);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (trackRef.current) trackRef.current.style.transition = "transform 0.6s cubic-bezier(0.4,0,0.2,1)";
          });
        });
      }, 600);
      return () => clearTimeout(timer);
    }
    if (current < 0) {
      const timer = setTimeout(() => {
        if (trackRef.current) trackRef.current.style.transition = "none";
        setCurrent(current + total);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (trackRef.current) trackRef.current.style.transition = "transform 0.6s cubic-bezier(0.4,0,0.2,1)";
          });
        });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [current, total]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 4000);
    return () => clearInterval(id);
  }, [paused, next]);

  const dotIndex = ((current % total) + total) % total;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden">

      {/* ── Dot grid background ───────────────────────────────────────────── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.045) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* ── Glow blobs ───────────────────────────────────────────────────── */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(37,99,235,0.07) 0%, transparent 70%)" }} />
      <div className="fixed bottom-0 right-0 w-[600px] h-[400px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.05) 0%, transparent 70%)" }} />

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 backdrop-blur-xl bg-white/90">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Layers className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight">HubSolutions</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {["Módulos", "Segurança", "Preços"].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
                {item}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm text-slate-500 hover:text-slate-900 transition-colors px-4 py-2">
              Entrar
            </Link>
            <Link to="/login"
              className="text-sm font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Começar grátis
            </Link>
          </div>

          <button className="md:hidden text-slate-500 hover:text-slate-900" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-6 py-4 space-y-3">
            {["Módulos", "Segurança", "Preços"].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                className="block text-sm text-slate-600 hover:text-slate-900 py-1.5" onClick={() => setMenuOpen(false)}>
                {item}
              </a>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <Link to="/login" className="text-sm text-center border border-slate-200 rounded-lg px-4 py-2 text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors">Entrar</Link>
              <Link to="/login" className="text-sm text-center font-semibold bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">Começar grátis</Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-40 pb-32 px-6">
        <div className="max-w-4xl mx-auto text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 border border-blue-200 bg-blue-50 rounded-full px-4 py-1.5 mb-8">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs font-medium text-blue-600 tracking-wide uppercase">Plataforma B2B · Segurança Enterprise</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.05] mb-6 text-slate-900">
            A plataforma que sua{" "}
            <span
              className="inline-block bg-gradient-to-r from-sky-400 to-blue-600 bg-clip-text text-transparent">
              operação clínica
            </span>{" "}
            precisa.
          </h1>

          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10">
            Três módulos especializados. Uma plataforma integrada. Dados isolados por empresa,
            infraestrutura de nível bancário e interface que sua equipe vai amar usar.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login"
              className="group flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-7 py-3.5 rounded-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(37,99,235,0.3)]">
              Criar conta gratuita
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#módulos"
              className="flex items-center gap-2 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 font-medium px-7 py-3.5 rounded-xl transition-all duration-200">
              Ver os módulos
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          {/* Trust line */}
          <p className="mt-8 text-sm text-slate-400">
            Sem cartão de crédito · Setup em menos de 5 minutos · Cancele quando quiser
          </p>
        </div>

        {/* Stats bar */}
        <div className="max-w-4xl mx-auto mt-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-200 rounded-2xl overflow-hidden border border-slate-200">
            {STATS.map(stat => (
              <div key={stat.label} className="bg-white px-6 py-5 text-center">
                <div className="text-2xl font-black text-blue-600 tracking-tight">{stat.value}</div>
                <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modules Carousel ────────────────────────────────────────────── */}
      <section id="módulos" className="py-28 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.2em] mb-4">7 módulos</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-slate-900">
              Cada módulo, um produto completo.
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Contrate um, alguns ou todos. A plataforma cresce com a sua operação.
            </p>
          </div>
        </div>

        {/* Carousel — 3 visíveis, desliza 1 por vez */}
        <div className="relative max-w-6xl mx-auto px-6"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}>

          {/* Arrows */}
          <button onClick={prev} aria-label="Anterior"
            className="hidden md:flex absolute -left-1 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={next} aria-label="Próximo"
            className="hidden md:flex absolute -right-1 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Track overflow container */}
          <div className="overflow-hidden rounded-2xl">
            <div
              ref={trackRef}
              className="flex gap-5"
              style={{
                transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)",
                transform: `translateX(calc(-${(current + offset) * 100 / 3}% - ${(current + offset) * 20 / 3}px))`,
              }}
            >
              {extended.map((mod, i) => (
                <div
                  key={`${mod.name}-${i}`}
                  className="relative group shrink-0 rounded-2xl border border-slate-200 bg-white p-7 cursor-default overflow-hidden hover:border-blue-200 transition-colors duration-300"
                  style={{ width: "calc((100% - 40px) / 3)" }}
                >
                  <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${mod.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${mod.color} mb-5 shadow-sm`}>
                    <mod.icon className="h-5 w-5 text-white" />
                  </div>

                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.15em] mb-2">{mod.tag}</p>
                  <h3 className="text-xl font-bold mb-1 text-slate-900">{mod.name}</h3>
                  <p className={`text-sm font-medium bg-gradient-to-r ${mod.color} bg-clip-text text-transparent mb-4`}>
                    {mod.headline}
                  </p>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">{mod.description}</p>

                  <ul className="space-y-2.5">
                    {mod.features.map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                        <Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {MODULES.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} aria-label={`Módulo ${i + 1}`}
                className={`rounded-full transition-all duration-300 ${
                  dotIndex === i ? "w-7 h-2.5 bg-blue-600" : "w-2.5 h-2.5 bg-slate-300 hover:bg-slate-400"
                }`} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Less Paper ──────────────────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white overflow-hidden p-10 md:p-16">
            <div className="grid md:grid-cols-[1fr_auto] gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 border border-emerald-200 bg-emerald-100 rounded-full px-4 py-1.5 mb-6">
                  <span className="text-lg leading-none">&#127793;</span>
                  <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Less Paper Policy</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 mb-4">
                  Sustentabilidade na prática clínica.
                </h2>
                <p className="text-slate-500 leading-relaxed mb-8">
                  Cada módulo do HubSolutions foi desenhado para eliminar papel da rotina da sua clínica.
                  Termos assinados digitalmente, anamneses preenchidas no celular, escalas sem impressão,
                  check-in sem formulário. Menos papel, mais agilidade — e um compromisso real com o meio ambiente.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { stat: "Zero papel", desc: "Termos, fichas e formulários 100% digitais" },
                    { stat: "Menos lixo", desc: "Fim de impressões repetidas e descartadas" },
                    { stat: "Mais rápido", desc: "Processos digitais levam segundos, não minutos" },
                    { stat: "Rastreável", desc: "Tudo salvo com data, hora e responsável" },
                  ].map(item => (
                    <div key={item.stat} className="p-4 rounded-xl bg-white border border-emerald-100">
                      <p className="text-sm font-bold text-emerald-700 mb-1">{item.stat}</p>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="hidden md:flex flex-col items-center gap-3 text-center">
                <div className="w-32 h-32 rounded-full bg-emerald-100 border-4 border-emerald-200 flex items-center justify-center">
                  <span className="text-5xl">&#127807;</span>
                </div>
                <p className="text-xs text-emerald-600 font-semibold max-w-[140px] leading-snug">
                  Todas as soluções seguem a política Less Paper
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Security ─────────────────────────────────────────────────────── */}
      <section id="segurança" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
            <div className="p-10 md:p-16 border-b border-slate-100">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.2em] mb-4">Segurança</p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight max-w-2xl mb-4 text-slate-900">
                Dados clínicos exigem segurança de outro nível.
              </h2>
              <p className="text-slate-400 text-lg max-w-xl">
                Construímos cada camada do sistema pensando em conformidade, isolamento e resiliência.
                Porque dados de saúde não admitem meio-termo.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-px bg-slate-100">
              {SECURITY_ITEMS.map(item => (
                <div key={item.title} className="bg-white p-8 hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
                    <item.icon className="h-4 w-4 text-blue-600" />
                  </div>
                  <h4 className="font-semibold mb-2 text-sm text-slate-900">{item.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="py-28 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.2em] mb-4">Como funciona</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-slate-900">
              Operacional em minutos.
            </h2>
            <p className="text-slate-400 text-lg">Sem complexidade. Sem instalação. Sem dor de cabeça.</p>
          </div>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: "01", title: "Crie sua conta", desc: "Cadastre sua empresa em menos de 2 minutos. Escolha os módulos que precisa e configure seu perfil." },
                { step: "02", title: "Personalize", desc: "Adicione sua logo, defina as cores da sua marca e convide sua equipe. A plataforma vira a sua." },
                { step: "03", title: "Opere", desc: "Seus módulos estão prontos para uso imediato. Dados em tempo real, integração com sua operação." },
              ].map(item => (
                <div key={item.step} className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl border border-slate-200 bg-white mb-6 relative shadow-sm">
                    <span className="text-3xl font-black text-slate-200">{item.step}</span>
                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── White-label section ───────────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.2em] mb-4">White-label</p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6 text-slate-900">
                A plataforma com a
                <span className="bg-gradient-to-r from-sky-400 to-blue-600 bg-clip-text text-transparent"> sua marca.</span>
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-8">
                Seus funcionários e pacientes veem o nome e a logo da sua empresa.
                Customize cores, tipografia e identidade visual sem escrever uma linha de código.
              </p>
              <ul className="space-y-4">
                {[
                  "Logo e favicon personalizados",
                  "Cores primárias e secundárias",
                  "Nome de exibição customizado",
                  "URL amigável (/suaempresa)",
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-600">
                    <div className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-blue-600" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual mockup */}
            <div className="relative">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">C</div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Clínica Aurora</div>
                    <div className="text-xs text-slate-400">aurora.hubsolutions.app</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { name: "VitrineCast",  icon: Monitor,       bg: "bg-sky-100",     fg: "text-sky-600" },
                    { name: "PortalCheg",   icon: UserCheck,     bg: "bg-blue-100",    fg: "text-blue-600" },
                    { name: "PulsarEnf",    icon: Bell,          bg: "bg-indigo-100",  fg: "text-indigo-600" },
                    { name: "VigiaMed",     icon: AlertTriangle, bg: "bg-amber-100",   fg: "text-amber-600" },
                    { name: "PlantoNet",    icon: CalendarClock, bg: "bg-emerald-100", fg: "text-emerald-600" },
                  ].map(mod => (
                    <div key={mod.name} className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-100">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center ${mod.bg}`}>
                        <mod.icon className={`h-3 w-3 ${mod.fg}`} />
                      </div>
                      <span className="text-xs text-slate-700">{mod.name}</span>
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                    </div>
                  ))}
                </div>
                <div className="pt-2 text-xs text-slate-300 text-center">Powered by HubSolutions</div>
              </div>
              {/* Glow */}
              <div className="absolute -inset-4 rounded-3xl pointer-events-none"
                style={{ background: "radial-gradient(ellipse at center, rgba(37,99,235,0.05) 0%, transparent 70%)" }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section id="preços" className="py-28 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.2em] mb-4">Preços</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-slate-900">
              Simples. Transparente. Justo.
            </h2>
            <p className="text-slate-400 text-lg">Comece grátis. Escale conforme cresce.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 items-start">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-7 transition-all duration-300 ${
                  plan.highlight
                    ? "bg-blue-600 text-white scale-[1.02] shadow-[0_8px_60px_rgba(37,99,235,0.35)]"
                    : "bg-white border border-slate-200 text-slate-900 hover:border-slate-300 hover:shadow-md"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-blue-300 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                    Mais popular
                  </div>
                )}

                <div className={`text-xs font-semibold uppercase tracking-[0.15em] mb-4 ${plan.highlight ? "text-blue-200" : "text-slate-400"}`}>
                  {plan.name}
                </div>
                <div className={`text-4xl font-black tracking-tight mb-1 ${plan.highlight ? "text-white" : "text-slate-900"}`}>
                  {plan.price}
                  {plan.price !== "Sob consulta" && <span className={`text-base font-normal ml-1 ${plan.highlight ? "text-blue-300" : "text-slate-400"}`}>/mês</span>}
                </div>
                <p className={`text-sm mb-6 mt-2 ${plan.highlight ? "text-blue-200" : "text-slate-400"}`}>{plan.description}</p>

                <div className={`h-px mb-6 ${plan.highlight ? "bg-blue-500" : "bg-slate-100"}`} />

                <ul className="space-y-3 mb-7">
                  {plan.features.map(f => (
                    <li key={f} className={`flex items-center gap-2.5 text-sm ${plan.highlight ? "text-blue-100" : "text-slate-600"}`}>
                      <Check className={`h-3.5 w-3.5 shrink-0 ${plan.highlight ? "text-blue-200" : "text-blue-500"}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/login"
                  className={`block text-center font-bold text-sm py-3 rounded-xl transition-all ${
                    plan.highlight
                      ? "bg-white text-blue-600 hover:bg-blue-50"
                      : "bg-slate-50 border border-slate-200 text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-slate-400 mt-8">
            Todos os planos incluem 14 dias de teste gratuito · Sem fidelidade
          </p>
        </div>
      </section>

      {/* ── Feature requests section ─────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-3xl border border-slate-200 bg-white p-12 shadow-sm">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 mb-6">
              <Star className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-3xl font-black mb-3 text-slate-900">Molde a plataforma ao seu negócio.</h3>
            <p className="text-slate-400 leading-relaxed mb-6">
              Todos os clientes podem sugerir novas funcionalidades. As mais votadas entram no roadmap.
              Você não está preso ao que existe hoje.
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {["Relatórios avançados", "Integração com HIS", "App mobile", "API aberta", "Assinaturas digitais"].map(tag => (
                <span key={tag} className="px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-500">
                  {tag}
                </span>
              ))}
              <span className="px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-xs text-blue-600">
                + sua sugestão
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative rounded-3xl overflow-hidden border border-blue-100 bg-blue-50 p-16">
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.1) 0%, transparent 60%)" }} />
            <div className="relative">
              <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6 text-slate-900">
                Pronto para modernizar sua
                <span className="bg-gradient-to-r from-sky-400 to-blue-600 bg-clip-text text-transparent"> operação?</span>
              </h2>
              <p className="text-slate-500 text-lg mb-10 max-w-xl mx-auto">
                Junte-se a clínicas que já usam o HubSolutions para simplificar processos e proteger dados.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/login"
                  className="group flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl transition-all hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(37,99,235,0.35)] text-base">
                  Criar conta gratuita
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link to="/login" className="text-slate-500 hover:text-slate-900 text-sm transition-colors">
                  Já tenho conta →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 py-12 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <Layers className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-bold text-slate-700 text-sm">HubSolutions</span>
            </div>

            <div className="flex items-center gap-8">
              {["Módulos", "Segurança", "Preços", "Contato"].map(item => (
                <a key={item} href="#" className="text-xs text-slate-400 hover:text-slate-700 transition-colors">{item}</a>
              ))}
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-300">
              <span>LGPD</span>
              <span>·</span>
              <span>Termos</span>
              <span>·</span>
              <span>© 2026 HubSolutions</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
