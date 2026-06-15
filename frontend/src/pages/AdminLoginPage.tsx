import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { login } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";

export default function AdminLoginPage() {
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

      if (response.role !== "ADMIN") {
        setError("This account is not authorized for the administrator area.");
        return;
      }

      setUser(response);
      setSuccess("Access granted. Redirecting to the admin dashboard...");
      setTimeout(() => navigate("/admin/dashboard"), 700);
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
          <div className="section-badge">Administrator area</div>
          <h1>Administration & advanced supervision</h1>
          <p>
            Log into the administrator space to supervise the motor, review anomalies, inspect predictions
            and navigate a more strategic operational view of the platform.
          </p>

          <div className="showcase-list">
            <div className="showcase-item">Central view of the motor state</div>
            <div className="showcase-item">Priority focus on critical anomalies</div>
            <div className="showcase-item">Prediction and risk visibility</div>
            <div className="showcase-item">Future-ready management modules</div>
          </div>

          <div className="demo-pill-row">
            <div className="demo-pill">
              <strong>Demo admin email</strong>
              <div>admin@gmail.com</div>
            </div>
            <div className="demo-pill">
              <strong>Demo password</strong>
              <div>admin123</div>
            </div>
          </div>
        </Card>

        <Card className="login-form">
          <h2 className="form-title">Administrator sign in</h2>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@gmail.com"
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
