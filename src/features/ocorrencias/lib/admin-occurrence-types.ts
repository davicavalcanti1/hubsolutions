import type { LucideIcon } from "lucide-react";
import { Clock, AlertTriangle, Shirt, FileText } from "lucide-react";

export interface AdminSubtype {
  id: string;
  label: string;
}

export interface AdminType {
  id: string;
  label: string;
  icon: LucideIcon;
  subtypes: AdminSubtype[];
}

export const ADMIN_OCCURRENCE_TYPES: AdminType[] = [
  {
    id: "atraso-falta",
    label: "Atraso / Falta",
    icon: Clock,
    subtypes: [
      { id: "atraso-recorrente",       label: "Atraso recorrente" },
      { id: "falta-sem-justificativa", label: "Falta sem justificativa" },
      { id: "saida-antecipada",        label: "Saída antecipada sem autorização" },
    ],
  },
  {
    id: "descumprimento-horario",
    label: "Descumprimento de Horário / Pausa",
    icon: Clock,
    subtypes: [
      { id: "nao-cumprimento-intervalo", label: "Não cumprimento de intervalo obrigatório" },
      { id: "retorno-fora-horario",      label: "Retorno fora do horário" },
      { id: "registro-incorreto-ponto",  label: "Registro incorreto de ponto" },
    ],
  },
  {
    id: "conduta-inadequada",
    label: "Conduta Inadequada",
    icon: AlertTriangle,
    subtypes: [
      { id: "uso-indevido-celular", label: "Uso indevido de celular" },
      { id: "falta-postura",        label: "Falta de postura profissional" },
      { id: "desrespeito",          label: "Desrespeito a colegas, líderes ou pacientes" },
    ],
  },
  {
    id: "uniforme-apresentacao",
    label: "Uniforme / Apresentação",
    icon: Shirt,
    subtypes: [
      { id: "nao-uso-uniforme",    label: "Não uso de uniforme completo" },
      { id: "uniforme-inadequado", label: "Uniforme inadequado ou sem identificação" },
    ],
  },
  {
    id: "procedimentos-internos",
    label: "Procedimentos Internos",
    icon: FileText,
    subtypes: [
      { id: "descumprimento-normas",       label: "Descumprimento de normas do setor" },
      { id: "nao-seguir-orientacoes",      label: "Não seguir orientações da coordenação/RH" },
    ],
  },
];
