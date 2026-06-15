import { Link } from "react-router-dom";
import Button from "../common/Button";
import Logo from "../common/Logo";

export default function Navbar() {
  return (
    <header className="nav-shell">
      <div className="container nav-inner">
        <Link to="/" className="brand-link" aria-label="Go to landing page">
          <Logo size="md" />
        </Link>

        <div className="nav-actions">
          <div className="nav-status">
            <span className="nav-dot" />
            <span>Monitoring environment online</span>
          </div>

          <Link to="/select-role">
            <Button variant="secondary">Log In</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
