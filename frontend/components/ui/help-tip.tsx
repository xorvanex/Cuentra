"use client";

import { CircleHelp, X } from "lucide-react";
import { useState } from "react";

export function HelpTip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <span className="help-tip-wrap">
    <button type="button" className="help-tip-button" aria-label={`Ayuda: ${label}`} aria-expanded={open} onClick={() => setOpen((value) => !value)}><CircleHelp size={16} /></button>
    {open && <span className="help-tip-popover" role="note"><strong>{label}</strong><span>{children}</span><button type="button" aria-label="Cerrar ayuda" onClick={() => setOpen(false)}><X size={13} /></button></span>}
  </span>;
}
