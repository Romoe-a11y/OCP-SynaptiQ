import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import ocpLogo from "../../assets/images/ocp-logo.png";
import { LogOut, Menu, X } from "lucide-react";
import {
  adminNavigation,
  userNavigation,
  type NavigationGroup,
} from "../../config/navigation";

interface Props {
  roleLabel: string;
}

function getNavigation(roleLabel: string): NavigationGroup[] {
  return roleLabel === "Administrator" ? adminNavigation : userNavigation;
}

export default function Sidebar({ roleLabel }: Props) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const groups = getNavigation(roleLabel);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <aside className={`sidebar${menuOpen ? " sidebar-open" : ""}`}>
        <div className="sb-top-row">
          <div className="sb-brand">
            <div className="sb-logo-chip">
              <img src={ocpLogo} alt="OCP logo" className="sb-logo" />
            </div>
            <div className="sb-bt">
              <b className="sb-title">OCP <span>SynaptiQ</span></b>
              <small className="sb-subtitle">MOTOR INTELLIGENCE</small>
            </div>
          </div>

          <button
            type="button"
            className="sb-menu-button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} strokeWidth={2.2} /> : <Menu size={20} strokeWidth={2.2} />}
          </button>
        </div>

        <div className="sb-role-pill">
          <span className="sb-role-dot" />
          {roleLabel}
        </div>

        <nav className="sb-nav" aria-label={`${roleLabel} navigation`}>
          {groups.map((group) => (
            <div className="sb-group" key={group.label}>
              <span className="sb-nav-label">{group.label}</span>

              <div className="sb-group-links">
                {group.items.map((section) => {
                  const Icon = section.icon;

                  return (
                    <NavLink
                      key={`${group.label}-${section.to}-${section.label}`}
                      to={section.to}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `sb-link${isActive ? " sb-link-active" : ""}`
                      }
                    >
                      <Icon className="sb-link-icon" size={18} strokeWidth={2} />
                      <span className="sb-link-text">{section.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="sb-footer">
          <button
            type="button"
            className="sb-link sb-link-danger sb-logout-button"
            onClick={() => {
              logout();
              setMenuOpen(false);
              navigate("/select-role", { replace: true });
            }}
          >
            <LogOut size={18} strokeWidth={2} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
      <div
        className={`sidebar-scrim${menuOpen ? " show" : ""}`}
        onClick={() => setMenuOpen(false)}
      />
    </>
  );
}
