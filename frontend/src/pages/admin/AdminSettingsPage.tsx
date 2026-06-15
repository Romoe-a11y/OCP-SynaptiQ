import { useEffect, useMemo, useRef, useState } from "react";
import {
  AtSign,
  BellRing,
  Camera,
  IdCard,
  KeyRound,
  LockKeyhole,
  Mail,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { useAuth } from "../../contexts/AuthContext";
import {
  changePassword,
  deleteProfilePicture,
  getProfile,
  updateProfile,
  uploadProfilePicture,
} from "../../services/authService";
import type { LoginResponse, ProfileDetails } from "../../types";

function getErrorMessage(err: unknown) {
  const data = (err as any)?.response?.data;
  if (typeof data === "string") return data;
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.message === "string") return data.message;
  if (typeof (err as any)?.message === "string") return (err as any).message;
  return "Unable to save changes";
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function splitName(full: string): [string, string] {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 1) return [parts[0] || "", ""];
  return [parts[0], parts.slice(1).join(" ")];
}

function profileToUser(profile: ProfileDetails, fallback: LoginResponse | null): LoginResponse {
  return {
    id: profile.id,
    nomComplet: profile.nomComplet,
    email: profile.email,
    role: profile.role,
    message: "Profile updated",
    accessToken: profile.accessToken || fallback?.accessToken || "",
    refreshToken: profile.refreshToken || fallback?.refreshToken || "",
  };
}

