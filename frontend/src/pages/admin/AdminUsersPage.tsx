import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleUserRound,
  KeyRound,
  MailPlus,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Loader from "../../components/common/Loader";
import { useAuth } from "../../hooks/useAuth";
import {
  createUserAccess,
  deleteUserAccess,
  getUsers,
  resetUserPassword,
  updateUserAccess,
} from "../../services/userAccessService";
import type {
  LoginResponse,
  UserAccess,
  UserAccessCreateRequest,
  UserAccessUpdateRequest,
} from "../../types";

type RoleValue = "ADMIN" | "UTILISATEUR";
type RoleFilter = "ALL" | RoleValue;

type UserFormState = {
  nomComplet: string;
  email: string;
  role: RoleValue;
  active: boolean;
  notificationEmail: boolean;
};

type CredentialNotice = {
  email: string;
  temporaryPassword: string;
  label: string;
};

const roleOptions: Array<{
  value: RoleValue;
  label: string;
  badge: string;
  description: string;
}> = [
  {
    value: "ADMIN",
    label: "Administrator",
    badge: "Full access",
    description: "Supervision, users, thresholds, AI diagnosis, exports, and reports.",
  },
  {
    value: "UTILISATEUR",
    label: "Operator",
    badge: "Operational access",
    description: "Machine status, alerts, anomalies, predictions, history, and reports.",
  },
];

const emptyCreateForm: UserFormState & { password: string } = {
  nomComplet: "",
  email: "",
  role: "UTILISATEUR",
  active: true,
  notificationEmail: true,
  password: "",
};

function getRoleLabel(role: RoleValue) {
  return roleOptions.find((option) => option.value === role)?.label ?? "Operator";
}

function getActive(user: UserAccess) {
  return user.active ?? !user.accountLocked;
}

function formFromUser(user: UserAccess): UserFormState {
  return {
    nomComplet: user.nomComplet ?? "",
    email: user.email ?? "",
    role: user.role === "ADMIN" ? "ADMIN" : "UTILISATEUR",
    active: getActive(user),
    notificationEmail: user.notificationEmail ?? true,
  };
}

function payloadFromForm(form: UserFormState): UserAccessUpdateRequest {
  return {
    nomComplet: form.nomComplet.trim(),
    email: form.email.trim().toLowerCase(),
    role: form.role,
    active: form.active,
    notificationEmail: form.notificationEmail,
  };
}

function sortUsers(users: UserAccess[]) {
  return [...users].sort((a, b) => {
    if (a.role !== b.role) return a.role === "ADMIN" ? -1 : 1;
    return (a.nomComplet ?? "").localeCompare(b.nomComplet ?? "");
  });
}

function formatDate(value?: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  const responseData = (error as { response?: { data?: unknown } })?.response?.data;
  if (typeof responseData === "string") return responseData;
  if (responseData && typeof responseData === "object") {
    const data = responseData as { error?: string; message?: string; fieldErrors?: Record<string, string> };
    if (data.fieldErrors) return Object.values(data.fieldErrors).join(" ");
    return data.message ?? data.error ?? "Unable to complete this action.";
  }
  return error instanceof Error ? error.message : "Unable to complete this action.";
}

function profileToLoginResponse(user: UserAccess, currentUser: LoginResponse): LoginResponse {
  return { ...currentUser, nomComplet: user.nomComplet, email: user.email, role: user.role };
}

