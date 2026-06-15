import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { login } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";

export default function UserLoginPage() {
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

      if (response.role !== "UTILISATEUR") {
        setError("This account is not authorized for the operator area.");
        return;
      }

      setUser(response);
      setSuccess("Access granted. Redirecting to the operator dashboard...");
      setTimeout(() => navigate("/user/dashboard"), 700);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 423) {
        setLocked(true);
        setError("Account locked after too many failed attempts. Contact an administrator.");
      } else {
        setError(err?.response?.data || err?.message || "Connection error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        <Card className="login-showcase">
          <div className="section-badge">Operator area</div>
          <h1>Operational motor visibility</h1>
          <p>
            Access the user space to consult current measures, recent alerts, detected anomalies and
            the global risk level in a focused operational interface.
          </p>

          <div className="showcase-list">
            <div className="showcase-item">Live motor state overview</div>
            <div className="showcase-item">Recent alerts and anomaly context</div>
            <div className="showcase-item">Prediction and risk summary</div>
            <div className="showcase-item">History and export access</div>
          </div>
        </Card>

        <Card className="login-form">
          <h2 className="form-title">Operator sign in</h2>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@example.com"
                disabled={locked}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                placeholder="********"
                disabled={locked}
              />
            </div>

            <Button type="submit" disabled={loading || locked}>
              {loading ? "Signing in..." : locked ? "Account locked" : "Sign in"}
            </Button>

            {error ? <div className="error-box">{error}</div> : null}
            {success ? <div className="success-box">{success}</div> : null}
          </form>

          <div className="login-form-footer">
            <Link to="/select-role" className="login-back-link">
              Back to role selection
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
