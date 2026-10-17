"use client";

import { Fragment, useState } from "react";
import { Activity, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { HelpTip } from "@/components/ui/help-tip";
import type { DashboardData } from "@/lib/use-dashboard-data";
import { auditActionLabel, formatDate } from "@/lib/format";
import { EmptyState, PanelHeading } from "@/components/ui/primitives";

export function AuditView({ data }: { data: DashboardData }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [order, setOrder] = useState<"newest" | "oldest">("newest");
  const events = [...data.events].sort((left, right) => order === "newest"
    ? right.created_at.localeCompare(left.created_at)
    : left.created_at.localeCompare(right.created_at));
  const invoices = new Map(data.invoices.map((invoice) => [invoice.id, invoice]));
  const decisions = new Map(Object.values(data.decisions).flat().map((decision) => [decision.id, decision]));
  return <>
    <section className="page-intro page-intro-compact"><div><p className="eyebrow">Control / Trazabilidad</p><h1>Registro de actividad <HelpTip label="Registro de actividad">Historial cronológico de registros, evaluaciones, bloqueos y decisiones humanas. Abre una fila para consultar la explicación, política aplicada y datos de origen.</HelpTip></h1><p>Eventos emitidos por las operaciones del backend.</p></div><span className="audit-total"><Activity size={15} />{data.events.length} eventos</span></section>
    <section className="surface audit-surface"><PanelHeading title="Eventos recientes" detail={order === "newest" ? "Más recientes primero" : "Más antiguos primero"} action={<label className="filter-field"><span>Orden</span><select value={order} onChange={(event) => setOrder(event.target.value as "newest" | "oldest")} aria-label="Ordenar eventos"><option value="newest">Más recientes</option><option value="oldest">Más antiguos</option></select></label>} />
      {events.length === 0 ? <EmptyState title="Todavía no hay eventos" detail="El registro se llenará al crear y evaluar facturas o resolver aprobaciones." /> : <div className="audit-table-wrap"><table className="data-table audit-table"><thead><tr><th>Evento</th><th>Entidad</th><th>Actor</th><th>Fecha</th></tr></thead><tbody>
        {events.map((event) => {
          const decision = event.entity_type === "decision" ? decisions.get(event.entity_id) : undefined;
          const approval = event.entity_type === "approval" ? data.approvalHistory.find((item) => item.id === event.entity_id) : undefined;
          const invoiceId = event.entity_type === "invoice" ? event.entity_id : decision?.invoice_id ?? approval?.invoice_id ?? "";
          const invoice = invoices.get(invoiceId);
          const entityLabel = invoice?.external_reference ?? `${event.entity_type} · ${event.entity_id.slice(0, 8)}`;
          const actor = event.actor === "policy-engine" ? "Motor de políticas" : event.actor === "api" ? "API" : event.actor;
          const history = invoiceId ? data.decisions[invoiceId] ?? [] : [];
          const eventDecision = event.entity_type === "decision"
            ? decisions.get(event.entity_id)
            : approval
              ? approval.status === "PENDING"
                ? decisions.get(approval.decision_id)
                : history.find((item) => item.reason_codes.some((code) => code.startsWith("HUMAN_"))) ?? decisions.get(approval.decision_id)
              : history[history.length - 1];
          const agreementTerm = eventDecision?.policy_snapshot.vendor_terms.find(
            (term) => term.vendor_name.toLocaleLowerCase() === invoice?.vendor_name.toLocaleLowerCase()
              && term.agreement_reference.toLocaleLowerCase() === invoice?.agreement_reference?.toLocaleLowerCase(),
          );
          const expanded = expandedId === event.id;
          return <Fragment key={event.id}>
            <tr>
              <td><button type="button" className="audit-event-toggle" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? null : event.id)}><span className={`event-pin ${event.action.includes("BLOCK") || event.action.includes("CANCEL") ? "pin-warn" : event.action.includes("APPROVE") ? "pin-good" : ""}`} />{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{auditActionLabel(event.action)}</button></td>
              <td><span className="audit-entity"><FileText size={14} />{entityLabel}</span></td><td>{actor}</td><td>{formatDate(event.created_at)}</td>
            </tr>
            {expanded && <tr key={`${event.id}-details`} className="audit-detail-row"><td colSpan={4}><div className="audit-detail-grid">
              <section><h3>Decisión y explicación</h3>{eventDecision ? <><strong>{eventDecision.outcome}</strong><p>{eventDecision.explanation}</p><small>{eventDecision.reason_codes.join(" · ")}</small><p>Política: {eventDecision.policy_snapshot.name} · versión {eventDecision.policy_version}</p>{agreementTerm && <p>Término controlado: {agreementTerm.agreement_reference} · acordado {agreementTerm.currency} {agreementTerm.agreed_amount}</p>}</> : <p>{approval?.resolution_reason ?? "Este evento no tiene una decisión asociada."}</p>}</section>
              <section><h3>Factura de origen</h3>{invoice ? <><strong>{invoice.external_reference} · {invoice.vendor_name}</strong><p>{invoice.amount} {invoice.currency} · vence {invoice.due_date}</p>{invoice.agreement_reference && <p>Referencia {invoice.agreement_reference} contrastada contra los términos de la política.</p>}{invoice.source_filename && <p>Documento: {invoice.source_filename} ({invoice.source_type})</p>}{invoice.source_text && <details><summary>Contenido extraído del documento</summary><pre>{invoice.source_text}</pre></details>}</> : <p>No hay factura activa vinculada a este evento.</p>}</section>
              <section><h3>Evento registrado</h3><p>Actor: {actor}</p><p>Fecha: {formatDate(event.created_at)}</p><details><summary>Metadatos</summary><pre>{JSON.stringify(event.details, null, 2)}</pre></details>{approval?.resolved_by && <p>Resuelto por {approval.resolved_by}: {approval.resolution_reason}</p>}</section>
            </div></td></tr>}
          </Fragment>;
        })}
      </tbody></table></div>}
    </section>
  </>;
}
