import { useEffect, useMemo, useRef, useState } from "react";
import {
  AtSign,
  Bell,
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
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;
  if (typeof (err as any)?.message === "string") return (err as any).message;
  return "Unable to save changes";
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function splitName(full: string): [string, string] {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 1) return [parts[0] || "", ""];
  return [parts[0], parts.slice(1).join(" ")];
}

const MAX_PROFILE_IMAGE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_PROFILE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/bmp",
]);

function isSupportedProfileImage(file: File) {
  if (SUPPORTED_PROFILE_IMAGE_TYPES.has(file.type)) return true;
  return /\.(jpe?g|png|gif|bmp)$/i.test(file.name);
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
    return () => { mounted = false; };
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

    if (!isSupportedProfileImage(file)) {
      setPictureError("Use a JPG, PNG, GIF, or BMP image.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setPictureError("Profile picture must be 10 MB or smaller.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

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
      {/* ── KPI strip ── */}
      <div className="profile-settings-page">
      <div className="v2-kpi-grid profile-kpi-grid">
        <div className="v2-kpi">
          <span className="ic t-green"><UserRound size={18} strokeWidth={2.2} /></span>
          <div className="label">Display name</div>
          <div className="value" style={{ fontSize: "1rem" }}>{fullName}</div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-ok"><ShieldCheck size={18} strokeWidth={2.2} /></span>
          <div className="label">Role</div>
          <div className="value" style={{ fontSize: "1rem" }}>{roleLabel}</div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-purple"><Mail size={18} strokeWidth={2.2} /></span>
          <div className="label">Email alerts</div>
          <div className="value" style={{ fontSize: "1rem" }}>{notificationEmail ? "Enabled" : "Disabled"}</div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-cur"><LockKeyhole size={18} strokeWidth={2.2} /></span>
          <div className="label">Login count</div>
          <div className="value">{profile?.loginCount ?? 0}</div>
        </div>
      </div>

      {/* ── Profile + Account grid ── */}
      <div className="profile-editor-grid">
        {/* Left: Avatar summary */}
        <div className="v2-card profile-summary-card">
          <div className="v2-card-head"><h3>Profile summary</h3></div>

          <div className="profile-picture-section">
            {profile?.profilePictureUrl ? (
              <img
                src={profile.profilePictureUrl}
                alt="Profile"
                className="profile-avatar-image"
              />
            ) : (
              <div className="profile-avatar-large">
                {initials}
              </div>
            )}

            <div className="profile-picture-actions">
              <button
                type="button"
                className="profile-picture-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPicture}
              >
                <Camera size={15} />
                {uploadingPicture ? "Uploading..." : "Upload"}
              </button>
              {profile?.profilePictureUrl && (
                <button
                  type="button"
                  className="profile-picture-btn danger"
                  onClick={handlePictureRemove}
                  disabled={uploadingPicture}
                  aria-label="Remove profile picture"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/bmp,.jpg,.jpeg,.png,.gif,.bmp" onChange={handlePictureUpload} style={{ display: "none" }} />
            {pictureError && <div className="v2-note warning">{pictureError}</div>}
          </div>

          <div className="profile-meta-list">
            <div className="profile-meta-row">
              <IdCard size={14} />
              <span>Account ID</span>
              <strong>#{profile?.id ?? user?.id ?? "--"}</strong>
            </div>
            <div className="profile-meta-row">
              <ShieldCheck size={14} />
              <span>Role</span>
              <strong>{roleLabel}</strong>
            </div>
            <div className="profile-meta-row">
              <LockKeyhole size={14} />
              <span>Status</span>
              <strong>{profile?.accountLocked ? "Locked" : "Active"}</strong>
            </div>
            <div className="profile-meta-row">
              <AtSign size={14} />
              <span>Last login</span>
              <strong>{formatDate(profile?.lastLoginAt)}</strong>
            </div>
          </div>
        </div>

        {/* Right: Account details form */}
        <div className="v2-card profile-form-card">
          <div className="profile-section-heading">
            <span className="profile-section-icon t-green"><UserRound size={19} /></span>
            <div>
              <h3>Account details</h3>
              <p>Update the name shown across the platform.</p>
            </div>
          </div>

          <form className="profile-form" onSubmit={handleProfileSubmit}>
            <div className="profile-form-grid">
              <div className="v2-field">
                <label>First name</label>
                <input className="v2-input" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required minLength={1} maxLength={50} />
              </div>
              <div className="v2-field">
                <label>Last name</label>
                <input className="v2-input" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={50} />
              </div>
            </div>

            <div className="v2-field">
              <label>Email address</label>
              <input className="v2-input input-readonly" type="email" value={email} readOnly disabled />
              <small className="form-hint">Email cannot be changed. Contact an administrator.</small>
            </div>

            <div className="profile-section-heading profile-subsection-heading">
              <span className="profile-section-icon t-warn"><Bell size={19} /></span>
              <div>
                <h3>Notifications</h3>
                <p>Control direct notification delivery for your account.</p>
              </div>
            </div>

            <label className="profile-toggle-row">
              <div>
                <strong>Email notifications</strong>
                <small>Receive account and operational notifications by email.</small>
              </div>
              <input type="checkbox" checked={notificationEmail} onChange={(e) => setNotificationEmail(e.target.checked)} />
            </label>

            <div className="v2-field">
              <label>Webhook URL</label>
              <input className="v2-input" type="url" value={notificationWebhook} onChange={(e) => setNotificationWebhook(e.target.value)} maxLength={500} placeholder="https://example.com/alerts" />
              <small className="form-hint">Receive real-time JSON payloads on motor alerts and status changes.</small>
            </div>

            <div className="profile-action-row">
              <button type="submit" className="v2-btn v2-btn-primary" disabled={savingProfile}>
                <Save size={17} />
                {savingProfile ? "Saving..." : "Save profile"}
              </button>
            </div>

            {profileError && <div className="v2-note warning" style={{ marginTop: 10 }}>{profileError}</div>}
            {profileSuccess && <div className="v2-note" style={{ marginTop: 10, background: "rgba(34,197,94,.08)", color: "var(--ok)" }}>{profileSuccess}</div>}
          </form>
        </div>
      </div>

      {/* ── Password & Security ── */}
      <div className="v2-card profile-security-card">
        <div className="profile-section-heading">
          <span className="profile-section-icon t-green"><KeyRound size={19} /></span>
          <div>
            <h3>Password and security</h3>
            <p>Change the password used to sign into this account.</p>
          </div>
        </div>

        <form className="profile-form" onSubmit={handlePasswordSubmit}>
          <div className="v2-field-grid profile-password-grid">
            <div className="v2-field">
              <label>Current password</label>
              <input className="v2-input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" required />
            </div>
            <div className="v2-field">
              <label>New password</label>
              <input className="v2-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} autoComplete="new-password" required />
            </div>
            <div className="v2-field">
              <label>Confirm new password</label>
              <input className="v2-input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} autoComplete="new-password" required />
            </div>
          </div>

          <div className="profile-action-row">
            <button type="submit" className="v2-btn v2-btn-soft" disabled={savingPassword}>
              <KeyRound size={17} />
              {savingPassword ? "Updating..." : "Update password"}
            </button>
          </div>

          {passwordError && <div className="v2-note warning" style={{ marginTop: 10 }}>{passwordError}</div>}
          {passwordSuccess && <div className="v2-note" style={{ marginTop: 10, background: "rgba(34,197,94,.08)", color: "var(--ok)" }}>{passwordSuccess}</div>}
        </form>
      </div>
      </div>
    </DashboardLayout>
  );
}
