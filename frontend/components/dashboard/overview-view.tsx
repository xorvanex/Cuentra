import { ArrowUpRight, AlertTriangle, CheckCircle2, Clock3, FileText, ShieldX, Trash2 } from "lucide-react";
import type { DashboardData } from "@/lib/use-dashboard-data";
import { auditActionLabel, formatDate, formatMoney, latestDecision } from "@/lib/format";
import { EmptyState, PanelHeading, StatusBadge } from "@/components/ui/primitives";
import type { ViewKey } from "@/components/dashboard/app-shell";

export function OverviewView({ data, onNavigate, onReset, resetBusy }: { data: DashboardData; onNavigate: (view: ViewKey) => void; onReset: () => void; resetBusy: boolean }) {
  const approved = data.invoices.filter((invoice) => latestDecision(data.decisions[invoice.id])?.outcome === "APPROVE").length;
  const blocked = data.invoices.filter((invoice) => latestDecision(data.decisions[invoice.id])?.outcome === "BLOCK").length;
  const reviewed = Object.values(data.decisions).flat().length;
  const date = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return <>
    <section className="page-intro">
      <div><p className="eyebrow">{date}</p><h1>Control de operaciones</h1><p>Facturas evaluadas, excepciones y decisiones en un mismo lugar.</p></div>
      <div className="page-intro-actions"><button className="button button-secondary" disabled={resetBusy} onClick={onReset} title="Borra los datos de este espacio de navegador"><Trash2 size={15} />{resetBusy ? "Reiniciando…" : "Reiniciar mis datos"}</button><button className="button button-primary" onClick={() => onNavigate("invoices")}><FileText size={16} />Abrir facturas<ArrowUpRight size={15} /></button></div>
    </section>

    <section className="summary-strip" aria-label="Resumen de facturas">
      <Summary label="Facturas" value={data.invoices.length} detail="Registros activos" icon={FileText} />
      <Summary label="Aprobadas" value={approved} detail="Última decisión" icon={CheckCircle2} tone="green" />
      <Summary label="Bloqueadas" value={blocked} detail="Por reglas de política" icon={ShieldX} tone="red" />
      <Summary label="Por revisar" value={data.approvals.length} detail="Requieren una persona" icon={Clock3} tone="amber" />
    </section>

    <div className="overview-grid">
      <section className="surface activity-surface">
        <PanelHeading title="Actividad reciente" detail={`${reviewed} decisiones registradas`} action={<button className="quiet-link" onClick={() => onNavigate("audit")}>Ver registro <ArrowUpRight size={14} /></button>} />
        {data.events.length === 0 ? <EmptyState title="Sin actividad todavía" detail="Las evaluaciones y acciones aparecerán aquí." /> :
          <div className="activity-feed">{data.events.slice(0, 7).map((event) => {
            const decision = Object.values(data.decisions).flat().find((item) => item.id === event.entity_id);
            const approval = data.approvalHistory.find((item) => item.id === event.entity_id);
            const invoiceId = event.entity_type === "invoice" ? event.entity_id : decision?.invoice_id ?? approval?.invoice_id;
            const invoice = data.invoices.find((item) => item.id === invoiceId);
            const actor = event.actor === "policy-engine" ? "Motor de políticas" : event.actor === "api" ? "API" : event.actor;
            return <article className="activity-item" key={event.id}>
              <span className={`event-pin ${event.action.includes("BLOCK") || event.action.includes("CANCEL") ? "pin-warn" : event.action.includes("APPROVE") ? "pin-good" : ""}`} />
              <div className="activity-copy"><strong>{auditActionLabel(event.action)}</strong><span>{invoice?.external_reference ?? `${event.entity_type} · ${event.entity_id.slice(0, 8)}`} · {actor}</span></div>
              <time>{formatDate(event.created_at)}</time>
            </article>;
          })}</div>}
      </section>

      <section className="surface attention-surface">
        <PanelHeading title="Requieren atención" detail="Solicitudes escaladas por las reglas" action={data.approvals.length > 0 ? <span className="count-tag">{data.approvals.length}</span> : undefined} />
        {data.approvals.length === 0 ? <EmptyState title="No hay pendientes" detail="Las facturas que requieren aprobación humana aparecerán aquí." /> :
          <div className="attention-list">{data.approvals.slice(0, 5).map((approval) => {
            const invoice = data.invoices.find((item) => item.id === approval.invoice_id);
            const decision = latestDecision(data.decisions[approval.invoice_id]);
            return <button className="attention-item" key={approval.id} onClick={() => onNavigate("approvals")}>
              <span><strong>{invoice?.external_reference ?? approval.invoice_id.slice(0, 8)}</strong><small>{invoice?.vendor_name ?? "Factura no disponible"}</small></span>
              <span className="attention-value">{invoice ? formatMoney(invoice.amount, invoice.currency) : ""}<StatusBadge decision={decision} /></span>
            </button>;
          })}</div>}
        <div className="policy-footnote"><AlertTriangle size={14} /><span>Las decisiones se basan en las políticas activas del backend.</span></div>
      </section>
    </div>
  </>;
}

function Summary({ label, value, detail, icon: Icon, tone = "blue" }: { label: string; value: number; detail: string; icon: typeof FileText; tone?: "blue" | "green" | "red" | "amber" }) {
  return <article className="summary-item"><span className={`summary-icon tone-${tone}`}><Icon size={17} strokeWidth={1.8} /></span><div><span className="summary-label">{label}</span><strong>{value}</strong><small>{detail}</small></div></article>;
}
