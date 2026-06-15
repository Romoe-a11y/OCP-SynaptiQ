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
import Card from "../../components/common/Card";
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
  notificationWebhook: string;
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
  notificationWebhook: "",
  password: "",
};

function getRoleLabel(role: RoleValue) {
  return roleOptions.find((option) => option.value === role)?.label ?? "Operator";
}

function getRoleBadgeClass(role: RoleValue) {
  return role === "ADMIN" ? "role-admin" : "role-operator";
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
    notificationWebhook: user.notificationWebhook ?? "",
  };
}

function payloadFromForm(form: UserFormState): UserAccessUpdateRequest {
  return {
    nomComplet: form.nomComplet.trim(),
    email: form.email.trim().toLowerCase(),
    role: form.role,
    active: form.active,
    notificationEmail: form.notificationEmail,
    notificationWebhook: form.notificationWebhook.trim() || null,
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
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  const responseData = (error as { response?: { data?: unknown } })?.response?.data;
  if (typeof responseData === "string") return responseData;
  if (responseData && typeof responseData === "object") {
    const data = responseData as {
      error?: string;
      message?: string;
      fieldErrors?: Record<string, string>;
    };
    if (data.fieldErrors) return Object.values(data.fieldErrors).join(" ");
    return data.message ?? data.error ?? "Unable to complete this action.";
  }
  return error instanceof Error ? error.message : "Unable to complete this action.";
}

function profileToLoginResponse(user: UserAccess, currentUser: LoginResponse): LoginResponse {
  return {
    ...currentUser,
    nomComplet: user.nomComplet,
    email: user.email,
    role: user.role,
  };
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
      setUserForms(
        Object.fromEntries(data.map((item) => [item.id, formFromUser(item)])),
      );
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      const matchesSearch =
        !query ||
        user.nomComplet.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        String(user.id).includes(query);
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

  function updateUserForm<K extends keyof UserFormState>(
    id: number,
    key: K,
    value: UserFormState[K],
  ) {
    setUserForms((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [key]: value,
      },
    }));
  }

  function replaceUser(updated: UserAccess) {
    setUsers((current) => sortUsers(current.map((item) => (item.id === updated.id ? updated : item))));
    setUserForms((current) => ({ ...current, [updated.id]: formFromUser(updated) }));
    if (currentUser?.id === updated.id) {
      setUser(profileToLoginResponse(updated, currentUser));
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setPageError("");
    setNotice("");
    setCredentialNotice(null);

    const payload: UserAccessCreateRequest = {
      ...payloadFromForm(createForm),
      password: createForm.password.trim() || undefined,
    };

    try {
      const created = await createUserAccess(payload);
      setUsers((current) => sortUsers([...current, created]));
      setUserForms((current) => ({ ...current, [created.id]: formFromUser(created) }));
      setCreateForm(emptyCreateForm);
      setNotice(`${getRoleLabel(created.role)} access created for ${created.email}.`);
      if (created.temporaryPassword) {
        setCredentialNotice({
          email: created.email,
          temporaryPassword: created.temporaryPassword,
          label: "Temporary password",
        });
      }
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
    setPageError("");
    setNotice("");
    setCredentialNotice(null);
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
    setPageError("");
    setNotice("");
    setCredentialNotice(null);
    try {
      const updated = await resetUserPassword(user.id);
      replaceUser(updated);
      if (updated.temporaryPassword) {
        setCredentialNotice({
          email: updated.email,
          temporaryPassword: updated.temporaryPassword,
          label: "New temporary password",
        });
      }
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
    setPageError("");
    setNotice("");
    setCredentialNotice(null);
    try {
      await deleteUserAccess(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setUserForms((current) => {
        const next = { ...current };
        delete next[user.id];
        return next;
      });
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
      <div className="access-page stack">
        <div className="admin-mini-stats">
          <Card className="info-card compact-stat-card">
            <div className="compact-stat-icon users-tone">
              <Users size={18} strokeWidth={2.2} />
            </div>
            <div>
              <span className="compact-stat-label">Total users</span>
              <strong className="compact-stat-value">{stats.total}</strong>
            </div>
          </Card>

          <Card className="info-card compact-stat-card">
            <div className="compact-stat-icon admin-tone">
              <ShieldCheck size={18} strokeWidth={2.2} />
            </div>
            <div>
              <span className="compact-stat-label">Administrators</span>
              <strong className="compact-stat-value">{stats.administrators}</strong>
            </div>
          </Card>

          <Card className="info-card compact-stat-card">
            <div className="compact-stat-icon operator-tone">
              <UserCog size={18} strokeWidth={2.2} />
            </div>
            <div>
              <span className="compact-stat-label">Operators</span>
              <strong className="compact-stat-value">{stats.operators}</strong>
            </div>
          </Card>

          <Card className="info-card compact-stat-card">
            <div className="compact-stat-icon normal-tone">
              <UserCheck size={18} strokeWidth={2.2} />
            </div>
            <div>
              <span className="compact-stat-label">Active / inactive</span>
              <strong className="compact-stat-value">{stats.active} / {stats.inactive}</strong>
            </div>
          </Card>
        </div>

        {pageError ? <div className="error-box">{pageError}</div> : null}
        {notice ? <div className="success-box">{notice}</div> : null}
        {credentialNotice ? (
          <div className="access-credential-box">
            <div>
              <span>{credentialNotice.label}</span>
              <strong>{credentialNotice.temporaryPassword}</strong>
            </div>
            <p>
              Share this with {credentialNotice.email}. It appears here once and can be replaced later with reset password.
            </p>
          </div>
        ) : null}

        <div className="access-control-grid">
          <Card className="info-card access-form-card">
            <div className="profile-section-heading">
              <div className="compact-stat-icon users-tone">
                <MailPlus size={18} strokeWidth={2.2} />
              </div>
              <div>
                <h3>Create user access</h3>
                <p>Register an employee, assign the right workspace, and activate sign-in immediately.</p>
              </div>
            </div>

            <form className="access-form" onSubmit={handleCreateUser}>
              <div className="access-form-grid">
                <div className="form-group">
                  <label htmlFor="new-user-name">Full name</label>
                  <input
                    id="new-user-name"
                    type="text"
                    value={createForm.nomComplet}
                    onChange={(event) => updateCreateForm("nomComplet", event.target.value)}
                    placeholder="Ing. Samia Talbani"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="new-user-email">Email address</label>
                  <input
                    id="new-user-email"
                    type="email"
                    value={createForm.email}
                    onChange={(event) => updateCreateForm("email", event.target.value)}
                    placeholder="name@company.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="new-user-role">Role</label>
                  <select
                    id="new-user-role"
                    className="dashboard-input"
                    value={createForm.role}
                    onChange={(event) => updateCreateForm("role", event.target.value as RoleValue)}
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="new-user-password">Temporary password</label>
                  <input
                    id="new-user-password"
                    type="text"
                    value={createForm.password}
                    onChange={(event) => updateCreateForm("password", event.target.value)}
                    placeholder="Auto-generate if empty"
                    minLength={8}
                  />
                </div>
              </div>

              <div className="access-toggle-row">
                <label>
                  <input
                    type="checkbox"
                    checked={createForm.active}
                    onChange={(event) => updateCreateForm("active", event.target.checked)}
                  />
                  Active immediately
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={createForm.notificationEmail}
                    onChange={(event) => updateCreateForm("notificationEmail", event.target.checked)}
                  />
                  Email notifications
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="new-user-webhook">Notification webhook</label>
                <input
                  id="new-user-webhook"
                  type="url"
                  value={createForm.notificationWebhook}
                  onChange={(event) => updateCreateForm("notificationWebhook", event.target.value)}
                  placeholder="https://hooks.example.com/alerts"
                />
              </div>

              <div className="profile-action-row">
                <button className="btn btn-primary" type="submit" disabled={creating}>
                  <MailPlus size={16} strokeWidth={2.2} />
                  {creating ? "Creating..." : "Create access"}
                </button>
              </div>
            </form>
          </Card>

          <Card className="info-card access-role-card">
            <div className="profile-section-heading">
              <div className="compact-stat-icon admin-tone">
                <ShieldCheck size={18} strokeWidth={2.2} />
              </div>
              <div>
                <h3>Role access map</h3>
                <p>Every account signs in from the same login page. The selected role decides the dashboard.</p>
              </div>
            </div>

            <div className="access-role-list">
              {roleOptions.map((option) => (
                <div className="access-role-item" key={option.value}>
                  <div>
                    <span className={`role-badge ${getRoleBadgeClass(option.value)}`}>
                      {option.label}
                    </span>
                    <strong>{option.badge}</strong>
                  </div>
                  <p>{option.description}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <section className="access-users-section">
          <div className="access-users-header">
            <div>
              <h3>Current users</h3>
              <p>
                {stats.active} active / {stats.total} total accounts
              </p>
            </div>

            <div className="access-users-tools">
              <div className="admin-search-bar">
                <div className="admin-search-icon">
                  <Search size={18} strokeWidth={2.2} />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search email, name, or ID..."
                  className="admin-search-input"
                />
              </div>
              <select
                className="dashboard-input access-role-filter"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
              >
                <option value="ALL">All roles</option>
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button className="btn btn-secondary access-refresh-button" type="button" onClick={loadUsers}>
                <RefreshCcw size={16} strokeWidth={2.2} />
                Refresh
              </button>
            </div>
          </div>

          <div className="access-user-list">
            {filteredUsers.length ? (
              filteredUsers.map((item) => {
                const form = userForms[item.id] ?? formFromUser(item);
                const isCurrentUser = currentUser?.id === item.id;
                const isActive = form.active;
                return (
                  <article className="access-user-card" key={item.id}>
                    <div className="access-user-card-header">
                      <div className="admin-user-title-wrap">
                        <div className="admin-user-icon">
                          <CircleUserRound size={20} strokeWidth={2.2} />
                        </div>
                        <div>
                          <div className="access-user-title-line">
                            <h4 className="admin-user-name">{item.nomComplet}</h4>
                            {isCurrentUser ? <span className="data-badge status-normal">you</span> : null}
                          </div>
                          <p className="admin-user-email">ID {item.id} · Last login {formatDate(item.lastLoginAt)}</p>
                        </div>
                      </div>

                      <div className="access-user-actions">
                        <span className={`data-badge ${isActive ? "status-normal" : "status-critical"}`}>
                          {isActive ? "Active" : "Inactive"}
                        </span>
                        <button
                          className="access-remove-button"
                          type="button"
                          onClick={() => handleDeleteUser(item)}
                          disabled={deletingId === item.id || isCurrentUser}
                          title={isCurrentUser ? "You cannot remove your own signed-in account" : "Remove user access"}
                        >
                          <Trash2 size={15} strokeWidth={2.2} />
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="access-edit-grid">
                      <div className="form-group">
                        <label htmlFor={`user-name-${item.id}`}>Full name</label>
                        <input
                          id={`user-name-${item.id}`}
                          type="text"
                          value={form.nomComplet}
                          onChange={(event) => updateUserForm(item.id, "nomComplet", event.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor={`user-email-${item.id}`}>Email</label>
                        <input
                          id={`user-email-${item.id}`}
                          type="email"
                          value={form.email}
                          onChange={(event) => updateUserForm(item.id, "email", event.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor={`user-role-${item.id}`}>Role</label>
                        <select
                          id={`user-role-${item.id}`}
                          className="dashboard-input"
                          value={form.role}
                          onChange={(event) => updateUserForm(item.id, "role", event.target.value as RoleValue)}
                        >
                          {roleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="access-check-column">
                        <label>
                          <input
                            type="checkbox"
                            checked={form.active}
                            onChange={(event) => updateUserForm(item.id, "active", event.target.checked)}
                          />
                          Active
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={form.notificationEmail}
                            onChange={(event) => updateUserForm(item.id, "notificationEmail", event.target.checked)}
                          />
                          Email alerts
                        </label>
                      </div>
                    </div>

                    <div className="access-user-bottom-row">
                      <div className="form-group access-webhook-field">
                        <label htmlFor={`user-webhook-${item.id}`}>Webhook</label>
                        <input
                          id={`user-webhook-${item.id}`}
                          type="url"
                          value={form.notificationWebhook}
                          onChange={(event) => updateUserForm(item.id, "notificationWebhook", event.target.value)}
                          placeholder="No webhook configured"
                        />
                      </div>

                      <div className="access-user-save-row">
                        <button
                          className="btn btn-primary"
                          type="button"
                          onClick={() => handleSaveUser(item)}
                          disabled={savingId === item.id}
                        >
                          <Save size={16} strokeWidth={2.2} />
                          {savingId === item.id ? "Saving..." : "Save changes"}
                        </button>
                        <button
                          className="btn btn-secondary"
                          type="button"
                          onClick={() => handleResetPassword(item)}
                          disabled={resettingId === item.id}
                        >
                          <KeyRound size={16} strokeWidth={2.2} />
                          {resettingId === item.id ? "Resetting..." : "Reset password"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="centered-empty">No users match this search.</div>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
