import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import { useAuth } from "../../contexts/AuthContext";

interface Props {
  title: string;
  subtitle: string;
  roleLabel: string;
  children: ReactNode;
}

export default function DashboardLayout({
  title,
  subtitle,
  roleLabel,
  children,
}: Props) {
  const { user } = useAuth();
  const today = new Date().toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="dashboard-shell">
      <Sidebar roleLabel={roleLabel} />

      <main className="dashboard-main">
        <div className="topbar">
          <div className="topbar-copy">
            <div className="section-badge">OCP SynaptiQ live environment</div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>

          <div className="topbar-meta">
            <div className="nav-status">
              <span className="nav-dot" />
              <span>Updated {today}</span>
            </div>

            <div className="user-chip">
              <div className="avatar">{user?.nomComplet?.charAt(0).toUpperCase() || "U"}</div>
              <div>
                <strong>{user?.nomComplet}</strong>
                <div className="topbar-role">{roleLabel}</div>
              </div>
            </div>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}
