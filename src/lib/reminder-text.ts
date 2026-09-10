import type { Request } from "@/types/database";

/** Human readable, PT reminder reason used in reminder emails. */
export function reminderReason(request: Request): string {
  if (request.due_date) {
    return `A data limite para a entrega dos documentos é ${formatDate(request.due_date)}.`;
  }
  return "Ainda temos documentação sua por receber.";
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
