"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { type FinalOutcome, type InvoiceCreate, type PolicyCreate, type Workspace } from "@/lib/api";
import { useDashboardData } from "@/lib/use-dashboard-data";
import { AppShell, type ViewKey } from "@/components/dashboard/app-shell";
import { OverviewView } from "@/components/dashboard/overview-view";
import { InvoicesView } from "@/components/invoices/invoices-view";
import { ApprovalsView } from "@/components/approvals/approvals-view";
import { AuditView } from "@/components/audit/audit-view";
import { TestWorkspaceView } from "@/components/dashboard/test-workspace-view";
import { PoliciesView } from "@/components/dashboard/policies-view";
import { ErrorNotice } from "@/components/ui/primitives";
import { syntheticInvoicePolicy } from "@/lib/synthetic-policy";
import { getBrowserClientId } from "@/lib/browser-client-id";

export function DashboardShell() {
  const [view, setView] = useState<ViewKey>("overview");
  const [workspace, setWorkspace] = useState<Workspace>("main");
  const [localTestAvailable, setLocalTestAvailable] = useState(false);
  const [browserClientId, setBrowserClientId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const { data, loading, refreshing, error, refresh, client } = useDashboardData(workspace, browserClientId);

  useEffect(() => {
    setLocalTestAvailable(["localhost", "127.0.0.1", "::1"].includes(window.location.hostname));
    setBrowserClientId(getBrowserClientId());
  }, []);

  function navigate(next: ViewKey) {
    if (next === "test") {
      setWorkspace(localTestAvailable ? "test" : "main");
      setNotice(null);
    }
    setView(next);
  }

  function changeWorkspace(next: Workspace) {
    if (next === "test" && !localTestAvailable) {
      setWorkspace("main");
      setView("test");
      setNotice(null);
      return;
    }
    setWorkspace(next);
    setView(next === "test" ? "test" : "overview");
    setNotice(null);
  }

  async function createInvoice(payload: InvoiceCreate) {
    setBusyId("create");
    setNotice(null);
    try {
      const invoice = await client.invoices.create(payload);
      await refresh();
      setNotice({ kind: "success", message: `Factura ${invoice.external_reference} registrada; evaluándola con la política.` });
      return invoice;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "No se pudo registrar la factura.";
      setNotice({ kind: "error", message });
      throw caught;
    } finally {
      setBusyId(null);
    }
  }

  async function evaluateInvoice(invoiceId: string, policyId: string) {
    setBusyId(invoiceId);
    setNotice(null);
    try {
      const decision = await client.invoices.evaluate(invoiceId, policyId);
      await refresh();
      const labels = { APPROVE: "aprobada", BLOCK: "bloqueada", ESCALATE: "enviada a revisión humana" };
      setNotice({ kind: "success", message: `Evaluación completada: factura ${labels[decision.outcome]}.` });
      return decision;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "No se pudo evaluar la factura.";
      setNotice({ kind: "error", message });
      throw caught;
    } finally {
      setBusyId(null);
    }
  }

  async function resolveApproval(id: string, outcome: FinalOutcome, reason: string) {
    setBusyId(id);
    setNotice(null);
    try {
      await client.approvals.resolve(id, outcome, reason);
      await refresh();
      setNotice({ kind: "success", message: outcome === "APPROVE" ? "Aprobación registrada." : "Factura bloqueada y decisión registrada." });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "No se pudo resolver la aprobación.";
      setNotice({ kind: "error", message });
      throw caught;
    } finally {
      setBusyId(null);
    }
  }

  async function loadLocalTestData() {
    setBusyId("local-test");
    try {
      await client.localTest.load();
      await refresh();
      setNotice({ kind: "success", message: "Facturas sintéticas USD cargadas en el espacio aislado." });
    } finally {
      setBusyId(null);
    }
  }

  async function resetLocalTestData() {
    if (!window.confirm("Se borrarán las facturas, decisiones, aprobaciones y eventos del archivo de pruebas local. Los datos operativos no se tocarán. ¿Continuar?")) return;
    setBusyId("local-test");
    try {
      await client.localTest.reset();
      await refresh();
      setNotice({ kind: "success", message: "El espacio local de pruebas se reinició. Los datos operativos permanecen intactos." });
    } finally {
      setBusyId(null);
    }
  }

  async function resetCurrentWorkspace() {
    const confirmed = window.confirm(
      "Esto borrará de forma permanente las facturas, políticas, decisiones, aprobaciones y actividad de este navegador. No afecta los datos de otras personas. ¿Quieres dejar este espacio vacío?",
    );
    if (!confirmed) return;
    setBusyId("workspace-reset");
    setNotice(null);
    try {
      await client.workspace.reset();
      await refresh();
      setView("overview");
      setNotice({ kind: "success", message: "Espacio reiniciado. Ya puedes comenzar desde cero." });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "No se pudo reiniciar este espacio.";
      setNotice({ kind: "error", message });
    } finally {
      setBusyId(null);
    }
  }

  async function savePolicy(payload: PolicyCreate, policyId?: string) {
    setBusyId("policy");
    setNotice(null);
    try {
      if (policyId) await client.policies.update(policyId, payload);
      else await client.policies.create(payload);
      await refresh();
      setNotice({ kind: "success", message: policyId ? "Se guardó una nueva versión de la política." : "Política creada." });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "No se pudo guardar la política.";
      setNotice({ kind: "error", message });
      throw caught;
    } finally {
      setBusyId(null);
    }
  }

  async function addSyntheticInvoicePolicy() {
    setBusyId("policy");
    setNotice(null);
    try {
      const existing = data.policies.find((policy) => policy.name === syntheticInvoicePolicy.name && policy.currency === syntheticInvoicePolicy.currency);
      if (!existing) await client.policies.create(syntheticInvoicePolicy);
      await refresh();
      setView("invoices");
      setNotice({ kind: "success", message: existing ? "La política de prueba ya está activa. Puedes cargar las facturas de synthetic-invoices." : "Política de prueba USD agregada. Ya puedes cargar las facturas de synthetic-invoices." });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "No se pudo agregar la política de prueba.";
      setNotice({ kind: "error", message });
      throw caught;
    } finally {
      setBusyId(null);
    }
  }

  async function deletePolicy(policyId: string) {
    setBusyId("policy");
    setNotice(null);
    try {
      await client.policies.delete(policyId);
      await refresh();
      setNotice({ kind: "success", message: "Política eliminada de las reglas activas. El historial de decisiones se conserva." });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "No se pudo eliminar la política.";
      setNotice({ kind: "error", message });
      throw caught;
    } finally {
      setBusyId(null);
    }
  }

  return <AppShell view={view} onNavigate={navigate} workspace={workspace} testWorkspaceAvailable={localTestAvailable} onWorkspaceChange={changeWorkspace} pendingCount={data.approvals.length} connected={data.connected} refreshing={refreshing} onRefresh={refresh}>
    {error && <ErrorNotice message={error} onRetry={refresh} />}
    {notice && <div className={`toast toast-${notice.kind}`} role="status"><span>{notice.kind === "success" ? <Check size={16} /> : <AlertTriangle size={16} />}{notice.message}</span><button className="icon-button" onClick={() => setNotice(null)} aria-label="Cerrar aviso"><X size={16} /></button></div>}
    {loading ? <div className="loading-state"><span className="loading-spinner" /><span>Conectando con el backend…</span></div> : <>
      {view === "overview" && <OverviewView data={data} onNavigate={navigate} onReset={() => void resetCurrentWorkspace()} resetBusy={busyId === "workspace-reset"} />}
      {view === "invoices" && <InvoicesView data={data} busyId={busyId} onCreate={createInvoice} onEvaluate={evaluateInvoice} onExtract={(file, channel) => client.documents.extract(file, channel)} />}
      {view === "approvals" && <ApprovalsView data={data} busyId={busyId} onResolve={resolveApproval} />}
      {view === "audit" && <AuditView data={data} />}
      {view === "policies" && <PoliciesView data={data} busy={busyId === "policy"} onSave={savePolicy} onLoadSyntheticPolicy={addSyntheticInvoicePolicy} onDelete={deletePolicy} onNavigate={navigate} />}
      {view === "test" && <TestWorkspaceView data={data} localOnly={localTestAvailable} busy={busyId === "local-test"} onLoad={loadLocalTestData} onReset={resetLocalTestData} onNavigate={navigate} onReturnToDemo={() => changeWorkspace("main")} />}
    </>}
  </AppShell>;
}
