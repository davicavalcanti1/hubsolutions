import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Monitor, UserCheck, Bell, Shield, ArrowRight, Check,
  ChevronRight, Lock, Globe, Layers, Star, Menu, X,
  Database, Server, RefreshCw, Sparkles,
} from "lucide-react";

// ── Module data ───────────────────────────────────────────────────────────────
const MODULES = [
  {
    icon: Monitor,
    name: "ScreenFlow",
    tag: "Mídia Digital",
    headline: "Controle total das suas telas",
    description:
      "Gerencie conteúdo em TVs, painéis e monitores da sua empresa em tempo real. Programe exibições, segmente por local e mensure engajamento.",
    color: "from-lime-400 to-emerald-400",
    glow: "rgba(163,230,53,0.15)",
    features: ["Agendamento de conteúdo", "Segmentação por tela", "Relatórios de exibição"],
  },
  {
    icon: UserCheck,
    name: "FlowDesk",
    tag: "Check-in Digital",
    headline: "Recepção sem filas, sem papel",
    description:
      "Check-in digital inteligente para pacientes e visitantes. Reduza tempo de espera, automatize cadastros e integre com seu sistema.",
    color: "from-sky-400 to-blue-500",
    glow: "rgba(56,189,248,0.15)",
    features: ["Check-in via QR Code", "Integração com cadastro", "Painel em tempo real"],
  },
  {
    icon: Bell,
    name: "NurseLink",
    tag: "Chamados Clínicos",
    headline: "Resposta imediata a cada chamado",
    description:
      "Central de chamados de enfermagem em tempo real. Alertas sonoros, dashboard visual e histórico completo de atendimentos.",
    color: "from-violet-400 to-purple-500",
    glow: "rgba(167,139,250,0.15)",
    features: ["Alertas em tempo real", "Mapa visual de leitos", "Histórico de chamados"],
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "R$ 299",
    description: "Ideal para clínicas pequenas com 1 módulo",
    modules: 1,
    users: 5,
    storage: "500 MB",
    features: ["1 módulo à escolha", "Até 5 usuários", "500 MB de armazenamento", "Suporte por e-mail", "Atualizações incluídas"],
    highlight: false,
    cta: "Começar agora",
  },
  {
    name: "Pro",
    price: "R$ 599",
    description: "Para clínicas em crescimento com múltiplos módulos",
    modules: 3,
    users: 20,
    storage: "5 GB",
    features: ["Até 3 módulos", "Até 20 usuários", "5 GB de armazenamento", "Suporte prioritário", "White-label completo", "Banco dedicado"],
    highlight: true,
    cta: "Mais escolhido",
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    description: "Para redes hospitalares e grandes operações",
    modules: -1,
    users: -1,
    storage: "Ilimitado",
    features: ["Todos os módulos", "Usuários ilimitados", "Armazenamento ilimitado", "SLA garantido", "Onboarding dedicado", "Infraestrutura isolada"],
    highlight: false,
    cta: "Falar com vendas",
  },
];

const STATS = [
  { value: "99.9%", label: "Uptime garantido" },
  { value: "<200ms", label: "Latência média" },
  { value: "ISO 27001", label: "Certificação de segurança" },
  { value: "24/7", label: "Monitoramento ativo" },
];

const SECURITY_ITEMS = [
  { icon: Lock,     title: "Dados isolados por tenant",   desc: "Cada empresa tem seus dados completamente isolados. Zero risco de vazamento entre clientes." },
  { icon: Shield,   title: "Criptografia end-to-end",    desc: "Todas as comunicações e dados em repouso são criptografados com AES-256." },
  { icon: Database, title: "Backup automático",           desc: "Snapshots diários com retenção de 30 dias. Restauração em minutos." },
  { icon: Server,   title: "Infraestrutura local opcional", desc: "Clientes Enterprise podem rodar em servidor dedicado na própria rede." },
  { icon: Globe,    title: "LGPD compliant",              desc: "Conformidade total com a Lei Geral de Proteção de Dados Pessoais." },
  { icon: RefreshCw, title: "SLA 99.9%",                  desc: "Garantia contratual de disponibilidade. Compensação automática em caso de falha." },
];

