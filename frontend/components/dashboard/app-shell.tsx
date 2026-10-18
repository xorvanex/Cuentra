"use client";

import {
  Activity,
  CheckCheck,
  ChevronRight,
  Database,
  FileText,
  LayoutDashboard,
  Menu,
  RefreshCw,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

export type ViewKey = "overview" | "invoices" | "approvals" | "audit" | "policies" | "test";
type Workspace = "main" | "test";

const navigation: { id: ViewKey; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Resumen", icon: LayoutDashboard },
  { id: "invoices", label: "Facturas", icon: FileText },
  { id: "approvals", label: "Aprobaciones", icon: ShieldCheck },
  { id: "audit", label: "Registro de actividad", icon: Activity },
  { id: "policies", label: "Políticas", icon: Settings2 },
  { id: "test", label: "Pruebas locales", icon: Database },
];

export function AppShell({
  view,
  onNavigate,
  workspace,
  testWorkspaceAvailable,
  onWorkspaceChange,
  pendingCount,
  connected,
  refreshing,
  onRefresh,
  children,
}: {
  view: ViewKey;
  onNavigate: (view: ViewKey) => void;
  workspace: Workspace;
  testWorkspaceAvailable: boolean;
  onWorkspaceChange: (workspace: Workspace) => void;
  pendingCount: number;
  connected: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const active = navigation.find((item) => item.id === view)?.label ?? "Resumen";

  function navigate(next: ViewKey) {
    onNavigate(next);
    setMenuOpen(false);
  }

  function toggleNavigation() {
    if (window.matchMedia("(max-width: 780px)").matches) {
      setMenuOpen((open) => !open);
      return;
    }
    setSidebarCollapsed((collapsed) => !collapsed);
  }

  return (
    <div className={`app-frame ${sidebarCollapsed ? "sidebar-layout-collapsed" : ""}`}>
      {menuOpen && <button className="mobile-scrim" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" />}
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <div className="brand-lockup">
          <img className="brand-mark" src="/cuentra-mark.svg" alt="" />
          <span className="brand-name">Cuentra</span>
        </div>

        <button type="button" className="workspace-switcher" onClick={() => navigate("overview")} aria-label="Ir al resumen de Cuentra" title={sidebarCollapsed ? "Cuentra · Control de operaciones" : undefined}>
          <span className="workspace-symbol"><CheckCheck size={16} /></span>
          <span><strong>Cuentra</strong><small>Control de operaciones</small></span>
          <ChevronRight size={15} />
        </button>

        <p className="sidebar-caption">Espacio de trabajo</p>
        <nav className="primary-nav" id="primary-navigation" aria-label="Navegación principal">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-link ${view === id ? "nav-link-active" : ""}`} title={sidebarCollapsed ? label : undefined} aria-label={label} onClick={() => navigate(id)}>
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
              {id === "approvals" && pendingCount > 0 && <b className="nav-count">{pendingCount}</b>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="connection-card">
            <span className={`connection-indicator ${connected ? "is-online" : ""}`} />
            <span><strong>{connected ? "API conectada" : "API desconectada"}</strong><small>FastAPI · entorno local</small></span>
          </div>
          <div className="sidebar-footer-label">HACKATHON 30X <span>·</span> DEMO</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button type="button" className={`icon-button menu-toggle ${menuOpen ? "menu-toggle-open" : ""}`} onClick={toggleNavigation} aria-label={menuOpen ? "Cerrar menú" : sidebarCollapsed ? "Expandir menú lateral" : "Contraer menú lateral"} aria-expanded={menuOpen || !sidebarCollapsed} aria-controls="primary-navigation"><Menu size={20} /></button>
          <div className="crumb"><button type="button" className="crumb-home" onClick={() => navigate("overview")}>Operaciones</button><ChevronRight size={14} /><strong aria-current="page">{active}</strong></div>
          <div className="topbar-right">
            <label className="workspace-select-label"><span>Datos</span><select aria-label="Espacio de datos" value={workspace} onChange={(event) => onWorkspaceChange(event.target.value as Workspace)}><option value="main">Operativos</option>{testWorkspaceAvailable && <option value="test">Pruebas locales</option>}</select><span className="browser-data-note" title="Los datos de Operativos se guardan separados por perfil de navegador en el servidor de Cuentra.">Espacio independiente</span></label>
            <span className={`api-label ${connected ? "" : "api-label-offline"}`}><i />{connected ? "API en línea" : "Sin conexión"}</span>
            <button className="refresh-button" onClick={onRefresh} disabled={refreshing} title="Actualizar datos">
              <RefreshCw size={15} className={refreshing ? "spin" : ""} /><span>Actualizar</span>
            </button>
          </div>
        </header>
        <div className="page-container">{children}</div>
        <footer className="page-footer"><span>Cuentra</span><span>Panel de control local · Hackathon 30X</span></footer>
      </main>
    </div>
  );
}
