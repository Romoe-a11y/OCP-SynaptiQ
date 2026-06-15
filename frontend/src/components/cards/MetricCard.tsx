import Card from "../common/Card";

interface Props {
  label: string;
  value: string | number;
  statusClass?: string;
  helper?: string;
}

export default function MetricCard({ label, value, statusClass = "", helper }: Props) {
  return (
    <Card className="metric-card">
      <small>{label}</small>
      <h3 className={statusClass}>{value}</h3>
      {helper ? <p>{helper}</p> : null}
    </Card>
  );
}