// ── Component ─────────────────────────────────────────────────────────────────
export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredModule, setHoveredModule] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden">

      {/* ── Dot grid background ───────────────────────────────────────────── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* ── Glow blobs ───────────────────────────────────────────────────── */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(163,230,53,0.08) 0%, transparent 70%)" }} />
      <div className="fixed bottom-0 right-0 w-[600px] h-[400px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(163,230,53,0.05) 0%, transparent 70%)" }} />

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] backdrop-blur-xl bg-[#050505]/80">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-lime-400 flex items-center justify-center">
              <Layers className="h-4 w-4 text-black" />
            </div>
            <span className="font-bold text-white tracking-tight">HubSolutions</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {["Módulos", "Segurança", "Preços"].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                className="text-sm text-white/50 hover:text-white transition-colors">
                {item}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm text-white/60 hover:text-white transition-colors px-4 py-2">
              Entrar
            </Link>
            <Link to="/register"
              className="text-sm font-semibold bg-lime-400 text-black px-4 py-2 rounded-lg hover:bg-lime-300 transition-colors">
              Começar grátis
            </Link>
          </div>

          <button className="md:hidden text-white/60 hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-white/[0.06] bg-[#050505] px-6 py-4 space-y-3">
            {["Módulos", "Segurança", "Preços"].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                className="block text-sm text-white/60 hover:text-white py-1.5" onClick={() => setMenuOpen(false)}>
                {item}
              </a>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <Link to="/login" className="text-sm text-center border border-white/10 rounded-lg px-4 py-2 text-white/60 hover:text-white hover:border-white/20 transition-colors">Entrar</Link>
              <Link to="/register" className="text-sm text-center font-semibold bg-lime-400 text-black px-4 py-2.5 rounded-lg hover:bg-lime-300 transition-colors">Começar grátis</Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-40 pb-32 px-6">
        <div className="max-w-4xl mx-auto text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 border border-lime-400/30 bg-lime-400/[0.07] rounded-full px-4 py-1.5 mb-8">
            <Sparkles className="h-3.5 w-3.5 text-lime-400" />
            <span className="text-xs font-medium text-lime-400 tracking-wide uppercase">Plataforma B2B · Segurança Enterprise</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.05] mb-6">
            A plataforma que sua{" "}
            <span
              className="inline-block"
              style={{ background: "linear-gradient(135deg, #a3e635 0%, #4ade80 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              operação clínica
            </span>{" "}
            precisa.
          </h1>

          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed mb-10">
            Três módulos especializados. Uma plataforma integrada. Dados isolados por empresa,
            infraestrutura de nível bancário e interface que sua equipe vai amar usar.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register"
              className="group flex items-center gap-2 bg-lime-400 hover:bg-lime-300 text-black font-bold px-7 py-3.5 rounded-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(163,230,53,0.35)]">
              Criar conta gratuita
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#módulos"
              className="flex items-center gap-2 border border-white/10 hover:border-white/20 text-white/70 hover:text-white font-medium px-7 py-3.5 rounded-xl transition-all duration-200">
              Ver os módulos
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          {/* Trust line */}
          <p className="mt-8 text-sm text-white/25">
            Sem cartão de crédito · Setup em menos de 5 minutos · Cancele quando quiser
          </p>
        </div>

        {/* Stats bar */}
        <div className="max-w-4xl mx-auto mt-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/[0.06]">
            {STATS.map(stat => (
              <div key={stat.label} className="bg-[#0a0a0a] px-6 py-5 text-center">
                <div className="text-2xl font-black text-lime-400 tracking-tight">{stat.value}</div>
                <div className="text-xs text-white/40 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modules ──────────────────────────────────────────────────────── */}
      <section id="módulos" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-lime-400 uppercase tracking-[0.2em] mb-4">Módulos</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Cada módulo, um produto completo.
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              Use um módulo ou todos juntos. A plataforma cresce com a sua operação.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {MODULES.map((mod, i) => (
              <div
                key={mod.name}
                onMouseEnter={() => setHoveredModule(i)}
                onMouseLeave={() => setHoveredModule(null)}
                className="relative group rounded-2xl border border-white/[0.07] bg-[#0a0a0a] p-7 transition-all duration-300 cursor-default overflow-hidden"
                style={hoveredModule === i ? { borderColor: "rgba(163,230,53,0.25)", boxShadow: `0 0 60px ${mod.glow}` } : {}}
              >
                {/* Gradient top bar */}
                <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${mod.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${mod.color} mb-5`}>
                  <mod.icon className="h-5 w-5 text-black" />
                </div>

                {/* Tag */}
                <p className="text-[11px] font-semibold text-white/30 uppercase tracking-[0.15em] mb-2">{mod.tag}</p>

                {/* Name */}
                <h3 className="text-xl font-bold mb-1">{mod.name}</h3>
                <p className={`text-sm font-medium bg-gradient-to-r ${mod.color} bg-clip-text text-transparent mb-4`}>
                  {mod.headline}
                </p>

                {/* Description */}
                <p className="text-sm text-white/45 leading-relaxed mb-6">{mod.description}</p>

                {/* Features */}
                <ul className="space-y-2.5 mb-6">
                  {mod.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-white/60">
                      <Check className="h-3.5 w-3.5 text-lime-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link to="/register"
                  className="flex items-center gap-1.5 text-sm font-medium text-lime-400 hover:text-lime-300 transition-colors">
                  Saiba mais <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security ─────────────────────────────────────────────────────── */}
      <section id="segurança" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl border border-white/[0.07] bg-[#080808] overflow-hidden">
            <div className="p-10 md:p-16 border-b border-white/[0.06]">
              <p className="text-xs font-semibold text-lime-400 uppercase tracking-[0.2em] mb-4">Segurança</p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight max-w-2xl mb-4">
                Dados clínicos exigem segurança de outro nível.
              </h2>
              <p className="text-white/40 text-lg max-w-xl">
                Construímos cada camada do sistema pensando em conformidade, isolamento e resiliência.
                Porque dados de saúde não admitem meio-termo.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-px bg-white/[0.04]">
              {SECURITY_ITEMS.map(item => (
                <div key={item.title} className="bg-[#080808] p-8 hover:bg-[#0d0d0d] transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center mb-4">
                    <item.icon className="h-4 w-4 text-lime-400" />
                  </div>
                  <h4 className="font-semibold mb-2 text-sm">{item.title}</h4>
                  <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-lime-400 uppercase tracking-[0.2em] mb-4">Como funciona</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Operacional em minutos.
            </h2>
            <p className="text-white/40 text-lg">Sem complexidade. Sem instalação. Sem dor de cabeça.</p>
          </div>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: "01", title: "Crie sua conta", desc: "Cadastre sua empresa em menos de 2 minutos. Escolha os módulos que precisa e configure seu perfil." },
                { step: "02", title: "Personalize", desc: "Adicione sua logo, defina as cores da sua marca e convide sua equipe. A plataforma vira a sua." },
                { step: "03", title: "Opere", desc: "Seus módulos estão prontos para uso imediato. Dados em tempo real, integração com sua operação." },
              ].map(item => (
                <div key={item.step} className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl border border-white/[0.08] bg-[#0a0a0a] mb-6 relative">
                    <span className="text-3xl font-black text-white/[0.08]">{item.step}</span>
                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-lime-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
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
              <p className="text-xs font-semibold text-lime-400 uppercase tracking-[0.2em] mb-4">White-label</p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
                A plataforma com a
                <span style={{ background: "linear-gradient(135deg, #a3e635 0%, #4ade80 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}> sua marca.</span>
              </h2>
              <p className="text-white/40 text-lg leading-relaxed mb-8">
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
                  <li key={item} className="flex items-center gap-3 text-sm text-white/70">
                    <div className="w-5 h-5 rounded-full bg-lime-400/15 border border-lime-400/30 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-lime-400" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual mockup */}
            <div className="relative">
              <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a] p-6 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs font-bold">C</div>
                  <div>
                    <div className="text-sm font-semibold">Clínica Aurora</div>
                    <div className="text-xs text-white/30">aurora.hubsolutions.app</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {["ScreenFlow", "FlowDesk", "NurseLink"].map((mod, i) => (
                    <div key={mod} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${i === 0 ? "bg-lime-400/20" : i === 1 ? "bg-sky-400/20" : "bg-violet-400/20"}`}>
                        {i === 0 ? <Monitor className="h-3.5 w-3.5 text-lime-400" /> : i === 1 ? <UserCheck className="h-3.5 w-3.5 text-sky-400" /> : <Bell className="h-3.5 w-3.5 text-violet-400" />}
                      </div>
                      <span className="text-sm text-white/70">{mod}</span>
                      <div className="ml-auto w-2 h-2 rounded-full bg-lime-400" />
                    </div>
                  ))}
                </div>
                <div className="pt-2 text-xs text-white/20 text-center">Powered by HubSolutions</div>
              </div>
              {/* Glow */}
              <div className="absolute -inset-4 rounded-3xl pointer-events-none"
                style={{ background: "radial-gradient(ellipse at center, rgba(163,230,53,0.05) 0%, transparent 70%)" }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section id="preços" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-lime-400 uppercase tracking-[0.2em] mb-4">Preços</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Simples. Transparente. Justo.
            </h2>
            <p className="text-white/40 text-lg">Comece grátis. Escale conforme cresce.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 items-start">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-7 transition-all duration-300 ${
                  plan.highlight
                    ? "bg-lime-400 text-black scale-[1.02] shadow-[0_0_80px_rgba(163,230,53,0.3)]"
                    : "bg-[#0a0a0a] border border-white/[0.07] text-white hover:border-white/[0.15]"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-lime-400 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-lime-400/30">
                    Mais popular
                  </div>
                )}

                <div className={`text-xs font-semibold uppercase tracking-[0.15em] mb-4 ${plan.highlight ? "text-black/60" : "text-white/40"}`}>
                  {plan.name}
                </div>
                <div className={`text-4xl font-black tracking-tight mb-1 ${plan.highlight ? "text-black" : "text-white"}`}>
                  {plan.price}
                  {plan.price !== "Sob consulta" && <span className={`text-base font-normal ml-1 ${plan.highlight ? "text-black/50" : "text-white/30"}`}>/mês</span>}
                </div>
                <p className={`text-sm mb-6 mt-2 ${plan.highlight ? "text-black/60" : "text-white/40"}`}>{plan.description}</p>

                <div className={`h-px mb-6 ${plan.highlight ? "bg-black/15" : "bg-white/[0.06]"}`} />

                <ul className="space-y-3 mb-7">
                  {plan.features.map(f => (
                    <li key={f} className={`flex items-center gap-2.5 text-sm ${plan.highlight ? "text-black/80" : "text-white/60"}`}>
                      <Check className={`h-3.5 w-3.5 shrink-0 ${plan.highlight ? "text-black" : "text-lime-400"}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className={`block text-center font-bold text-sm py-3 rounded-xl transition-all ${
                    plan.highlight
                      ? "bg-black text-lime-400 hover:bg-neutral-900"
                      : "bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/[0.1]"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-white/25 mt-8">
            Todos os planos incluem 14 dias de teste gratuito · Sem fidelidade
          </p>
        </div>
      </section>

      {/* ── Feature requests section ─────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-3xl border border-white/[0.07] bg-[#080808] p-12">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-lime-400/10 border border-lime-400/20 mb-6">
              <Star className="h-5 w-5 text-lime-400" />
            </div>
            <h3 className="text-3xl font-black mb-3">Molde a plataforma ao seu negócio.</h3>
            <p className="text-white/40 leading-relaxed mb-6">
              Todos os clientes podem sugerir novas funcionalidades. As mais votadas entram no roadmap.
              Você não está preso ao que existe hoje.
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {["Relatórios avançados", "Integração com HIS", "App mobile", "API aberta", "Assinaturas digitais"].map(tag => (
                <span key={tag} className="px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs text-white/50">
                  {tag}
                </span>
              ))}
              <span className="px-3 py-1.5 rounded-full border border-lime-400/30 bg-lime-400/[0.08] text-xs text-lime-400">
                + sua sugestão
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative rounded-3xl overflow-hidden border border-lime-400/20 bg-[#0a0a0a] p-16">
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(163,230,53,0.12) 0%, transparent 60%)" }} />
            <div className="relative">
              <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6">
                Pronto para modernizar sua
                <span style={{ background: "linear-gradient(135deg, #a3e635 0%, #4ade80 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}> operação?</span>
              </h2>
              <p className="text-white/40 text-lg mb-10 max-w-xl mx-auto">
                Junte-se a clínicas que já usam o HubSolutions para simplificar processos e proteger dados.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/register"
                  className="group flex items-center gap-2 bg-lime-400 hover:bg-lime-300 text-black font-bold px-8 py-4 rounded-xl transition-all hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(163,230,53,0.35)] text-base">
                  Criar conta gratuita
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link to="/login" className="text-white/50 hover:text-white text-sm transition-colors">
                  Já tenho conta →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-lime-400 flex items-center justify-center">
                <Layers className="h-3.5 w-3.5 text-black" />
              </div>
              <span className="font-bold text-white/80 text-sm">HubSolutions</span>
            </div>

            <div className="flex items-center gap-8">
              {["Módulos", "Segurança", "Preços", "Contato"].map(item => (
                <a key={item} href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors">{item}</a>
              ))}
            </div>

            <div className="flex items-center gap-4 text-xs text-white/20">
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
