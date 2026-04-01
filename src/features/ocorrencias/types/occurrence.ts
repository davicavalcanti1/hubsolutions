// Occurrence Types and Subtypes
export type OccurrenceType = "administrativa" | "revisao_exame" | "enfermagem" | "paciente" | "livre" | "seguranca_paciente";

type AdministrativaSubtype = "faturamento" | "agendamento";
type EnfermagemSubtype = "extravasamento_enfermagem" | "reacoes_adversas";
type SegurancaPacienteSubtype =
  | "queda"
  | "erro_identificacao_paciente"
  | "reacao_contraste_grave"
  | "falha_equipamento_clinico"
  | "falha_comunicacao"
  | "evento_sentinela_livre";

export type OccurrenceSubtype =
  | AdministrativaSubtype
  | EnfermagemSubtype
  | SegurancaPacienteSubtype
  | "revisao_exame"
  | "livre";

export type TriageClassification =
  | "circunstancia_risco"
  | "near_miss"
  | "incidente_sem_dano"
  | "evento_adverso"
  | "evento_sentinela";

export type OccurrenceStatus =
  | "registrada"
  | "em_triagem"
  | "em_analise"
  | "acao_em_andamento"
  | "concluida"
  | "improcedente";

export type OutcomeType =
  | "imediato_correcao"
  | "orientacao"
  | "treinamento"
  | "alteracao_processo"
  | "manutencao_corretiva"
  | "notificacao_externa"
  | "improcedente";

export interface ExternalNotification {
  orgaoNotificado: string;
  data: string;
  responsavel: string;
  anexoComprovante?: string;
  documentoGerado?: string;
}

export interface CAPA {
  id: string;
  causaRaiz: string;
  acao: string;
  responsavel: string;
  prazo: string;
  evidencia?: string;
  verificacaoEficacia?: string;
  verificadoPor?: string;
  verificadoEm?: string;
  status: "pendente" | "em_andamento" | "concluida" | "verificada";
}

export interface OccurrenceOutcome {
  tipos: OutcomeType[];
  justificativa: string;
  desfechoPrincipal?: OutcomeType;
  notificacaoExterna?: ExternalNotification;
  capas?: CAPA[];
  definidoPor: string;
  definidoEm: string;
}

export interface StatusChange {
  de: OccurrenceStatus;
  para: OccurrenceStatus;
  por: string;
  em: string;
  motivo?: string;
}

export interface Occurrence {
  id: string;
  company_id: string;
  protocolo: string;
  tipo: OccurrenceType;
  subtipo?: OccurrenceSubtype;
  status: OccurrenceStatus;
  triagem?: TriageClassification;
  triagem_por?: string;
  triagem_em?: string;
  dados: Record<string, unknown>;
  desfecho?: OccurrenceOutcome;
  historico_status: StatusChange[];
  criado_por?: string;
  criado_em: string;
  atualizado_em: string;
}

// ── Labels & Config ─────────────────────────────────────────────────────────

export const typeLabels: Record<OccurrenceType, string> = {
  administrativa:     "Administrativa",
  revisao_exame:      "Revisão de Exame",
  enfermagem:         "Enfermagem",
  paciente:           "Paciente",
  livre:              "Livre",
  seguranca_paciente: "Segurança do Paciente",
};

export const subtypeLabels: Record<OccurrenceSubtype, string> = {
  revisao_exame:              "Revisão de exame",
  faturamento:                "Faturamento",
  agendamento:                "Agendamento",
  extravasamento_enfermagem:  "Extravasamento de contraste",
  reacoes_adversas:           "Reações adversas",
  livre:                      "Ocorrência Livre",
  queda:                      "Queda de Paciente",
  erro_identificacao_paciente:"Erro de Identificação",
  reacao_contraste_grave:     "Reação a Contraste",
  falha_equipamento_clinico:  "Falha de Equipamento",
  falha_comunicacao:          "Falha de Comunicação",
  evento_sentinela_livre:     "Evento Sentinela",
};

export const subtypesByType: Record<OccurrenceType, OccurrenceSubtype[]> = {
  administrativa:     ["faturamento", "agendamento"],
  revisao_exame:      ["revisao_exame"],
  enfermagem:         ["extravasamento_enfermagem", "reacoes_adversas"],
  paciente:           [],
  livre:              [],
  seguranca_paciente: ["queda", "erro_identificacao_paciente", "reacao_contraste_grave", "falha_equipamento_clinico", "falha_comunicacao", "evento_sentinela_livre"],
};

export const triageConfig: Record<TriageClassification, { label: string; description: string; color: string; priority: number }> = {
  circunstancia_risco: { label: "Circunstância de risco", description: "Situação com potencial de causar dano",                                    color: "bg-sky-50 text-sky-700 border-sky-200",         priority: 1 },
  near_miss:           { label: "Near Miss",              description: "Quase falha — interceptada antes de atingir o paciente",                    color: "bg-amber-50 text-amber-700 border-amber-200",   priority: 2 },
  incidente_sem_dano:  { label: "Incidente sem dano",     description: "Evento ocorreu mas não causou dano",                                        color: "bg-orange-50 text-orange-700 border-orange-200", priority: 3 },
  evento_adverso:      { label: "Evento adverso",         description: "Evento causou dano ao paciente",                                            color: "bg-red-50 text-red-700 border-red-200",         priority: 4 },
  evento_sentinela:    { label: "Evento sentinela",       description: "Evento grave, inesperado, com dano permanente ou óbito",                    color: "bg-red-100 text-red-800 border-red-300",         priority: 5 },
};

export const statusConfig: Record<OccurrenceStatus, { label: string; color: string; bg: string }> = {
  registrada:        { label: "Registrada",         color: "text-slate-500",   bg: "bg-slate-100 border-slate-200"         },
  em_triagem:        { label: "Em Triagem",          color: "text-amber-700",   bg: "bg-amber-50 border-amber-200"          },
  em_analise:        { label: "Em Análise",          color: "text-sky-700",     bg: "bg-sky-50 border-sky-200"              },
  acao_em_andamento: { label: "Ação em Andamento",   color: "text-orange-700",  bg: "bg-orange-50 border-orange-200"        },
  concluida:         { label: "Concluída",           color: "text-green-700",   bg: "bg-green-50 border-green-200"          },
  improcedente:      { label: "Improcedente",        color: "text-slate-400",   bg: "bg-slate-50 border-slate-200"          },
};

export const statusTransitions: Record<OccurrenceStatus, OccurrenceStatus[]> = {
  registrada:        ["em_triagem", "improcedente"],
  em_triagem:        ["em_analise", "improcedente"],
  em_analise:        ["acao_em_andamento", "concluida", "improcedente"],
  acao_em_andamento: ["concluida", "improcedente"],
  concluida:         [],
  improcedente:      [],
};

export const outcomeConfig: Record<OutcomeType, { label: string; requiresCapa: boolean }> = {
  imediato_correcao:  { label: "Imediato/Correção Pontual",       requiresCapa: false },
  orientacao:         { label: "Orientação",                       requiresCapa: false },
  treinamento:        { label: "Treinamento",                      requiresCapa: true  },
  alteracao_processo: { label: "Alteração de Processo/Protocolo",  requiresCapa: true  },
  manutencao_corretiva:{ label: "Manutenção Corretiva",            requiresCapa: true  },
  notificacao_externa:{ label: "Notificação Externa",              requiresCapa: false },
  improcedente:       { label: "Improcedente",                     requiresCapa: false },
};

export const requiresCapa = (outcomes: OutcomeType[]): boolean =>
  outcomes.some(o => outcomeConfig[o].requiresCapa);
