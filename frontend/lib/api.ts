export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

export type Outcome = "APPROVE" | "BLOCK" | "ESCALATE";
export type FinalOutcome = Exclude<Outcome, "ESCALATE">;
export type Workspace = "main" | "test";

export type DocumentExtraction = {
  source_filename: string;
  source_type: "pdf" | "image" | "email" | "chat";
  extracted_text: string;
  fields: Pick<InvoiceCreate, "external_reference" | "vendor_name" | "amount" | "currency" | "due_date" | "agreement_reference">;
  missing_fields: string[];
  warnings: string[];
  ready_for_review: boolean;
  auto_approval_allowed: false;
};

export type Invoice = {
  id: string;
  external_reference: string;
  vendor_name: string;
  amount: string;
  currency: string;
  due_date: string;
  agreement_reference: string | null;
  source_filename: string | null;
  source_type: "manual" | "pdf" | "image" | "email" | "chat";
  source_text: string | null;
  version: number;
  created_at: string;
};

export type VendorTerm = {
  vendor_name: string;
  agreement_reference: string;
  currency: string;
  agreed_amount: string;
};

export type Policy = {
  id: string;
  name: string;
  currency: string;
  allowed_vendors: string[];
  max_invoice_amount: string;
  period_budget: string;
  human_approval_threshold: string;
  approver_ids: string[];
  vendor_terms: VendorTerm[];
  version: number;
  created_at: string;
};

export type PolicyCreate = Pick<
  Policy,
  "name" | "currency" | "allowed_vendors" | "max_invoice_amount" | "period_budget" | "human_approval_threshold" | "approver_ids"
> & { vendor_terms?: VendorTerm[] };

export type Decision = {
  id: string;
  invoice_id: string;
  policy_id: string;
  policy_version: number;
  invoice_version: number;
  outcome: Outcome;
  reason_codes: string[];
  explanation: string;
  created_at: string;
  invoice_snapshot: Invoice;
  policy_snapshot: Policy;
};

export type Approval = {
  id: string;
  decision_id: string;
  invoice_id: string;
  policy_id: string;
  policy_version: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";
  requested_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_reason: string | null;
};

export type AuditEvent = {
  id: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  created_at: string;
};

export type InvoiceCreate = Pick<
  Invoice,
  "external_reference" | "vendor_name" | "amount" | "currency" | "due_date"
> & Partial<Pick<Invoice, "agreement_reference" | "source_filename" | "source_type" | "source_text">>;

export type ApiError = Error & { status?: number };

async function request<T>(workspace: Workspace, clientId: string | undefined, path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(workspace === "test" ? { "X-Cuentra-Workspace": "test" } : {}),
        ...(clientId ? { "X-Cuentra-Client-ID": clientId } : {}),
        ...(init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new Error(
      `No se pudo conectar con la API en ${API_BASE_URL}. Comprueba que FastAPI esté iniciado.`,
    );
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body?.detail;
    const message = Array.isArray(detail)
      ? detail.map((item: { msg?: string }) => item.msg ?? "Dato inválido").join(". ")
      : typeof detail === "string"
        ? detail
        : `La API respondió con error ${response.status}.`;
    const error = new Error(message) as ApiError;
    error.status = response.status;
    throw error;
  }
  return body as T;
}

export function createApi(workspace: Workspace = "main", clientId?: string) {
  return {
  health: () => request<{ status: string }>(workspace, clientId, "/health"),
  invoices: {
    list: () => request<Invoice[]>(workspace, clientId, "/invoices"),
    create: (payload: InvoiceCreate) =>
      request<Invoice>(workspace, clientId, "/invoices", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    decisions: (invoiceId: string) =>
      request<Decision[]>(workspace, clientId, `/invoices/${invoiceId}/decisions`),
    evaluate: (invoiceId: string, policyId: string) =>
      request<Decision>(
        workspace, clientId,
        `/invoices/${invoiceId}/evaluate?policy_id=${encodeURIComponent(policyId)}`,
        { method: "POST" },
      ),
  },
  documents: {
    extract: async (file: File, channel: "auto" | "email" | "chat" = "auto") => {
      const body = new FormData();
      body.set("file", file);
      return request<DocumentExtraction>(workspace, clientId, `/documents/extract?channel=${channel}`, {
        method: "POST",
        body,
      });
    },
  },
  policies: {
    list: () => request<Policy[]>(workspace, clientId, "/policies"),
    create: (payload: PolicyCreate) => request<Policy>(workspace, clientId, "/policies", { method: "POST", body: JSON.stringify(payload) }),
    update: (policyId: string, payload: PolicyCreate) => request<Policy>(workspace, clientId, `/policies/${policyId}`, { method: "PUT", body: JSON.stringify(payload) }),
    delete: (policyId: string) => request<void>(workspace, clientId, `/policies/${policyId}`, { method: "DELETE" }),
  },
  approvals: {
    list: () => request<Approval[]>(workspace, clientId, "/approvals?pending_only=false"),
    resolve: (approvalId: string, outcome: FinalOutcome, reason: string) =>
      request<Approval>(workspace, clientId, `/approvals/${approvalId}/resolve`, {
        method: "POST",
        body: JSON.stringify({ outcome, actor_id: "demo-approver", reason }),
      }),
  },
  audit: {
    list: () => request<AuditEvent[]>(workspace, clientId, "/audit-events?limit=100"),
  },
  localTest: {
    status: () => request<LocalTestStatus>(workspace, clientId, "/local-test/status"),
    load: () => request<LocalTestStatus>(workspace, clientId, "/local-test/load", { method: "POST" }),
    reset: () => request<LocalTestStatus>(workspace, clientId, "/local-test/reset", { method: "POST" }),
  },
  };
}

export type LocalTestStatus = {
  workspace: "test";
  storage_file: string;
  invoices: number;
  policies: number;
  decisions: number;
  approvals: number;
  audit_events: number;
};

export const api = createApi("main");
