"use client";

import { useState } from "react";
import { AlertTriangle, Database, FilePlus2, RotateCcw, ShieldCheck } from "lucide-react";
import type { DashboardData } from "@/lib/use-dashboard-data";
import { HelpTip } from "@/components/ui/help-tip";

export function TestWorkspaceView({
  data,
  busy,
  onLoad,
  onReset,
}: {
  data: DashboardData;
  busy: boolean;
  onLoad: () => Promise<void>;
  onReset: () => Promise<void>;
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

  const decisionCount = Object.values(data.decisions).reduce((sum, decisions) => sum + decisions.length, 0);

  return <>
    <section className="page-intro page-intro-compact">
      <div><p className="eyebrow">Entorno aislado</p><h1>Pruebas locales <HelpTip label="Pruebas locales">Espacio independiente para explorar el flujo con facturas ficticias. Se guarda en test_state.json; reiniciarlo no borra las facturas ni el historial operativo.</HelpTip></h1><p>Factura y evalúa datos sintéticos sin alterar el espacio operativo.</p></div>
      <span className="test-workspace-badge"><Database size={14} />JSON de pruebas</span>
    </section>

    <section className="test-workspace-callout">
      <ShieldCheck size={19} />
      <div><strong>Datos separados</strong><p>Las operaciones de esta sección usan <code>backend/data/test_state.json</code>. El archivo operativo <code>runtime_state.json</code> no se modifica.</p></div>
    </section>

    {error && <div className="test-workspace-error" role="alert"><AlertTriangle size={15} />{error}</div>}

    <section className="test-workspace-grid" aria-label="Estado del espacio de pruebas">
      <div className="surface test-workspace-card"><span>Facturas</span><strong>{data.invoices.length}</strong></div>
      <div className="surface test-workspace-card"><span>Políticas</span><strong>{data.policies.length}</strong></div>
      <div className="surface test-workspace-card"><span>Decisiones</span><strong>{decisionCount}</strong></div>
      <div className="surface test-workspace-card"><span>Aprobaciones pendientes</span><strong>{data.approvals.length}</strong></div>
    </section>

    <section className="surface test-workspace-actions">
      <div><p className="eyebrow">Datos sintéticos</p><h2>Preparar o reiniciar el escenario</h2><p>Carga una política USD y tres facturas de ejemplo. Luego puedes evaluar, aprobar y consultar su auditoría como en cualquier otro espacio.</p></div>
      <div className="test-workspace-buttons">
        <button type="button" className="button button-primary" disabled={busy} onClick={() => void run(onLoad)}><FilePlus2 size={15} />{busy ? "Procesando…" : "Cargar datos de prueba"}</button>
        <button type="button" className="button button-secondary" disabled={busy} onClick={() => void run(onReset)}><RotateCcw size={15} />Reiniciar espacio de pruebas</button>
      </div>
    </section>
  </>;
}
