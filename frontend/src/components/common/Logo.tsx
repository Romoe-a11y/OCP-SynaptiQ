import ocpLogo from "../../assets/images/ocp-logo.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  withText?: boolean;
}

export default function Logo({ size = "md", withText = true }: LogoProps) {
  const sizes = {
    sm: { imageHeight: 34, title: "1rem", subtitle: "0.58rem", gap: 10 },
    md: { imageHeight: 42, title: "1.18rem", subtitle: "0.64rem", gap: 12 },
    lg: { imageHeight: 54, title: "1.38rem", subtitle: "0.72rem", gap: 14 },
  };

  const current = sizes[size];

  return (
    <div className="logo-lockup" style={{ gap: current.gap }}>
      <div className="logo-mark logo-mark-image" aria-hidden="true">
        <img
          src={ocpLogo}
          alt="OCP logo"
          style={{ height: current.imageHeight, width: "auto" }}
        />
      </div>

      {withText ? (
        <div className="brand-stack">
          <div className="brand-title" style={{ fontSize: current.title }}>
            OCP <span>SynaptiQ</span>
          </div>
          <div className="brand-subtitle" style={{ fontSize: current.subtitle }}>
            Motor Monitoring Platform
          </div>
        </div>
      ) : null}
    </div>
  );
}
