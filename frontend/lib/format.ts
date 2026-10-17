import type { Decision, Invoice } from "@/lib/api";

export function latestDecision(
  decisions: Decision[] | undefined,
): Decision | undefined {
  return decisions?.at(-1);
}

export function formatMoney(amount: string | number, currency: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `${amount} ${currency}`;
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toLocaleString("es-CO")} ${currency}`;
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(isDateOnly ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(date);
}

export function invoiceStatusLabel(invoice: Invoice, decision?: Decision): string {
  if (!decision) return "Sin evaluar";
  const labels = {
    APPROVE: "Aprobada",
    BLOCK: "Bloqueada",
    ESCALATE: "Revisión humana",
  };
  return labels[decision.outcome];
}

export function auditActionLabel(action: string): string {
  const labels: Record<string, string> = {
    POLICY_CREATED: "Política creada",
    POLICY_UPDATED: "Política actualizada",
    POLICY_DELETED: "Política archivada",
    INVOICE_CREATED: "Factura recibida",
    INVOICE_UPDATED: "Factura actualizada",
    INVOICE_DELETED: "Factura archivada",
    INVOICE_EVALUATED: "Factura evaluada",
    APPROVAL_REQUESTED: "Aprobación solicitada",
    APPROVAL_APPROVED: "Aprobación aprobada",
    APPROVAL_REJECTED: "Solicitud rechazada",
    APPROVAL_CANCELED: "Aprobación cancelada",
  };
  return labels[action] ?? action.replaceAll("_", " ").toLowerCase();
}
