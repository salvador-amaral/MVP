import type {
  RequestItemStatus,
  RequestStatus,
  TemplateItemType,
  UserRole,
} from "@/types/database";

// Central place for human readable, PT-first labels used across the app.
// English support will be layered on top later (kept centralized to make it
// trivial to swap in an i18n dictionary).

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  in_progress: "Em progresso",
  completed: "Concluído",
  expired: "Expirado",
};

export const REQUEST_STATUS_BADGE_STYLES: Record<
  RequestStatus,
  "slate" | "blue" | "amber" | "green" | "red"
> = {
  draft: "slate",
  sent: "blue",
  in_progress: "amber",
  completed: "green",
  expired: "red",
};

export const REQUEST_ITEM_STATUS_LABELS: Record<RequestItemStatus, string> = {
  pending: "Pendente",
  uploaded: "Carregado",
  accepted: "Aceite",
  rejected: "Rejeitado",
};

export const REQUEST_ITEM_STATUS_BADGE_STYLES: Record<
  RequestItemStatus,
  "slate" | "blue" | "green" | "red"
> = {
  pending: "slate",
  uploaded: "blue",
  accepted: "green",
  rejected: "red",
};

export const TEMPLATE_ITEM_TYPE_LABELS: Record<TemplateItemType, string> = {
  file: "Ficheiro",
  text: "Texto",
  number: "Número",
  checkbox: "Caixa de seleção",
};

export const TEMPLATE_ITEM_TYPE_DESCRIPTIONS: Record<TemplateItemType, string> = {
  file: "O cliente carrega um documento (PDF, imagem, Excel…)",
  text: "O cliente escreve uma resposta curta",
  number: "O cliente introduz um valor numérico",
  checkbox: "O cliente marca uma caixa para confirmar",
};

export const DEFAULT_DUE_DAYS = 14;
