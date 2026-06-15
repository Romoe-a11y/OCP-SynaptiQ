import DashboardLayout from "../../components/layout/DashboardLayout";
import Card from "../../components/common/Card";
import Loader from "../../components/common/Loader";
import ApiError from "../../components/common/ApiError";
import PredictionCard from "../../components/cards/PredictionCard";
import { useApi } from "../../hooks/useApi";
import { getPredictions } from "../../services/dashboardService";

export default function UserPredictionsPage() {
  const { data: items, loading, error, reload } = useApi(getPredictions, [], 3_000);

  if (loading) {
    return (
      <DashboardLayout title="User Predictions" subtitle="Loading..." roleLabel="Operator">
        <Loader />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="User Predictions" subtitle="Unable to load" roleLabel="Operator">
        <ApiError message={error} onRetry={reload} />
      </DashboardLayout>
    );
  }

  const predictions = items ?? [];

  return (
    <DashboardLayout title="User Predictions" subtitle="Prediction visibility and risk level in the operational user space." roleLabel="Operator">
      <Card className="info-card">
        <div className="card-title-row"><h3>Prediction summary</h3></div>
        <div className="list-stack">
          {predictions.length ? predictions.map((prediction) => <PredictionCard key={prediction.id} prediction={{ id: prediction.id, statutPredit: prediction.statutPredit ?? "N/A", niveauRisque: prediction.niveauRisque ?? "INFO", confiance: prediction.confiance ?? 0, dateCreation: prediction.dateCreation ?? "" }} />) : <div className="centered-empty">No predictions available.</div>}
        </div>
      </Card>
    </DashboardLayout>
  );
}
