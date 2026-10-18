"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, ChevronRight, FileSearch, Plus, Search, ShieldCheck, Upload, X } from "lucide-react";
import type { Decision, DocumentExtraction, Invoice, InvoiceCreate, Policy } from "@/lib/api";
import { formatDate, formatMoney, latestDecision } from "@/lib/format";
import type { DashboardData } from "@/lib/use-dashboard-data";
import { EmptyState, PanelHeading, StatusBadge } from "@/components/ui/primitives";
import { HelpTip } from "@/components/ui/help-tip";

export function InvoicesView({
  data,
  busyId,
  onCreate,
  onEvaluate,
  onExtract,
}: {
  data: DashboardData;
  busyId: string | null;
  onCreate: (payload: InvoiceCreate) => Promise<Invoice>;
  onEvaluate: (invoiceId: string, policyId: string) => Promise<Decision>;
  onExtract: (file: File, channel: "auto" | "email" | "chat") => Promise<DocumentExtraction>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [policyId, setPolicyId] = useState(data.policies[0]?.id ?? "");

  useEffect(() => {
    if (!policyId && data.policies[0]) setPolicyId(data.policies[0].id);
  }, [data.policies, policyId]);

  const filtered = useMemo(() => data.invoices.filter((invoice) => {
    const decision = latestDecision(data.decisions[invoice.id]);
    const statusMatch = filter === "ALL" || (filter === "UNASSESSED" ? !decision : decision?.outcome === filter);
    const textMatch = `${invoice.external_reference} ${invoice.vendor_name}`.toLowerCase().includes(query.toLowerCase());
    return statusMatch && textMatch;
  }), [data.decisions, data.invoices, filter, query]);

  return <>
    <section className="page-intro page-intro-compact">
      <div><p className="eyebrow">Operaciones / Registro</p><h1>Facturas <HelpTip label="Facturas">Sube documentos en lote. La aplicación detecta el tipo de archivo, extrae los campos disponibles, registra la factura y la evalúa con la política de su moneda. Los datos incompletos se detienen para evitar una decisión insegura.</HelpTip></h1><p>Revisa resultados y aprobaciones pendientes.</p></div>
      <button className="button button-primary" disabled={data.policies.length === 0} title={data.policies.length ? "Registrar facturas desde documentos" : "Crea una política antes de ingresar facturas"} onClick={() => setShowForm((value) => !value)}><Plus size={16} />Registrar factura</button>
    </section>

    {data.policies.length === 0 && <section className="invoice-policy-required" role="status"><ShieldCheck size={18} /><div><strong>Configura una política antes de ingresar facturas</strong><p>Las facturas solo se pueden registrar y evaluar cuando existe al menos una política activa. Ve a <b>Políticas</b>, crea una y vuelve aquí.</p></div></section>}

    {showForm && <CreateInvoiceForm policies={data.policies} onExtract={onExtract} onCreate={onCreate} onEvaluate={onEvaluate} busyId={busyId} onCancel={() => setShowForm(false)} />}

    <section className="surface invoice-surface">
      <PanelHeading title="Registro de facturas" detail={`${filtered.length} de ${data.invoices.length} registros`} />
      <div className="table-toolbar">
        <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por proveedor o referencia" /></label>
        <label className="filter-field"><ArrowDownUp size={14} /><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filtrar facturas"><option value="ALL">Todos los estados</option><option value="UNASSESSED">Sin evaluar</option><option value="APPROVE">Aprobadas</option><option value="BLOCK">Bloqueadas</option><option value="ESCALATE">Revisión humana</option></select></label>
      </div>
      {filtered.length === 0 ? <EmptyState title="No hay facturas para mostrar" detail="Registra una factura o cambia los filtros de búsqueda." /> :
        <div className="table-scroll"><table className="data-table"><thead><tr><th>Referencia</th><th>Proveedor</th><th>Importe</th><th>Vencimiento</th><th>Resultado</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>
          {filtered.map((invoice) => {
            const decision = latestDecision(data.decisions[invoice.id]);
            const busy = busyId === invoice.id;
            return <tr key={invoice.id} onClick={() => setSelected(invoice)}>
              <td><strong>{invoice.external_reference}</strong><small>Recibida {formatDate(invoice.created_at)}</small></td>
              <td>{invoice.vendor_name}</td><td className="amount-cell">{formatMoney(invoice.amount, invoice.currency)}</td><td>{formatDate(invoice.due_date)}</td>
              <td><StatusBadge decision={decision} /></td>
              <td><div className="row-actions"><button className="icon-button row-open" title="Ver detalle" onClick={(event) => { event.stopPropagation(); setSelected(invoice); }}><ChevronRight size={17} /></button>
                <button className="text-action" disabled={busy || data.policies.length === 0} title={data.policies.length ? "Evaluar con la política seleccionada" : "Crea una política primero"} onClick={(event) => { event.stopPropagation(); if (policyId) void onEvaluate(invoice.id, policyId); }}>{busy ? "Evaluando…" : decision ? "Reevaluar" : "Evaluar"}</button>
              </div></td>
            </tr>;
          })}
        </tbody></table></div>}
      <div className="table-policy-select"><ShieldCheck size={14} /><span>Política para evaluar:</span>{data.policies.length === 0 ? <strong>No hay políticas activas</strong> : <select value={policyId} onChange={(event) => setPolicyId(event.target.value)} aria-label="Política para evaluar">{data.policies.map((policy) => <option key={policy.id} value={policy.id}>{policy.name} · {policy.currency}</option>)}</select>}</div>
    </section>

    {selected && <InvoiceDetail invoice={selected} decisions={data.decisions[selected.id] ?? []} policy={data.policies.find((item) => item.id === latestDecision(data.decisions[selected.id])?.policy_id)} onClose={() => setSelected(null)} />}
  </>;
}

function CreateInvoiceForm({ policies, onExtract, onCreate, onEvaluate, busyId, onCancel }: {
  policies: Policy[];
  onExtract: (file: File, channel: "auto" | "email" | "chat") => Promise<DocumentExtraction>;
  onCreate: (payload: InvoiceCreate) => Promise<Invoice>;
  onEvaluate: (invoiceId: string, policyId: string) => Promise<Decision>;
  busyId: string | null;
  onCancel: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  async function processFiles() {
    if (!files.length || policies.length === 0) return;
    setProcessing(true);
    setResults([]);
    const report: string[] = [];
    for (const file of files) {
      try {
        const extracted = await onExtract(file, "auto");
        const fields = extracted.fields;
        const missing = ["external_reference", "vendor_name", "amount", "currency", "due_date"]
          .filter((key) => !fields[key as keyof typeof fields]);
        if (missing.length || !extracted.ready_for_review) {
          report.push(`${file.name}: pendiente de revisión; faltan ${missing.join(", ") || "datos legibles"}. No se registró ni evaluó.`);
          continue;
        }
        const policy = policies.find((item) => item.currency === fields.currency);
        if (!policy) {
          report.push(`${file.name}: no existe una política activa para ${fields.currency}. No se registró.`);
          continue;
        }
        const invoice = await onCreate({
          external_reference: fields.external_reference!,
          vendor_name: fields.vendor_name!,
          amount: fields.amount!,
          currency: fields.currency!,
          due_date: fields.due_date!,
          agreement_reference: fields.agreement_reference,
          source_filename: extracted.source_filename,
          source_type: extracted.source_type,
          source_text: extracted.extracted_text,
        });
        const decision = await onEvaluate(invoice.id, policy.id);
        report.push(`${file.name}: ${decision.outcome} — ${invoice.external_reference}. ${decision.explanation}`);
      } catch (caught) {
        report.push(`${file.name}: ${caught instanceof Error ? caught.message : "falló el procesamiento"}.`);
      }
      setResults([...report]);
    }
    setProcessing(false);
  }

  return <section className="surface create-invoice-form">
    <div className="form-heading"><div><p className="eyebrow">Ingreso automático</p><h2>Subir facturas</h2><p>Selecciona uno o varios documentos. El sistema detecta el canal, extrae datos, registra y evalúa cada factura con la política de su moneda.</p></div><button type="button" className="icon-button" onClick={onCancel} aria-label="Cerrar formulario"><X size={18} /></button></div>
    {policies.length === 0 ? <div className="invoice-policy-required" role="alert"><ShieldCheck size={18} /><div><strong>No se pueden ingresar facturas todavía</strong><p>Crea primero una política de pago activa. Cada documento debe tener reglas aplicables antes de registrarse y evaluarse.</p></div></div> : <section className="document-ingest">
      <div className="document-ingest-title"><FileSearch size={16} /><div><strong>Ingreso de documentos</strong><small>Admite PDF, PNG/JPG, correo .eml y texto .txt. La selección es local; el archivo se envía al backend al procesarlo.</small></div></div>
      <div className="document-upload-step"><div><strong>1. Selecciona los documentos</strong><small>Puedes elegir uno o varios archivos a la vez.</small></div><label className="button button-secondary document-select-button"><Upload size={14} />Seleccionar archivos<input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.eml,.txt,application/pdf,image/png,image/jpeg,message/rfc822,text/plain" disabled={processing || Boolean(busyId)} onChange={(event) => { setFiles(Array.from(event.target.files ?? [])); setResults([]); }} /></label></div>
      {files.length > 0 && <div className="document-selected-list" aria-live="polite"><strong>{files.length} {files.length === 1 ? "archivo seleccionado" : "archivos seleccionados"}</strong><span>{files.map((file) => file.name).join(" · ")}</span></div>}
      <div className="document-process-step"><div><strong>2. Procesa las facturas</strong><small>Extrae los datos, registra cada factura y aplica la política de su moneda. Solo los casos ESCALATE requieren aprobación humana.</small></div><button type="button" className="button button-primary" disabled={!files.length || processing || Boolean(busyId)} onClick={() => void processFiles()}><FileSearch size={14} />{processing ? "Procesando documentos…" : `Procesar ${files.length || "documentos"}`}</button></div>
    </section>}
    {results.length > 0 && <div className="extraction-review" role="status"><strong>Resultado por archivo</strong>{results.map((result) => <span key={result}>{result}</span>)}</div>}
    <div className="form-actions"><button type="button" className="button button-secondary" onClick={onCancel}>Cerrar</button></div>
  </section>;
}

function InvoiceDetail({ invoice, decisions, policy, onClose }: { invoice: Invoice; decisions: Decision[]; policy?: Policy; onClose: () => void }) {
  const current = latestDecision(decisions);
  const agreementTerm = policy?.vendor_terms.find((term) => term.vendor_name.toLocaleLowerCase() === invoice.vendor_name.toLocaleLowerCase() && term.agreement_reference.toLocaleLowerCase() === invoice.agreement_reference?.toLocaleLowerCase());
  return <div className="modal-scrim" onClick={onClose}><section className="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="invoice-detail-title" onClick={(event) => event.stopPropagation()}>
    <div className="dialog-top"><div><p className="eyebrow">Detalle de factura</p><h2 id="invoice-detail-title">{invoice.external_reference}</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar detalle"><X size={18} /></button></div>
    <div className="detail-pair"><span>Proveedor</span><strong>{invoice.vendor_name}</strong></div><div className="detail-pair"><span>Importe</span><strong>{formatMoney(invoice.amount, invoice.currency)}</strong></div><div className="detail-pair"><span>Vencimiento</span><strong>{formatDate(invoice.due_date)}</strong></div><div className="detail-pair"><span>Estado</span><StatusBadge decision={current} /></div>
    {invoice.agreement_reference && <div className="detail-pair"><span>Acuerdo</span><strong>{invoice.agreement_reference}{agreementTerm ? ` · pactado ${agreementTerm.currency} ${agreementTerm.agreed_amount}` : " · sin término configurado"}</strong></div>}
    {invoice.source_filename && <section className="decision-box"><div className="decision-box-title"><FileSearch size={16} /><span>Documento recibido</span></div><strong>{invoice.source_filename}</strong><small>Canal: {invoice.source_type}</small>{invoice.source_text && <details><summary>Ver contenido extraído</summary><pre>{invoice.source_text}</pre></details>}</section>}
    {current && <section className="decision-box"><div className="decision-box-title"><ShieldCheck size={16} /><span>Resultado de evaluación</span></div><strong>{policy?.name ?? current.policy_snapshot.name}</strong><p>{current.explanation}</p><small>{current.reason_codes.join(" · ")}</small></section>}
    {decisions.length > 0 && <section className="history-block"><h3>Historial de decisiones</h3>{[...decisions].reverse().map((decision) => <div className="history-entry" key={decision.id}><StatusBadge decision={decision} /><span>{decision.explanation}</span><time>{formatDate(decision.created_at)}</time></div>)}</section>}
    {!current && <p className="detail-hint">Esta factura todavía no ha sido evaluada. Selecciona una política desde el registro de facturas.</p>}
  </section></div>;
}
