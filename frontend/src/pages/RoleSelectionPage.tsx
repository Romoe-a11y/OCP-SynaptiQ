import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Brain,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Users,
} from "lucide-react";
import ocpLogo from "../assets/images/ocp-logo.png";

function destinationForRole(role: string) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "UTILISATEUR") return "/user/dashboard";
  return null;
}

function getLoginErrorMessage(err: any) {
  const data = err?.response?.data;
  if (typeof data === "string") return data;
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.message === "string") return data.message;
  if (typeof err?.message === "string") return err.message;
  return "Connection error";
}

export default function RoleSelectionPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLocked(false);
    setLoading(true);

    try {
      const response = await login({ email, motDePasse });
      const destination = destinationForRole(response.role);

      if (!destination) {
        setError("This account role is not available in the platform.");
        return;
      }

      setUser(response);
      setSuccess(`Welcome ${response.nomComplet}. Opening your workspace...`);
      setTimeout(() => navigate(destination), 500);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 423) {
        setLocked(true);
        setError("Account locked after too many failed attempts. Contact an administrator.");
      } else {
        setError(getLoginErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="si-page">
      <div className="si-shell">
        <div className="si-topbar">
          <Link to="/" className="si-brand">
            <span className="si-brand-chip">
              <img src={ocpLogo} alt="OCP logo" />
            </span>
            <span className="si-brand-text">
              <span className="si-brand-name">OCP <b>SynaptiQ</b></span>
              <span className="si-brand-sub">Motor Intelligence</span>
            </span>
          </Link>
          <Link to="/" className="si-back-link">
            <ArrowLeft size={16} /> Back to home
          </Link>
        </div>

        <div className="si-card">
          <div className="si-story">
            <div>
              <span className="si-badge"><span className="si-dot" /> Unified access gateway</span>
              <h1>One login for every<br /><span>operational role.</span></h1>
              <p>Sign in once and SynaptiQ routes you to the right workspace automatically - administrator supervision for platform control, or operator visibility for daily monitoring.</p>
              <div className="si-highlights">
                <div className="si-hl"><span className="si-hl-ic"><ShieldCheck size={20} /></span><span>Role-aware routing after authentication</span></div>
                <div className="si-hl"><span className="si-hl-ic"><Activity size={20} /></span><span>Live motor status, alerts and predictions</span></div>
                <div className="si-hl"><span className="si-hl-ic"><Brain size={20} /></span><span>AI diagnosis from authorized workspaces</span></div>
              </div>
            </div>
            <div className="si-story-foot">
              <span className="si-live"><span className="si-pulse" /> Platform online</span>
              <span>- 24/7 supervision across OCP sites</span>
            </div>
          </div>

          <div className="si-form-panel">
            <div className="si-form-icon"><Users size={24} /></div>
            <h2>Employee sign in</h2>
            <p className="si-sub">Use any active platform account. The app will open the right dashboard for your role.</p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="si-field">
                <label htmlFor="si-email">Email</label>
                <div className="si-input-wrap">
                  <Mail size={18} className="si-lead" />
                  <input
                    id="si-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@ocpgroup.ma"
                    disabled={locked}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="si-field">
                <label htmlFor="si-password">Password</label>
                <div className="si-input-wrap">
                  <Lock size={18} className="si-lead" />
                  <input
                    id="si-password"
                    type={showPw ? "text" : "password"}
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    placeholder="********"
                    disabled={locked}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="si-toggle-pw"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="si-row-between">
                <label className="si-remember">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span className="si-box"><Check size={13} /></span>
                  Keep me signed in
                </label>
              </div>

              {error && <div className="si-error">{error}</div>}
              {success && <div className="si-success">{success}</div>}

              <button type="submit" className="si-btn-signin" disabled={loading || locked}>
                {loading ? "Signing in..." : locked ? "Account locked" : "Sign in"}
                {!loading && !locked && <ArrowRight size={18} />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
