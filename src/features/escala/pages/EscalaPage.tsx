import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useTenantTheme } from "@/features/tenant/context/TenantThemeContext";
import { MapPin, Users, Stethoscope, CalendarDays, Plus, Pencil, Trash2, Loader2, X } from "lucide-react";

type Tab = "escala" | "locais" | "funcionarios" | "medicos";

interface Local        { id: string; nome: string; descricao: string | null; ativo: boolean; }
interface Funcionario  { id: string; nome: string; cargo: string | null; setor: string | null; email: string | null; telefone: string | null; ativo: boolean; }
interface Medico       { id: string; nome: string; crm: string | null; especialidade: string | null; email: string | null; telefone: string | null; ativo: boolean; }
interface Escala       { id: string; nome: string; mes: number; ano: number; local_nome: string | null; dados: Record<string, unknown>; }

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ── Generic CRUD field ─────────────────────────────────────────────────────────

function CrudField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
      />
    </div>
  );
}

// ── Locais tab ────────────────────────────────────────────────────────────────

function LocaisTab() {
  const [locais, setLocais]   = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState({ nome: "", descricao: "" });
  const [saving, setSaving]   = useState(false);
  const [editId, setEditId]   = useState<string | null>(null);

  const load = () => api.get<Local[]>("/api/escala/locais").then(d => { setLocais(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.nome.trim()) return;
    setSaving(true);
    if (editId) {
      const updated = await api.patch<Local>(`/api/escala/locais/${editId}`, form);
      setLocais(prev => prev.map(l => l.id === editId ? updated : l));
      setEditId(null);
    } else {
      const created = await api.post<Local>("/api/escala/locais", form);
      setLocais(prev => [created, ...prev]);
    }
    setForm({ nome: "", descricao: "" });
    setSaving(false);
  };

  const del = async (id: string) => {
    await api.delete(`/api/escala/locais/${id}`);
    setLocais(prev => prev.filter(l => l.id !== id));
  };

  const startEdit = (l: Local) => { setEditId(l.id); setForm({ nome: l.nome, descricao: l.descricao ?? "" }); };
  const cancel    = () => { setEditId(null); setForm({ nome: "", descricao: "" }); };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">{editId ? "Editar Local" : "Novo Local"}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CrudField label="Nome *" value={form.nome} onChange={v => setForm(p => ({ ...p, nome: v }))} placeholder="Ex: Sala 1" />
          <CrudField label="Descrição" value={form.descricao} onChange={v => setForm(p => ({ ...p, descricao: v }))} placeholder="Descrição opcional" />
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving || !form.nome.trim()}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {editId ? "Salvar" : "Adicionar"}
          </button>
          {editId && <button onClick={cancel} className="text-xs px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 transition-colors"><X className="h-3.5 w-3.5" /></button>}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
          ) : locais.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">Nenhum local cadastrado.</div>
          ) : locais.map(l => (
            <div key={l.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{l.nome}</p>
                {l.descricao && <p className="text-xs text-slate-400 truncate">{l.descricao}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(l)} className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => del(l.id)}    className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Funcionários tab ──────────────────────────────────────────────────────────

function FuncionariosTab() {
  const [items, setItems] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome: "", cargo: "", setor: "", email: "", telefone: "" });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const load = () => api.get<Funcionario[]>("/api/escala/funcionarios").then(d => { setItems(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.nome.trim()) return;
    setSaving(true);
    if (editId) {
      const updated = await api.patch<Funcionario>(`/api/escala/funcionarios/${editId}`, form);
      setItems(prev => prev.map(x => x.id === editId ? updated : x));
      setEditId(null);
    } else {
      const created = await api.post<Funcionario>("/api/escala/funcionarios", form);
      setItems(prev => [created, ...prev]);
    }
    setForm({ nome: "", cargo: "", setor: "", email: "", telefone: "" });
    setSaving(false);
  };

  const del = async (id: string) => {
    await api.delete(`/api/escala/funcionarios/${id}`);
    setItems(prev => prev.filter(x => x.id !== id));
  };

  const startEdit = (f: Funcionario) => {
    setEditId(f.id);
    setForm({ nome: f.nome, cargo: f.cargo ?? "", setor: f.setor ?? "", email: f.email ?? "", telefone: f.telefone ?? "" });
  };
  const cancel = () => { setEditId(null); setForm({ nome: "", cargo: "", setor: "", email: "", telefone: "" }); };

  const F = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">{editId ? "Editar Funcionário" : "Novo Funcionário"}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <CrudField label="Nome *"   value={form.nome}     onChange={F("nome")}     placeholder="Nome completo" />
          <CrudField label="Cargo"    value={form.cargo}    onChange={F("cargo")}    placeholder="Ex: Técnico" />
          <CrudField label="Setor"    value={form.setor}    onChange={F("setor")}    placeholder="Ex: Radiologia" />
          <CrudField label="E-mail"   value={form.email}    onChange={F("email")}    placeholder="email@exemplo.com" />
          <CrudField label="Telefone" value={form.telefone} onChange={F("telefone")} placeholder="(00) 00000-0000" />
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving || !form.nome.trim()}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {editId ? "Salvar" : "Adicionar"}
          </button>
          {editId && <button onClick={cancel} className="text-xs px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 transition-colors"><X className="h-3.5 w-3.5" /></button>}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">Nenhum funcionário cadastrado.</div>
          ) : items.map(f => (
            <div key={f.id} className="flex items-center gap-4 px-5 py-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
                {f.nome[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{f.nome}</p>
                <p className="text-xs text-slate-400">{[f.cargo, f.setor].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(f)} className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => del(f.id)}    className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Médicos tab ───────────────────────────────────────────────────────────────

function MedicosTab() {
  const [items, setItems] = useState<Medico[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome: "", crm: "", especialidade: "", email: "", telefone: "" });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const load = () => api.get<Medico[]>("/api/escala/medicos").then(d => { setItems(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.nome.trim()) return;
    setSaving(true);
    if (editId) {
      const updated = await api.patch<Medico>(`/api/escala/medicos/${editId}`, form);
      setItems(prev => prev.map(x => x.id === editId ? updated : x));
      setEditId(null);
    } else {
      const created = await api.post<Medico>("/api/escala/medicos", form);
      setItems(prev => [created, ...prev]);
    }
    setForm({ nome: "", crm: "", especialidade: "", email: "", telefone: "" });
    setSaving(false);
  };

  const del = async (id: string) => {
    await api.delete(`/api/escala/medicos/${id}`);
    setItems(prev => prev.filter(x => x.id !== id));
  };

  const startEdit = (m: Medico) => {
    setEditId(m.id);
    setForm({ nome: m.nome, crm: m.crm ?? "", especialidade: m.especialidade ?? "", email: m.email ?? "", telefone: m.telefone ?? "" });
  };
  const cancel = () => { setEditId(null); setForm({ nome: "", crm: "", especialidade: "", email: "", telefone: "" }); };

  const F = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">{editId ? "Editar Médico" : "Novo Médico"}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <CrudField label="Nome *"         value={form.nome}          onChange={F("nome")}         placeholder="Nome completo" />
          <CrudField label="CRM"            value={form.crm}           onChange={F("crm")}           placeholder="CRM-SP 000000" />
          <CrudField label="Especialidade"  value={form.especialidade} onChange={F("especialidade")} placeholder="Ex: Radiologista" />
          <CrudField label="E-mail"         value={form.email}         onChange={F("email")}         placeholder="email@exemplo.com" />
          <CrudField label="Telefone"       value={form.telefone}      onChange={F("telefone")}      placeholder="(00) 00000-0000" />
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving || !form.nome.trim()}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {editId ? "Salvar" : "Adicionar"}
          </button>
          {editId && <button onClick={cancel} className="text-xs px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 transition-colors"><X className="h-3.5 w-3.5" /></button>}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">Nenhum médico cadastrado.</div>
          ) : items.map(m => (
            <div key={m.id} className="flex items-center gap-4 px-5 py-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
                {m.nome[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{m.nome}</p>
                <p className="text-xs text-slate-400">{[m.especialidade, m.crm].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(m)} className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => del(m.id)}    className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Escalas tab ───────────────────────────────────────────────────────────────

function EscalaTab() {
  const now = new Date();
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome: "", mes: String(now.getMonth() + 1), ano: String(now.getFullYear()) });
  const [saving, setSaving] = useState(false);

  const load = () => api.get<Escala[]>("/api/escala").then(d => { setEscalas(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.nome.trim()) return;
    setSaving(true);
    const created = await api.post<Escala>("/api/escala", {
      nome: form.nome.trim(),
      mes:  Number(form.mes),
      ano:  Number(form.ano),
    });
    setEscalas(prev => [created, ...prev]);
    setForm(p => ({ ...p, nome: "" }));
    setSaving(false);
  };

  const del = async (id: string) => {
    await api.delete(`/api/escala/${id}`);
    setEscalas(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Nova Escala</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <CrudField label="Nome *" value={form.nome} onChange={v => setForm(p => ({ ...p, nome: v }))} placeholder="Ex: Escala Fevereiro" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Mês</label>
            <select
              value={form.mes}
              onChange={e => setForm(p => ({ ...p, mes: e.target.value }))}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-400"
            >
              {MESES.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
            </select>
          </div>
          <div>
            <CrudField label="Ano" value={form.ano} onChange={v => setForm(p => ({ ...p, ano: v }))} placeholder="2026" />
          </div>
        </div>
        <button onClick={save} disabled={saving || !form.nome.trim()}
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Criar Escala
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
          ) : escalas.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">Nenhuma escala criada.</div>
          ) : escalas.map(e => (
            <div key={e.id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex flex-col items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-blue-600">{MESES[e.mes - 1]}</span>
                <span className="text-[9px] text-blue-400">{e.ano}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{e.nome}</p>
                {e.local_nome && <p className="text-xs text-slate-400">{e.local_nome}</p>}
              </div>
              <button onClick={() => del(e.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "escala",       label: "Escalas",       icon: CalendarDays },
  { key: "locais",       label: "Locais",         icon: MapPin       },
  { key: "funcionarios", label: "Funcionários",   icon: Users        },
  { key: "medicos",      label: "Médicos",        icon: Stethoscope  },
];

export function EscalaPage() {
  const { slug } = useParams<{ slug: string }>();
  const { theme } = useTenantTheme();
  const primary = theme?.primary_color ?? "#2563eb";
  const [tab, setTab] = useState<Tab>("escala");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link to={`/${slug}`} className="text-slate-400 hover:text-slate-600 text-sm transition-colors">
            ← Hub
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-semibold text-slate-900">Gestão de Escala</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200 mb-7">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
              style={tab === key ? { borderColor: primary, color: primary } : undefined}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {tab === "escala"       && <EscalaTab />}
        {tab === "locais"       && <LocaisTab />}
        {tab === "funcionarios" && <FuncionariosTab />}
        {tab === "medicos"      && <MedicosTab />}
      </main>
    </div>
  );
}
