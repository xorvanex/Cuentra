"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createApi, type Approval, type AuditEvent, type Decision, type Invoice, type Policy, type Workspace } from "@/lib/api";

export type DashboardData = {
  connected: boolean;
  invoices: Invoice[];
  policies: Policy[];
  decisions: Record<string, Decision[]>;
  approvals: Approval[];
  approvalHistory: Approval[];
  events: AuditEvent[];
};

const emptyData: DashboardData = {
  connected: false,
  invoices: [],
  policies: [],
  decisions: {},
  approvals: [],
  approvalHistory: [],
  events: [],
};

export function useDashboardData(workspace: Workspace, browserClientId: string | null) {
  const client = useMemo(() => createApi(workspace, browserClientId ?? undefined), [workspace, browserClientId]);
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (background = false) => {
    if (!browserClientId) return;
    if (background) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [health, invoices, policies, approvalHistory, events] = await Promise.all([
        client.health(),
        client.invoices.list(),
        client.policies.list(),
        client.approvals.list(),
        client.audit.list(),
      ]);
      const decisionEntries = await Promise.all(
        invoices.map(async (invoice) => {
          const decisions = await client.invoices.decisions(invoice.id);
          return [invoice.id, decisions] as const;
        }),
      );
      setData({
        connected: health.status === "ok",
        invoices,
        policies,
        decisions: Object.fromEntries(decisionEntries),
        approvals: approvalHistory.filter((approval) => approval.status === "PENDING"),
        approvalHistory,
        events,
      });
    } catch (caught) {
      setData((current) => ({ ...current, connected: false }));
      setError(caught instanceof Error ? caught.message : "No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [browserClientId, client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, refreshing, error, refresh: () => refresh(true), client };
}
