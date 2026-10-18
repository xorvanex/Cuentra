import type { PolicyCreate } from "@/lib/api";

/** Política compatible con el corpus de synthetic-invoices/company_policy_usd.json. */
export const syntheticInvoicePolicy: PolicyCreate = {
  name: "Northstar Demo Policy — USD",
  currency: "USD",
  allowed_vendors: [
    "andes field services llc",
    "río claro creative studio sas",
    "rio claro creative studio sas",
    "pacific ledger support llc",
  ],
  max_invoice_amount: "20000.00",
  period_budget: "15000.00",
  human_approval_threshold: "5000.00",
  approver_ids: ["demo-approver"],
  vendor_terms: [
    {
      vendor_name: "Pacific Ledger Support LLC",
      agreement_reference: "NS-PO-902",
      currency: "USD",
      agreed_amount: "4200.00",
    },
  ],
};
