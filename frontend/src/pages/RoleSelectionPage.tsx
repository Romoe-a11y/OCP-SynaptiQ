import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { login } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";
import { Activity, Brain, ShieldCheck, Users } from "lucide-react";

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
    <div className="role-page unified-login-page">
      <div className="role-shell unified-login-shell">
        <div className="role-topbar">
          <Link to="/" className="back-link">
            Back to landing page
          </Link>
        </div>

        <div className="unified-login-grid">
          <Card className="unified-login-story">
            <div className="section-badge">Unified access gateway</div>
            <h1>One login for every operational role.</h1>
            <p>
              Sign in once and SynaptiQ routes you to the correct workspace automatically:
              administrator supervision for platform control, or operator visibility for daily monitoring.
            </p>

            <div className="unified-login-highlights">
              <div className="unified-highlight">
                <ShieldCheck size={20} strokeWidth={2.2} />
                <span>Role-aware routing after authentication</span>
              </div>
              <div className="unified-highlight">
                <Activity size={20} strokeWidth={2.2} />
                <span>Live motor status, alerts and predictions</span>
              </div>
              <div className="unified-highlight">
                <Brain size={20} strokeWidth={2.2} />
                <span>AI diagnosis available from authorized workspaces</span>
              </div>
            </div>
          </Card>

          <Card className="unified-login-form">
            <div className="unified-form-icon">
              <Users size={22} strokeWidth={2.2} />
            </div>
            <h2 className="form-title">Employee sign in</h2>
            <p className="unified-form-copy">
              Use any active platform account. The app will open the right dashboard for your role.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="employee-email">Email</label>
                <input
                  id="employee-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Example@domain.com"
                  disabled={locked}
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="employee-password">Password</label>
                <input
                  id="employee-password"
                  name="password"
                  type="password"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="********"
                  disabled={locked}
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" disabled={loading || locked}>
                {loading ? "Signing in..." : locked ? "Account locked" : "Sign in"}
              </Button>

              {error ? <div className="error-box">{error}</div> : null}
              {success ? <div className="success-box">{success}</div> : null}
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