export default function AdminUsersPage() {
  const { user: currentUser, setUser } = useAuth();
  const [users, setUsers] = useState<UserAccess[]>([]);
  const [userForms, setUserForms] = useState<Record<number, UserFormState>>({});
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [warningNotice, setWarningNotice] = useState("");
  const [credentialNotice, setCredentialNotice] = useState<CredentialNotice | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [resettingId, setResettingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setPageError("");
    try {
      const data = sortUsers(await getUsers());
      setUsers(data);
      setUserForms(Object.fromEntries(data.map((item) => [item.id, formFromUser(item)])));
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      const matchesSearch = !query || user.nomComplet.toLowerCase().includes(query) || user.email.toLowerCase().includes(query) || String(user.id).includes(query);
      return matchesRole && matchesSearch;
    });
  }, [roleFilter, search, users]);

  const stats = useMemo(() => {
    const activeUsers = users.filter(getActive).length;
    return {
      total: users.length,
      active: activeUsers,
      inactive: users.length - activeUsers,
      administrators: users.filter((item) => item.role === "ADMIN").length,
      operators: users.filter((item) => item.role === "UTILISATEUR").length,
    };
  }, [users]);

  function updateCreateForm<K extends keyof typeof createForm>(key: K, value: (typeof createForm)[K]) {
    setCreateForm((current) => ({ ...current, [key]: value }));
  }

  function updateUserForm<K extends keyof UserFormState>(id: number, key: K, value: UserFormState[K]) {
    setUserForms((current) => ({ ...current, [id]: { ...current[id], [key]: value } }));
  }

  function replaceUser(updated: UserAccess) {
    setUsers((current) => sortUsers(current.map((item) => (item.id === updated.id ? updated : item))));
    setUserForms((current) => ({ ...current, [updated.id]: formFromUser(updated) }));
    if (currentUser?.id === updated.id) setUser(profileToLoginResponse(updated, currentUser));
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setPageError(""); setNotice(""); setWarningNotice(""); setCredentialNotice(null);
    const payload: UserAccessCreateRequest = { ...payloadFromForm(createForm), password: createForm.password.trim() || undefined };
    try {
      const created = await createUserAccess(payload);
      setUsers((current) => sortUsers([...current, created]));
      setUserForms((current) => ({ ...current, [created.id]: formFromUser(created) }));
      setCreateForm(emptyCreateForm);
      setNotice(`${getRoleLabel(created.role)} access created for ${created.email}.`);
      if (created.emailDeliverySuccessful === false && created.emailDeliveryMessage) setWarningNotice(`Email was not sent: ${created.emailDeliveryMessage}`);
      else if (created.emailDeliverySuccessful === true) setNotice(`${getRoleLabel(created.role)} access created for ${created.email}. Invite email sent.`);
      if (created.temporaryPassword) setCredentialNotice({ email: created.email, temporaryPassword: created.temporaryPassword, label: "Temporary password" });
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveUser(user: UserAccess) {
    const form = userForms[user.id];
    if (!form) return;
    setSavingId(user.id);
    setPageError(""); setNotice(""); setWarningNotice(""); setCredentialNotice(null);
    try {
      const updated = await updateUserAccess(user.id, payloadFromForm(form));
      replaceUser(updated);
      setNotice(`Access updated for ${updated.email}.`);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setSavingId(null);
    }
  }

  async function handleResetPassword(user: UserAccess) {
    setResettingId(user.id);
    setPageError(""); setNotice(""); setWarningNotice(""); setCredentialNotice(null);
    try {
      const updated = await resetUserPassword(user.id);
      replaceUser(updated);
      if (updated.emailDeliverySuccessful === false && updated.emailDeliveryMessage) setWarningNotice(`Password was reset, but email was not sent: ${updated.emailDeliveryMessage}`);
      else if (updated.emailDeliverySuccessful === true) setNotice(`Password reset for ${updated.email}. Email sent.`);
      if (updated.temporaryPassword) setCredentialNotice({ email: updated.email, temporaryPassword: updated.temporaryPassword, label: "New temporary password" });
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setResettingId(null);
    }
  }

  async function handleDeleteUser(user: UserAccess) {
    const confirmed = window.confirm(`Remove access for ${user.email}?`);
    if (!confirmed) return;
    setDeletingId(user.id);
    setPageError(""); setNotice(""); setWarningNotice(""); setCredentialNotice(null);
    try {
      await deleteUserAccess(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setUserForms((current) => { const next = { ...current }; delete next[user.id]; return next; });
      setNotice(`Access removed for ${user.email}.`);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Users & roles" subtitle="Loading access control..." roleLabel="Administrator">
        <Loader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Users & roles"
      subtitle="Create employee access, assign roles, and control who can sign in."
      roleLabel="Administrator"
    >
      {/* ── KPI strip ── */}
      <div className="v2-kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="v2-kpi">
          <span className="ic t-green"><Users size={18} strokeWidth={2.2} /></span>
          <div className="label">Total users</div>
          <div className="value">{stats.total}</div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-ok"><ShieldCheck size={18} strokeWidth={2.2} /></span>
          <div className="label">Administrators</div>
          <div className="value">{stats.administrators}</div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-purple"><UserCog size={18} strokeWidth={2.2} /></span>
          <div className="label">Operators</div>
          <div className="value">{stats.operators}</div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-cur"><UserCheck size={18} strokeWidth={2.2} /></span>
          <div className="label">Active / inactive</div>
          <div className="value">{stats.active} / {stats.inactive}</div>
        </div>
      </div>

      {/* ── Notices ── */}
      {pageError && <div className="v2-note warning">{pageError}</div>}
      {notice && <div className="v2-note" style={{ background: "rgba(34,197,94,.08)", color: "var(--ok)" }}>{notice}</div>}
      {warningNotice && <div className="v2-note warning">{warningNotice}</div>}
      {credentialNotice && (
        <div className="v2-card v2-card-pad" style={{ borderLeft: "3px solid var(--accent)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <KeyRound size={20} />
            <div>
              <strong>{credentialNotice.label}</strong>
              <code style={{ display: "block", fontSize: "1.1rem", marginTop: 4, padding: "6px 12px", background: "var(--surface-alt)", borderRadius: 6 }}>
                {credentialNotice.temporaryPassword}
              </code>
            </div>
          </div>
          <p style={{ fontSize: ".82rem", color: "var(--muted)", marginTop: 8 }}>
            Share this with {credentialNotice.email}. It appears here once and can be replaced later with reset password.
          </p>
        </div>
      )}

      {/* ── Create + Roles grid ── */}
      <div className="v2-grid-2">
        <div className="v2-card v2-card-pad">
          <div className="v2-card-head">
            <div>
              <div className="eyebrow">Access Control</div>
              <h3>Create user access</h3>
            </div>
          </div>
          <p style={{ fontSize: ".84rem", color: "var(--muted)", marginBottom: 16 }}>
            Register an employee, assign the right workspace, and activate sign-in immediately.
          </p>

          <form onSubmit={handleCreateUser}>
            <div className="v2-field-grid">
              <div className="v2-field">
                <label>Full name</label>
                <input className="v2-input" type="text" value={createForm.nomComplet} onChange={(e) => updateCreateForm("nomComplet", e.target.value)} placeholder="Ing. Samia ID Daoud" required />
              </div>
              <div className="v2-field">
                <label>Email address</label>
                <input className="v2-input" type="email" value={createForm.email} onChange={(e) => updateCreateForm("email", e.target.value)} placeholder="name@company.com" required />
              </div>
              <div className="v2-field">
                <label>Role</label>
                <select className="v2-input" value={createForm.role} onChange={(e) => updateCreateForm("role", e.target.value as RoleValue)}>
                  {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="v2-field">
                <label>Temporary password</label>
                <input className="v2-input" type="text" value={createForm.password} onChange={(e) => updateCreateForm("password", e.target.value)} placeholder="Auto-generate if empty" minLength={8} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 20, margin: "12px 0", fontSize: ".86rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={createForm.active} onChange={(e) => updateCreateForm("active", e.target.checked)} />
                Active immediately
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={createForm.notificationEmail} onChange={(e) => updateCreateForm("notificationEmail", e.target.checked)} />
                Email notifications
              </label>
            </div>

            <button type="submit" className="v2-btn v2-btn-primary" disabled={creating}>
              <MailPlus size={16} />
              {creating ? "Creating..." : "Create access"}
            </button>
          </form>
        </div>

        <div className="v2-card v2-card-pad">
          <div className="v2-card-head">
            <div>
              <div className="eyebrow">Permissions</div>
              <h3>Role access map</h3>
            </div>
          </div>
          <p style={{ fontSize: ".84rem", color: "var(--muted)", marginBottom: 16 }}>
            Every account signs in from the same login page. The selected role decides the dashboard.
          </p>

          <div className="v2-rows">
            {roleOptions.map((option) => (
              <div className="v2-row-item" key={option.value}>
                <span className={`ri ${option.value === "ADMIN" ? "t-ok" : "t-purple"}`}>
                  <ShieldCheck size={19} strokeWidth={2.2} />
                </span>
                <div className="body">
                  <b>{option.label}</b>
                  <p>{option.description}</p>
                  <div className="meta">
                    <span className={`v2-badge ${option.value === "ADMIN" ? "ok" : "info"}`}>{option.badge}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, padding: 14, background: "var(--surface-alt)", borderRadius: 10, fontSize: ".82rem", color: "var(--muted)" }}>
            <strong style={{ color: "var(--text)" }}>Email service status</strong>
            <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
              <li>Invite and reset emails are sent when email alerts are enabled.</li>
              <li>Temporary passwords still appear on screen as a fallback.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── User list ── */}
      <div className="v2-card v2-card-pad">
        <div className="v2-card-head" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3>Current users</h3>
            <p style={{ fontSize: ".84rem", color: "var(--muted)", margin: 0 }}>
              {stats.active} active / {stats.total} total accounts
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              <input
                type="text"
                className="v2-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search email, name, or ID..."
                style={{ paddingLeft: 34, minWidth: 220 }}
              />
            </div>
            <select className="v2-input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as RoleFilter)} style={{ width: "auto" }}>
              <option value="ALL">All roles</option>
              {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button type="button" className="v2-btn v2-btn-soft v2-btn-sm" onClick={loadUsers}>
              <RefreshCcw size={15} /> Refresh
            </button>
          </div>
        </div>

        <div className="v2-rows" style={{ marginTop: 12 }}>
          {filteredUsers.length ? (
            filteredUsers.map((item) => {
              const form = userForms[item.id] ?? formFromUser(item);
              const isCurrentUser = currentUser?.id === item.id;
              const isActive = form.active;
              return (
                <div className="v2-row-item" key={item.id} style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className={`ri ${item.role === "ADMIN" ? "t-ok" : "t-purple"}`}>
                        <CircleUserRound size={20} strokeWidth={2.2} />
                      </span>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <strong>{item.nomComplet}</strong>
                          {isCurrentUser && <span className="v2-badge ok" style={{ fontSize: ".7rem" }}>you</span>}
                        </div>
                        <p style={{ fontSize: ".8rem", color: "var(--muted)", margin: 0 }}>ID {item.id} · Last login {formatDate(item.lastLoginAt)}</p>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className={`v2-badge ${isActive ? "ok" : "crit"}`}>{isActive ? "Active" : "Inactive"}</span>
                      <button
                        type="button"
                        className="v2-btn v2-btn-soft v2-btn-sm"
                        onClick={() => handleDeleteUser(item)}
                        disabled={deletingId === item.id || isCurrentUser}
                        title={isCurrentUser ? "You cannot remove your own signed-in account" : "Remove user access"}
                        style={{ color: "var(--crit)" }}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </div>

                  {/* Edit fields */}
                  <div className="v2-field-grid">
                    <div className="v2-field">
                      <label>Full name</label>
                      <input className="v2-input" type="text" value={form.nomComplet} onChange={(e) => updateUserForm(item.id, "nomComplet", e.target.value)} />
                    </div>
                    <div className="v2-field">
                      <label>Email</label>
                      <input className="v2-input" type="email" value={form.email} onChange={(e) => updateUserForm(item.id, "email", e.target.value)} />
                    </div>
                    <div className="v2-field">
                      <label>Role</label>
                      <select className="v2-input" value={form.role} onChange={(e) => updateUserForm(item.id, "role", e.target.value as RoleValue)}>
                        {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "center", fontSize: ".84rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                        <input type="checkbox" checked={form.active} onChange={(e) => updateUserForm(item.id, "active", e.target.checked)} />
                        Active
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                        <input type="checkbox" checked={form.notificationEmail} onChange={(e) => updateUserForm(item.id, "notificationEmail", e.target.checked)} />
                        Email alerts
                      </label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="v2-btn v2-btn-primary v2-btn-sm" onClick={() => handleSaveUser(item)} disabled={savingId === item.id}>
                      <Save size={15} /> {savingId === item.id ? "Saving..." : "Save changes"}
                    </button>
                    <button type="button" className="v2-btn v2-btn-soft v2-btn-sm" onClick={() => handleResetPassword(item)} disabled={resettingId === item.id}>
                      <KeyRound size={15} /> {resettingId === item.id ? "Resetting..." : "Reset password"}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="v2-empty">No users match this search.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