export default function AdminSettingsPage() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [notificationEmail, setNotificationEmail] = useState(true);
  const [notificationWebhook, setNotificationWebhook] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [pictureError, setPictureError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const data = await getProfile();
        if (!mounted) return;
        setProfile(data);
        const [first, last] = splitName(data.nomComplet ?? "");
        setFirstName(first);
        setLastName(last);
        setNotificationEmail(data.notificationEmail ?? true);
        setNotificationWebhook(data.notificationWebhook ?? "");
      } catch (err: unknown) {
        if (!mounted) return;
        setProfileError(getErrorMessage(err));
        if (user) {
          setProfile({
            id: user.id,
            nomComplet: user.nomComplet,
            email: user.email,
            role: user.role as "ADMIN" | "UTILISATEUR",
            notificationEmail: true,
          });
          const [first, last] = splitName(user.nomComplet ?? "");
          setFirstName(first);
          setLastName(last);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      mounted = false;
    };
  }, [user]);

  const fullName = useMemo(() => {
    const combined = `${firstName.trim()} ${lastName.trim()}`.trim();
    return combined || "Unnamed account";
  }, [firstName, lastName]);

  const initials = useMemo(() => {
    const f = firstName.trim();
    const l = lastName.trim();
    if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
    return (f || l || "U").slice(0, 2).toUpperCase();
  }, [firstName, lastName]);

  const email = profile?.email ?? user?.email ?? "";
  const roleLabel = profile?.role === "ADMIN" ? "Administrator" : "Operator";

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setSavingProfile(true);

    const nomComplet = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (nomComplet.length < 2) {
      setProfileError("Name must be at least 2 characters.");
      setSavingProfile(false);
      return;
    }

    try {
      const updated = await updateProfile({
        nomComplet,
        email,
        notificationEmail,
        notificationWebhook: notificationWebhook.trim() || null,
      });
      setProfile(updated);
      const [first, last] = splitName(updated.nomComplet);
      setFirstName(first);
      setLastName(last);
      setNotificationEmail(updated.notificationEmail ?? true);
      setNotificationWebhook(updated.notificationWebhook ?? "");
      setUser(profileToUser(updated, user));
      setProfileSuccess("Profile updated successfully.");
    } catch (err: unknown) {
      setProfileError(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword, confirmPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Password updated successfully.");
    } catch (err: unknown) {
      setPasswordError(getErrorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  }

  async function handlePictureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPictureError("");
    setUploadingPicture(true);

    try {
      const result = await uploadProfilePicture(file);
      setProfile((prev) =>
        prev ? { ...prev, profilePictureUrl: result.profilePictureUrl } : prev
      );
    } catch (err: unknown) {
      setPictureError(getErrorMessage(err));
    } finally {
      setUploadingPicture(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handlePictureRemove() {
    setPictureError("");
    setUploadingPicture(true);
    try {
      await deleteProfilePicture();
      setProfile((prev) => (prev ? { ...prev, profilePictureUrl: null } : prev));
    } catch (err: unknown) {
      setPictureError(getErrorMessage(err));
    } finally {
      setUploadingPicture(false);
    }
  }

  if (loading && !profile) {
    return (
      <DashboardLayout title="Profile" subtitle="Loading profile..." roleLabel="Administrator">
        <Loader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Profile"
      subtitle="Edit your account identity, security and notification preferences."
      roleLabel="Administrator"
    >
      <div className="stack profile-settings-page">
        <div className="profile-editor-grid">
          <Card className="info-card profile-summary-card">
            <div className="profile-picture-section">
              {profile?.profilePictureUrl ? (
                <img
                  src={profile.profilePictureUrl}
                  alt="Profile"
                  className="profile-avatar-image"
                />
              ) : (
                <div className="profile-avatar-large">{initials}</div>
              )}

              <div className="profile-picture-actions">
                <button
                  className="profile-picture-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPicture}
                  title="Upload picture"
                >
                  <Camera size={15} strokeWidth={2.2} />
                  <span>{uploadingPicture ? "Uploading..." : "Upload"}</span>
                </button>

                {profile?.profilePictureUrl && (
                  <button
                    className="profile-picture-btn danger"
                    onClick={handlePictureRemove}
                    disabled={uploadingPicture}
                    title="Remove picture"
                  >
                    <Trash2 size={15} strokeWidth={2.2} />
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePictureUpload}
                style={{ display: "none" }}
              />

              {pictureError && <div className="error-box compact">{pictureError}</div>}
            </div>

            <div>
              <div className="section-badge">Current profile</div>
              <h3>{fullName}</h3>
              <p>{email || "No email configured"}</p>
            </div>

            <div className="profile-meta-list">
              <div className="profile-meta-row">
                <IdCard size={17} strokeWidth={2.2} />
                <span>Account ID</span>
                <strong>#{profile?.id ?? user?.id ?? "--"}</strong>
              </div>
              <div className="profile-meta-row">
                <ShieldCheck size={17} strokeWidth={2.2} />
                <span>Role</span>
                <strong>{roleLabel}</strong>
              </div>
              <div className="profile-meta-row">
                <LockKeyhole size={17} strokeWidth={2.2} />
                <span>Status</span>
                <strong>{profile?.accountLocked ? "Locked" : "Active"}</strong>
              </div>
              <div className="profile-meta-row">
                <AtSign size={17} strokeWidth={2.2} />
                <span>Last login</span>
                <strong>{formatDate(profile?.lastLoginAt)}</strong>
              </div>
            </div>
          </Card>

          <Card className="info-card profile-form-card">
            <div className="profile-section-heading">
              <div className="settings-panel-icon settings-tone">
                <UserRound size={18} strokeWidth={2.2} />
              </div>
              <div>
                <h3>Account details</h3>
                <p>Update the name shown across the platform.</p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="profile-form">
              <div className="profile-form-grid">
                <div className="form-group">
                  <label htmlFor="profile-first-name">First name</label>
                  <input
                    id="profile-first-name"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    minLength={1}
                    maxLength={50}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="profile-last-name">Last name</label>
                  <input
                    id="profile-last-name"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    maxLength={50}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="profile-email">Email address</label>
                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  readOnly
                  disabled
                  className="input-readonly"
                />
                <small className="form-hint">Email cannot be changed. Contact an administrator.</small>
              </div>

              <div className="profile-section-heading profile-subsection-heading">
                <div className="settings-panel-icon report-tone">
                  <BellRing size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3>Notifications</h3>
                  <p>Control direct notification delivery for your account.</p>
                </div>
              </div>

              <label className="profile-toggle-row" htmlFor="notification-email">
                <span>
                  <strong>Email notifications</strong>
                  <small>Receive account and operational notifications by email.</small>
                </span>
                <input
                  id="notification-email"
                  type="checkbox"
                  checked={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.checked)}
                />
              </label>

              <div className="form-group">
                <label htmlFor="notification-webhook">Webhook URL</label>
                <input
                  id="notification-webhook"
                  type="url"
                  value={notificationWebhook}
                  onChange={(e) => setNotificationWebhook(e.target.value)}
                  maxLength={500}
                  placeholder="https://example.com/alerts"
                />
                <small className="form-hint">
                  Receive real-time JSON payloads on motor alerts and status changes.
                </small>
              </div>

              <div className="profile-action-row">
                <Button type="submit" disabled={savingProfile}>
                  <Save size={17} strokeWidth={2.2} />
                  {savingProfile ? "Saving..." : "Save profile"}
                </Button>
              </div>

              {profileError ? <div className="error-box">{profileError}</div> : null}
              {profileSuccess ? <div className="success-box">{profileSuccess}</div> : null}
            </form>
          </Card>
        </div>

        <Card className="info-card profile-security-card">
          <div className="profile-section-heading">
            <div className="settings-panel-icon monitor-tone">
              <KeyRound size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h3>Password and security</h3>
              <p>Change the password used to sign into this account.</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="profile-form">
            <div className="profile-form-grid profile-password-grid">
              <div className="form-group">
                <label htmlFor="current-password">Current password</label>
                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password">Confirm new password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <div className="profile-action-row">
              <Button type="submit" variant="secondary" disabled={savingPassword}>
                <KeyRound size={17} strokeWidth={2.2} />
                {savingPassword ? "Updating..." : "Update password"}
              </Button>
            </div>

            {passwordError ? <div className="error-box">{passwordError}</div> : null}
            {passwordSuccess ? <div className="success-box">{passwordSuccess}</div> : null}
          </form>
        </Card>

        <div className="admin-mini-stats">
          <Card className="info-card compact-stat-card">
            <div className="compact-stat-icon settings-tone">
              <UserRound size={18} strokeWidth={2.2} />
            </div>
            <div>
              <span className="compact-stat-label">Display name</span>
              <strong className="compact-stat-value">{fullName}</strong>
            </div>
          </Card>

          <Card className="info-card compact-stat-card">
            <div className="compact-stat-icon monitor-tone">
              <ShieldCheck size={18} strokeWidth={2.2} />
            </div>
            <div>
              <span className="compact-stat-label">Role</span>
              <strong className="compact-stat-value">{roleLabel}</strong>
            </div>
          </Card>

          <Card className="info-card compact-stat-card">
            <div className="compact-stat-icon report-tone">
              <Mail size={18} strokeWidth={2.2} />
            </div>
            <div>
              <span className="compact-stat-label">Email alerts</span>
              <strong className="compact-stat-value">{notificationEmail ? "Enabled" : "Disabled"}</strong>
            </div>
          </Card>

          <Card className="info-card compact-stat-card">
            <div className="compact-stat-icon operator-tone">
              <LockKeyhole size={18} strokeWidth={2.2} />
            </div>
            <div>
              <span className="compact-stat-label">Login count</span>
              <strong className="compact-stat-value">{profile?.loginCount ?? 0}</strong>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
