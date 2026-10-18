"use client";

import { useState } from "react";
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Database, FilePlus2, FileText, RotateCcw, ShieldCheck } from "lucide-react";
import type { DashboardData } from "@/lib/use-dashboard-data";
import { HelpTip } from "@/components/ui/help-tip";
import type { ViewKey } from "@/components/dashboard/app-shell";

export function TestWorkspaceView({
  data,
  busy,
  localOnly,
  onLoad,
  onReset,
  onNavigate,
  onReturnToDemo,
}: {
  data: DashboardData;
  busy: boolean;
  localOnly: boolean;
  onLoad: () => Promise<void>;
  onReset: () => Promise<void>;
  onNavigate: (view: ViewKey) => void;
  onReturnToDemo: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo completar la acción.");
    }
  }

  async function prepareAndOpenInvoices() {
    setError(null);
    try {
      await onLoad();
      onNavigate("invoices");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudieron cargar los datos de prueba.");
    }
  }

  const decisionCount = Object.values(data.decisions).reduce((sum, decisions) => sum + decisions.length, 0);

  return <>
    <section className="page-intro page-intro-compact">
      <div><p className="eyebrow">{localOnly ? "Recorrido guiado" : "Espacio de pruebas"}</p><h1>Pruebas locales <HelpTip label="Pruebas locales">Espacio independiente para explorar el flujo con facturas ficticias. Se guarda en test_state.json; reiniciarlo no borra las facturas ni el historial operativo. Solo está habilitado al ejecutar Cuentra localmente.</HelpTip></h1><p>{localOnly ? "Prepara el escenario y sigue facturas, aprobaciones y auditoría sin cambiar de espacio manualmente." : "Esta sección solo está habilitada para pruebas locales."}</p></div>
      <span className="test-workspace-badge"><Database size={14} />{localOnly ? "Espacio local aislado" : "Solo uso local"}</span>
    </section>

    {!localOnly ? <section className="test-workspace-callout test-workspace-remote" role="status"><ShieldCheck size={19} /><div><strong>Pruebas locales únicamente</strong><p>El espacio de pruebas solo está disponible cuando Cuentra se ejecuta localmente.</p><button type="button" className="button button-primary" onClick={onReturnToDemo}><ArrowRight size={15} />Volver al resumen</button></div></section> : <section className="test-workspace-callout"><ShieldCheck size={19} /><div><strong>Espacio separado y seleccionado automáticamente</strong><p>Al entrar aquí, Cuentra cambia a <b>Pruebas locales</b> y mantiene ese espacio al abrir Facturas, Aprobaciones o Registro de actividad. Todo queda en <code>backend/data/test_state.json</code>; el espacio operativo no se modifica.</p></div></section>}

    {error && <div className="test-workspace-error" role="alert"><AlertTriangle size={15} />{error}</div>}

    {localOnly && <section className="test-workspace-grid" aria-label="Estado del espacio de pruebas">
      <div className="surface test-workspace-card"><span>Facturas</span><strong>{data.invoices.length}</strong></div>
      <div className="surface test-workspace-card"><span>Políticas</span><strong>{data.policies.length}</strong></div>
      <div className="surface test-workspace-card"><span>Decisiones</span><strong>{decisionCount}</strong></div>
      <div className="surface test-workspace-card"><span>Aprobaciones pendientes</span><strong>{data.approvals.length}</strong></div>
    </section>}

    {localOnly && <section className="surface test-workspace-guide">
      <div className="test-workspace-guide-heading"><div><p className="eyebrow">Empieza aquí</p><h2>Recorre el flujo en tres pasos</h2><p>El escenario incluye un caso aprobado, uno bloqueado y uno que necesita aprobación humana.</p></div><button type="button" className="button button-secondary" disabled={busy} onClick={() => void run(onReset)}><RotateCcw size={15} />Reiniciar pruebas</button></div>
      <div className="test-workspace-steps">
        <article className="test-workspace-step"><span className="test-step-number">1</span><div><strong>{data.invoices.length > 0 ? "Escenario preparado" : "Carga el escenario"}</strong><p>Agrega la política USD y las tres facturas ficticias al espacio aislado.</p></div><button type="button" className="button button-primary" disabled={busy} onClick={() => void prepareAndOpenInvoices()}><FilePlus2 size={15} />{busy ? "Preparando…" : data.invoices.length > 0 ? "Abrir facturas" : "Cargar y abrir facturas"}</button></article>
        <article className="test-workspace-step"><span className="test-step-number">2</span><div><strong>Revisa la decisión humana</strong><p>La factura de monto alto queda pendiente; aquí puedes confirmarla o bloquearla.</p></div><button type="button" className="button button-secondary" onClick={() => onNavigate("approvals")}><CheckCircle2 size={15} />Ver aprobaciones</button></article>
        <article className="test-workspace-step"><span className="test-step-number">3</span><div><strong>Entiende el porqué</strong><p>Consulta la explicación, las reglas aplicadas y el historial de cada decisión.</p></div><button type="button" className="button button-secondary" onClick={() => onNavigate("audit")}><Activity size={15} />Ver registro</button></article>
      </div>
      <div className="test-workspace-footer"><span><FileText size={14} />También puedes cargar tus propios documentos desde Facturas.</span><button type="button" className="quiet-link" onClick={() => onNavigate("invoices")}>Abrir Facturas <ArrowRight size={14} /></button></div>
    </section>}
  </>;
}
