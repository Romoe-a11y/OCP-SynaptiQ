import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Play,
  Activity,
  TriangleAlert,
  ChartColumnBig,
  Brain,
  Thermometer,
  Zap,
  Gauge,
  RadioTower,
  ScanSearch,
  ShieldCheck,
  TrendingUp,
  Factory,
  Cpu,
  Settings2,
  Database,
} from "lucide-react";
import ocpLogo from "../assets/images/ocp-logo.png";

export default function LandingPage() {
  useEffect(() => {
    const nav = document.getElementById("lv2-nav");
    if (!nav) return;
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="landing-v2">
      {/* ─── NAV ─── */}
      <nav className="lv2-nav" id="lv2-nav">
        <div className="lv2-wrap lv2-nav-inner">
          <Link to="/" className="lv2-brand">
            <span className="lv2-brand-chip">
              <img src={ocpLogo} alt="OCP logo" />
            </span>
            <span className="lv2-brand-text">
              <span className="lv2-brand-name">OCP <b>SynaptiQ</b></span>
              <span className="lv2-brand-sub">Motor Intelligence</span>
            </span>
          </Link>
          <div className="lv2-nav-cta">
            <Link to="/select-role" className="lv2-nav-signin">Sign in</Link>
            <Link to="/select-role" className="lv2-btn lv2-btn-primary lv2-btn-sm">
              Access platform <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <header className="lv2-hero">
        <div className="lv2-wrap lv2-hero-grid">
          <div className="lv2-hero-copy">
            <span className="lv2-eyebrow"><span className="lv2-dot" /> OCP Motor Monitoring Suite</span>
            <h1>Industrial motor<br /><span className="lv2-accent">intelligence in motion.</span></h1>
            <p className="lv2-hero-sub">
              Real-time telemetry, anomaly detection and predictive analysis — built to keep OCP's critical motors running, and to flag failures before they happen.
            </p>
            <div className="lv2-hero-actions">
              <Link to="/select-role" className="lv2-btn lv2-btn-primary">
                Access platform <ArrowRight size={17} />
              </Link>
              <Link to="/select-role" className="lv2-btn lv2-btn-ghost">
                <Play size={16} /> See the dashboard
              </Link>
            </div>
            <div className="lv2-hero-stats">
              <div className="lv2-hero-stat"><div className="lv2-num">4</div><div className="lv2-lbl">Telemetry streams</div></div>
              <div className="lv2-hero-stat"><div className="lv2-num"><span>AI</span></div><div className="lv2-lbl">Diagnosis engine</div></div>
              <div className="lv2-hero-stat"><div className="lv2-num">24/7</div><div className="lv2-lbl">Live supervision</div></div>
            </div>
          </div>

          {/* Preview card */}
          <div className="lv2-hero-visual">
            <div className="lv2-pv-badge lv2-pv-tl">
              <span className="lv2-bi"><ShieldCheck size={16} /></span>
              <span><span className="lv2-bt">Health score</span><span className="lv2-bv">98.4%</span></span>
            </div>
            <div className="lv2-pv-badge lv2-pv-br">
              <span className="lv2-bi"><TrendingUp size={16} /></span>
              <span><span className="lv2-bt">Predicted RUL</span><span className="lv2-bv">142 days</span></span>
            </div>

            <div className="lv2-preview">
              <div className="lv2-pv-top">
                <div className="lv2-pv-title">
                  <span className="lv2-mark"><img src={ocpLogo} alt="" /></span>
                  Motor MTR-04 · Beni Amir
                </div>
                <span className="lv2-pv-live"><span className="lv2-pulse" /> LIVE</span>
              </div>
              <div className="lv2-pv-metrics">
                <div className="lv2-pv-metric lv2-tone-temp">
                  <div className="lv2-k"><span className="lv2-ic"><Thermometer size={14} /></span> Temperature</div>
                  <div className="lv2-v">74.2<small> °C</small></div>
                </div>
                <div className="lv2-pv-metric lv2-tone-cur">
                  <div className="lv2-k"><span className="lv2-ic"><Zap size={14} /></span> Current</div>
                  <div className="lv2-v">22.1<small> A</small></div>
                </div>
                <div className="lv2-pv-metric lv2-tone-vib">
                  <div className="lv2-k"><span className="lv2-ic"><Activity size={14} /></span> Vibration</div>
                  <div className="lv2-v">0.84<small> mm/s</small></div>
                </div>
                <div className="lv2-pv-metric lv2-tone-rpm">
                  <div className="lv2-k"><span className="lv2-ic"><Gauge size={14} /></span> Speed</div>
                  <div className="lv2-v">1,486<small> rpm</small></div>
                </div>
              </div>
              <div className="lv2-pv-foot">
                <div className="lv2-d">
                  <span className="lv2-ai"><Brain size={16} /></span>
                  <div><div className="lv2-lab">AI Diagnosis</div><div className="lv2-res">Operating within normal range</div></div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="lv2-lab">Confidence</div>
                  <div className="lv2-pct">96%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ─── TRUST ─── */}
      <section className="lv2-trust">
        <div className="lv2-wrap">
          <div className="lv2-trust-label">Built for OCP industrial operations</div>
          <div className="lv2-trust-row">
            <div className="lv2-trust-item"><Factory size={18} /> Beni Amir</div>
            <div className="lv2-trust-item"><Cpu size={18} /> Khouribga</div>
            <div className="lv2-trust-item"><Settings2 size={18} /> Jorf Lasfar</div>
            <div className="lv2-trust-item"><RadioTower size={18} /> Safi</div>
            <div className="lv2-trust-item"><Database size={18} /> Gantour</div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="lv2-sec">
        <div className="lv2-wrap">
          <div className="lv2-sec-head">
            <div className="lv2-kicker">The platform</div>
            <h2>One supervision layer for every motor</h2>
            <p>From live sensor streams to AI-driven decision support — SynaptiQ unifies the entire predictive-maintenance loop.</p>
          </div>
          <div className="lv2-feat-grid">
            <div className="lv2-feat">
              <div className="lv2-feat-ic"><Activity size={22} /></div>
              <h3>Live telemetry</h3>
              <p>Temperature, current, vibration and speed streamed continuously from every monitored motor.</p>
            </div>
            <div className="lv2-feat">
              <div className="lv2-feat-ic"><TriangleAlert size={22} /></div>
              <h3>Alerts & anomalies</h3>
              <p>Severity-classified events surface the moment a reading drifts beyond its safe envelope.</p>
            </div>
            <div className="lv2-feat">
              <div className="lv2-feat-ic"><ChartColumnBig size={22} /></div>
              <h3>Predictive analysis</h3>
              <p>Failure-risk scoring and remaining-useful-life estimates with calibrated confidence.</p>
            </div>
            <div className="lv2-feat">
              <div className="lv2-feat-ic"><Brain size={22} /></div>
              <h3>AI diagnosis</h3>
              <p>Scenario-based decision support that explains what's happening and what to do next.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="lv2-sec lv2-how">
        <div className="lv2-wrap">
          <div className="lv2-sec-head">
            <div className="lv2-kicker">How it works</div>
            <h2>From raw signal to confident action</h2>
            <p>A continuous loop that ingests sensor data, detects what's abnormal, and predicts what comes next.</p>
          </div>
          <div className="lv2-steps">
            <div className="lv2-step">
              <div className="lv2-step-num"><span>01</span> INGEST</div>
              <div className="lv2-step-ic"><RadioTower size={24} /></div>
              <h3>Stream & store</h3>
              <p>Batch and real-time sensor ingestion lands every measurement in a durable operational store, ready for analysis.</p>
            </div>
            <div className="lv2-step">
              <div className="lv2-step-num"><span>02</span> DETECT</div>
              <div className="lv2-step-ic"><ScanSearch size={24} /></div>
              <h3>Detect anomalies</h3>
              <p>Anomaly models and decision thresholds classify events by severity and raise alerts with full context.</p>
            </div>
            <div className="lv2-step">
              <div className="lv2-step-num"><span>03</span> PREDICT</div>
              <div className="lv2-step-ic"><TrendingUp size={24} /></div>
              <h3>Predict & advise</h3>
              <p>Remaining-useful-life estimates and AI diagnostic scenarios guide the right action at the right time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="lv2-cta-sec">
        <div className="lv2-wrap">
          <div className="lv2-cta-card">
            <h2>Ready to see your motors clearly?</h2>
            <p>Sign in to the OCP SynaptiQ platform and start monitoring with predictive confidence.</p>
            <Link to="/select-role" className="lv2-btn lv2-btn-lime">
              Access platform <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="lv2-footer">
        <div className="lv2-wrap lv2-foot-inner">
          <div className="lv2-foot-brand">
            <span className="lv2-brand">
              <span className="lv2-brand-chip"><img src={ocpLogo} alt="OCP logo" /></span>
              <span className="lv2-brand-text">
                <span className="lv2-brand-name lv2-foot-name">OCP <b>SynaptiQ</b></span>
              </span>
            </span>
            <p>Predictive motor supervision for OCP Group's industrial operations.</p>
          </div>
          <div className="lv2-foot-col">
            <h4>Platform</h4>
            <Link to="/select-role">Dashboard</Link>
            <Link to="/select-role">Alerts</Link>
            <Link to="/select-role">Predictions</Link>
            <Link to="/select-role">AI Diagnosis</Link>
          </div>
          <div className="lv2-foot-col">
            <h4>Resources</h4>
            <Link to="/select-role">Documentation</Link>
            <Link to="/select-role">API Reference</Link>
            <Link to="/select-role">Support</Link>
          </div>
          <div className="lv2-foot-bottom">
            © {new Date().getFullYear()} OCP Group. OCP SynaptiQ is an internal tool.
          </div>
        </div>
      </footer>
    </div>
  );
}
