import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import { Activity, TriangleAlert, ChartColumnBig, Cpu } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="landing-page">
      <Navbar />

      <section className="hero-section">
        <div className="container hero-grid hero-grid-split">
          <div className="hero-left hero-copy">
            <div className="section-badge">OCP Motor Monitoring Suite</div>

            <h1 className="hero-title">
              Industrial motor
              <br />
              <span>intelligence in motion.</span>
            </h1>

            <p className="hero-text">
              Real-time telemetry, anomaly detection and predictive analysis
              for industrial motor supervision.
            </p>

            <div className="hero-actions">
              <Link to="/select-role">
                <Button>Access platform</Button>
              </Link>
            </div>

            <div className="hero-stat-row">
              <div className="hero-stat">
                <strong>4</strong>
                <span>Telemetry streams</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <strong>AI</strong>
                <span>Diagnosis engine</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <strong>2</strong>
                <span>Operational spaces</span>
              </div>
            </div>
          </div>

          <div className="hero-right hero-right-panel">
            <Card className="visual-card visual-card-clean">
              <div className="vc-header">
                <div className="vc-kicker">Platform overview</div>
                <div className="nav-status">
                  <span className="nav-dot" />
                  <span>Live</span>
                </div>
              </div>

              <div className="vc-feature-grid">
                <div className="vc-feature">
                  <div className="vc-feature-icon">
                    <Activity size={20} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="vc-feature-title">Live telemetry</div>
                    <div className="vc-feature-sub">Temp / Current / Vibration / RPM</div>
                  </div>
                </div>

                <div className="vc-feature">
                  <div className="vc-feature-icon">
                    <TriangleAlert size={20} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="vc-feature-title">Alerts & anomalies</div>
                    <div className="vc-feature-sub">Severity-classified events</div>
                  </div>
                </div>

                <div className="vc-feature">
                  <div className="vc-feature-icon">
                    <ChartColumnBig size={20} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="vc-feature-title">Predictive analysis</div>
                    <div className="vc-feature-sub">Failure risk & confidence scores</div>
                  </div>
                </div>

                <div className="vc-feature">
                  <div className="vc-feature-icon">
                    <Cpu size={20} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="vc-feature-title">AI diagnosis</div>
                    <div className="vc-feature-sub">Scenario-based decision support</div>
                  </div>
                </div>
              </div>

              <div className="vc-status-strip">
                <div className="vc-status-item">
                  <span className="vc-status-label">Temperature</span>
                  <span className="vc-status-val">74.2 °C</span>
                </div>
                <div className="vc-status-item">
                  <span className="vc-status-label">Current</span>
                  <span className="vc-status-val">22.1 A</span>
                </div>
                <div className="vc-status-item">
                  <span className="vc-status-label">Vibration</span>
                  <span className="vc-status-val">0.84</span>
                </div>
                <div className="vc-status-item">
                  <span className="vc-status-label">Status</span>
                  <span className="vc-status-val status-normal">Normal</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
