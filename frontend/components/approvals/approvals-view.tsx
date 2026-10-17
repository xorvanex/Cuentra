"use client";

import { useState } from "react";
import { AlertTriangle, Check, Clock3, FileText, ShieldCheck, X, XCircle } from "lucide-react";
import type { FinalOutcome } from "@/lib/api";
import { formatDate, formatMoney, latestDecision } from "@/lib/format";
import type { DashboardData } from "@/lib/use-dashboard-data";
import { EmptyState, PanelHeading, StatusBadge } from "@/components/ui/primitives";
import { HelpTip } from "@/components/ui/help-tip";

export function ApprovalsView({ data, busyId, onResolve }: { data: DashboardData; busyId: string | null; onResolve: (id: string, outcome: FinalOutcome, reason: string) => Promise<void> }) {
  return <>
    <section className="page-intro page-intro-compact"><div><p className="eyebrow">Operaciones / Excepciones</p><h1>Aprobaciones <HelpTip label="Aprobaciones">Aquí aparecen únicamente facturas escaladas por una regla, por ejemplo porque superan el umbral humano. Revisa el motivo y decide aprobar o bloquear; la decisión requiere dejar una explicación.</HelpTip></h1><p>Solicitudes que el motor escaló para revisión humana.</p></div><span className="queue-count"><Clock3 size={16} />{data.approvals.length} pendientes</span></section>
    {data.approvals.length === 0 ? <section className="surface"><EmptyState title="Cola despejada" detail="Las facturas que requieran una decisión humana aparecerán aquí después de evaluarlas." /></section> :
      <div className="approval-stack">{data.approvals.map((approval) => {
        const invoice = data.invoices.find((item) => item.id === approval.invoice_id);
        const policy = data.policies.find((item) => item.id === approval.policy_id);
        const decision = latestDecision(data.decisions[approval.invoice_id]);
        return <ApprovalCard key={approval.id} approvalId={approval.id} reference={invoice?.external_reference ?? approval.invoice_id} vendor={invoice?.vendor_name ?? "Factura no disponible"} amount={invoice ? formatMoney(invoice.amount, invoice.currency) : "—"} policy={policy?.name ?? decision?.policy_snapshot.name ?? "Política"} reason={decision?.explanation ?? "La evaluación requiere revisión humana."} requestedAt={approval.requested_at} busy={busyId === approval.id} onResolve={onResolve} />;
      })}</div>}
    <p className="approval-disclaimer"><ShieldCheck size={14} />La identidad de aprobación es demostrativa en este backend local (<code>demo-approver</code>); no equivale a autenticación.</p>
  </>;
}

function ApprovalCard({ approvalId, reference, vendor, amount, policy, reason, requestedAt, busy, onResolve }: { approvalId: string; reference: string; vendor: string; amount: string; policy: string; reason: string; requestedAt: string; busy: boolean; onResolve: (id: string, outcome: FinalOutcome, reason: string) => Promise<void> }) {
  const [resolution, setResolution] = useState<FinalOutcome | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [error, setError] = useState("");

  async function confirm() {
    if (!resolution || !reasonText.trim()) return;
    setError("");
    try {
      await onResolve(approvalId, resolution, reasonText.trim());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo resolver la aprobación.");
    }
  }

  return <article className="surface approval-card">
    <header className="approval-card-head"><div><p className="eyebrow">{reference}</p><h2>{vendor}</h2></div><strong>{amount}</strong></header>
    <div className="approval-rationale"><AlertTriangle size={16} /><div><span>Motivo de evaluación</span><p>{reason}</p></div></div>
    <div className="approval-meta"><span><FileText size={14} />{policy}</span><span><Clock3 size={14} />Recibida {formatDate(requestedAt)}</span></div>
    {resolution ? <div className="resolution-form"><div className="resolution-form-heading"><strong>{resolution === "APPROVE" ? "Aprobar factura" : "Bloquear factura"}</strong><button className="icon-button" onClick={() => setResolution(null)} aria-label="Cancelar resolución"><X size={16} /></button></div><label htmlFor={`reason-${approvalId}`}>Motivo, obligatorio</label><textarea id={`reason-${approvalId}`} value={reasonText} maxLength={1000} onChange={(event) => setReasonText(event.target.value)} placeholder="Deja constancia de la decisión" rows={3} />{error && <p className="inline-error">{error}</p>}<div className="resolution-actions"><button className="button button-secondary" onClick={() => setResolution(null)}>Cancelar</button><button className={`button ${resolution === "APPROVE" ? "button-primary" : "button-danger"}`} disabled={!reasonText.trim() || busy} onClick={() => void confirm()}>{busy ? "Procesando…" : "Confirmar decisión"}</button></div></div> :
      <div className="approval-actions"><button className="button button-secondary button-reject" onClick={() => setResolution("BLOCK")}><XCircle size={15} />Bloquear</button><button className="button button-primary" onClick={() => setResolution("APPROVE")}><Check size={15} />Aprobar</button></div>}
  </article>;
}
