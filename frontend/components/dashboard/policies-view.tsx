"use client";

import { useState } from "react";
import { AlertCircle, ArrowRight, FilePlus2, Pencil, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import type { Policy, PolicyCreate } from "@/lib/api";
import type { DashboardData } from "@/lib/use-dashboard-data";
import { EmptyState, PanelHeading } from "@/components/ui/primitives";
import { HelpTip } from "@/components/ui/help-tip";
import { syntheticInvoicePolicy } from "@/lib/synthetic-policy";

export function PoliciesView({
  data,
  busy,
  onSave,
  onLoadSyntheticPolicy,
  onDelete,
  onNavigate,
}: {
  data: DashboardData;
  busy: boolean;
  onSave: (payload: PolicyCreate, policyId?: string) => Promise<void>;
  onLoadSyntheticPolicy: () => Promise<void>;
  onDelete: (policyId: string) => Promise<void>;
  onNavigate: (view: "invoices") => void;
}) {
  const [selected, setSelected] = useState<Policy | "new" | null>(null);
  const [error, setError] = useState("");
  const demoPolicyExists = data.policies.some((policy) => policy.name === syntheticInvoicePolicy.name && policy.currency === syntheticInvoicePolicy.currency);

  async function addSyntheticPolicy() {
    setError("");
    try {
      await onLoadSyntheticPolicy();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo agregar la política de prueba.");
    }
  }

  async function removePolicy(policy: Policy) {
    const confirmed = window.confirm(`La política “${policy.name}” dejará de estar activa. Se conservarán las decisiones históricas y se cancelarán las aprobaciones pendientes asociadas. ¿Continuar?`);
    if (!confirmed) return;
    setError("");
    try {
      await onDelete(policy.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo eliminar la política.");
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const values = new FormData(event.currentTarget);
    try {
      const payload: PolicyCreate = {
      name: String(values.get("name") ?? "").trim(),
      currency: String(values.get("currency") ?? "USD"),
      allowed_vendors: String(values.get("vendors") ?? "").split(/[\n,;]/).map((name) => name.trim()).filter(Boolean),
      vendor_terms: String(values.get("vendorTerms") ?? "").split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
        const [vendor_name, agreement_reference, currency, agreed_amount] = line.split("|").map((part) => part.trim());
        if (!vendor_name || !agreement_reference || !currency || !agreed_amount) {
          throw new Error("Cada término debe usar: proveedor | referencia de acuerdo | moneda | importe acordado.");
        }
        return { vendor_name, agreement_reference, currency, agreed_amount };
      }),
      max_invoice_amount: String(values.get("maxInvoice") ?? ""),
      period_budget: String(values.get("budget") ?? ""),
      human_approval_threshold: String(values.get("threshold") ?? ""),
      approver_ids: String(values.get("approvers") ?? "demo-approver").split(/[\n,;]/).map((name) => name.trim()).filter(Boolean),
      };
      await onSave(payload, selected && selected !== "new" ? selected.id : undefined);
      setSelected(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar la política.");
    }
  }

  return <>
    <section className="page-intro page-intro-compact">
      <div><p className="eyebrow">Configuración / Reglas</p><h1>Políticas de pago <HelpTip label="Políticas de pago">Reglas que se aplican a cada factura: moneda, proveedores permitidos, acuerdos, máximo individual, presupuesto acumulado y umbral de aprobación humana.</HelpTip></h1><p>Define los límites que determinan cuándo aprobar, bloquear o escalar.</p><p className="policy-demo-hint">La política de prueba USD es compatible con los documentos de <code>synthetic-invoices/</code>.</p></div>
      <div className="policy-header-actions">
        {demoPolicyExists ? <button type="button" className="button button-secondary" onClick={() => onNavigate("invoices")}><ArrowRight size={15} />Subir facturas de prueba</button> : <button type="button" className="button button-secondary" disabled={busy} onClick={() => void addSyntheticPolicy()}><FilePlus2 size={15} />{busy ? "Agregando…" : "Agregar política de prueba"}</button>}
        <button type="button" className="button button-primary" onClick={() => { setError(""); setSelected("new"); }}><Plus size={15} />Nueva política</button>
      </div>
    </section>

    {selected && <form className="surface policy-form" onSubmit={(event) => void save(event)}>
      <div className="form-heading"><div><p className="eyebrow">{selected === "new" ? "Nuevo conjunto de reglas" : `Versión ${selected.version}`}</p><h2>{selected === "new" ? "Crear política" : "Editar política"}</h2><p>El motor determinista evalúa cada factura contra estos valores.</p></div><button type="button" className="icon-button" onClick={() => setSelected(null)} aria-label="Cerrar formulario"><X size={17} /></button></div>
      <div className="form-grid">
        <label>Nombre<input name="name" required maxLength={120} defaultValue={selected === "new" ? "" : selected.name} placeholder="Política de cuentas por pagar" /></label>
        <label>Moneda<select name="currency" defaultValue={selected === "new" ? "USD" : selected.currency}><option value="USD">USD · Dólar</option><option value="COP">COP · Peso colombiano</option><option value="EUR">EUR · Euro</option></select></label>
        <label>Máximo por factura <HelpTip label="Máximo por factura">Límite individual. Si una factura lo supera, se bloquea y nunca se aprueba automáticamente.</HelpTip><input name="maxInvoice" type="number" min="0.01" step="0.01" required defaultValue={selected === "new" ? "20000" : selected.max_invoice_amount} /></label>
        <label>Presupuesto del periodo <HelpTip label="Presupuesto del periodo">Tope total de facturas aprobadas para esta política. En esta versión se acumula con las facturas aprobadas que conserva el espacio local; no hay reinicio mensual automático ni pagos reales.</HelpTip><input name="budget" type="number" min="0.01" step="0.01" required defaultValue={selected === "new" ? "15000" : selected.period_budget} /><small>Se compara contra el total aprobado registrado en este espacio.</small></label>
        <label>Umbral de aprobación humana<input name="threshold" type="number" min="0.01" step="0.01" required defaultValue={selected === "new" ? "5000" : selected.human_approval_threshold} /></label>
        <label>Aprobadores autorizados<input name="approvers" required defaultValue={selected === "new" ? "demo-approver" : selected.approver_ids.join(", ")} placeholder="demo-approver" /></label>
        <label className="policy-vendors-field">Proveedores permitidos <small>Separados por coma o salto de línea</small><textarea name="vendors" required rows={3} defaultValue={selected === "new" ? "" : selected.allowed_vendors.join("\n")} placeholder="Andes Field Services LLC" /></label>
        <label className="policy-vendors-field">Acuerdos controlados por la empresa <small>Una línea: proveedor | referencia | moneda | importe acordado</small><textarea name="vendorTerms" rows={3} defaultValue={selected === "new" ? "" : selected.vendor_terms.map((term) => `${term.vendor_name} | ${term.agreement_reference} | ${term.currency} | ${term.agreed_amount}`).join("\n")} placeholder="Pacific Ledger Support LLC | NS-PO-902 | USD | 4200.00" /></label>
      </div>
      {error && <p className="inline-error"><AlertCircle size={15} />{error}</p>}
      <p className="policy-safety-note"><ShieldCheck size={14} />No se realizan pagos. Cambiar una política genera una nueva versión; las decisiones previas conservan la versión aplicada.</p>
      <div className="form-actions"><button type="button" className="button button-secondary" onClick={() => setSelected(null)}>Cancelar</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? "Guardando…" : "Guardar política"}</button></div>
    </form>}

    {error && !selected && <p className="inline-error"><AlertCircle size={15} />{error}</p>}

    {!selected && <section className="surface policy-list-surface">
      <PanelHeading title="Reglas disponibles" detail={`${data.policies.length} políticas activas`} />
      {data.policies.length === 0 ? <EmptyState title="Todavía no hay políticas" detail="Crea una política ficticia para poder evaluar facturas." /> : <div className="policy-list">
        {data.policies.map((policy) => <article className="policy-card" key={policy.id}>
          <div className="policy-card-main"><div className="policy-card-icon"><ShieldCheck size={17} /></div><div><h2>{policy.name}</h2><p>Versión {policy.version} · {policy.currency} · {policy.allowed_vendors.length} proveedores · {policy.vendor_terms.length} acuerdos</p></div></div>
          <div className="policy-limits"><span><small>Máximo / factura</small><strong>{policy.max_invoice_amount}</strong></span><span><small>Tope acumulado <HelpTip label="Tope acumulado">Suma de las facturas aprobadas por esta política en el estado guardado. El MVP no abre ni reinicia periodos calendario automáticamente.</HelpTip></small><strong>{policy.period_budget}</strong></span><span><small>Escalar desde</small><strong>{policy.human_approval_threshold}</strong></span></div>
          <div className="policy-card-actions"><button type="button" className="button button-secondary policy-edit-button" onClick={() => { setError(""); setSelected(policy); }}><Pencil size={14} />Editar</button><button type="button" className="button button-danger-secondary" disabled={busy} onClick={() => void removePolicy(policy)}><Trash2 size={14} />Eliminar</button></div>
        </article>)}
      </div>}
    </section>}
  </>;
}
