import { AlertTriangle, CheckCircle2, CircleDashed, ShieldAlert, ShieldCheck } from "lucide-react";
import type { Decision, Outcome } from "@/lib/api";
import { formatDate } from "@/lib/format";

const outcomeMeta: Record<Outcome, { label: string; className: string; icon: typeof ShieldCheck }> = {
  APPROVE: { label: "Aprobada", className: "status-approved", icon: CheckCircle2 },
  BLOCK: { label: "Bloqueada", className: "status-blocked", icon: ShieldAlert },
  ESCALATE: { label: "Revisión", className: "status-escalated", icon: AlertTriangle },
};

export function StatusBadge({ decision }: { decision?: Decision }) {
  if (!decision) return <span className="status-badge status-unchecked"><CircleDashed size={13} />Sin evaluar</span>;
  const meta = outcomeMeta[decision.outcome];
  const Icon = meta.icon;
  return <span className={`status-badge ${meta.className}`}><Icon size={13} />{meta.label}</span>;
}

export function PanelHeading({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return <div className="panel-heading"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action}</div>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="empty-state"><span className="empty-mark"><ShieldCheck size={19} /></span><strong>{title}</strong><p>{detail}</p></div>;
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="error-notice" role="alert"><AlertTriangle size={17} /><span>{message}</span><button onClick={onRetry}>Reintentar</button></div>;
}

export function Timestamp({ value }: { value: string }) {
  return <time dateTime={value}>{formatDate(value)}</time>;
}
