import { useState, useRef, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../../contexts/AuthContext";
import {
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  UserRoundCog,
  Settings,
  LogOut,
} from "lucide-react";

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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [chipOpen, setChipOpen] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (chipRef.current && !chipRef.current.contains(e.target as Node)) {
        setChipOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const initials =
    user?.nomComplet
      ?.split(" ")
      .map((w: string) => w.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("") || "U";

  return (
    <div className="dashboard-shell">
      <Sidebar roleLabel={roleLabel} />

      <main className="dashboard-main">
        <div className="topbar">
          <div className="topbar-search">
            <Search size={17} strokeWidth={2} />
            <input type="text" placeholder="Search motors, alerts, metrics..." />
          </div>

          <div className="top-actions">
            <div className="live-pill">
              <span className="pulse" />
              Auto-refresh
            </div>

            <button type="button" className="icon-btn" aria-label="Notifications">
              <Bell size={19} strokeWidth={2} />
              <span className="badge-dot" />
            </button>

            <button type="button" className="icon-btn" aria-label="Help">
              <HelpCircle size={19} strokeWidth={2} />
            </button>

            <div
              ref={chipRef}
              className={`user-chip${chipOpen ? " open" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setChipOpen((o) => !o);
              }}
            >
              <div className="avatar">{initials}</div>
              <div className="un">
                {user?.nomComplet || "User"}
                <small>{roleLabel}</small>
              </div>
              <ChevronDown size={16} strokeWidth={2} />

              <div className="user-menu">
                <div className="um-head">
                  <div className="avatar">{initials}</div>
                  <div>
                    <b>{user?.nomComplet || "User"}</b>
                    <span>{user?.email || ""}</span>
                  </div>
                </div>
                <button type="button" className="um-link" onClick={() => navigate("/admin/settings")}>
                  <UserRoundCog size={16} strokeWidth={2} />
                  Edit profile
                </button>
                <button type="button" className="um-link" onClick={() => navigate("/admin/settings")}>
                  <Settings size={16} strokeWidth={2} />
                  Account settings
                </button>
                <div className="user-menu-sep" />
                <button
                  type="button"
                  className="um-link um-danger"
                  onClick={() => {
                    logout();
                    navigate("/select-role", { replace: true });
                  }}
                >
                  <LogOut size={16} strokeWidth={2} />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="content">
          <div className="page-head">
            <div>
              <div className="eyebrow">OCP SynaptiQ live environment</div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}
