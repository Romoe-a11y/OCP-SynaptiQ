import DashboardLayout from "../../components/layout/DashboardLayout";
import Loader from "../../components/common/Loader";
import ApiError from "../../components/common/ApiError";
import PredictionCard from "../../components/cards/PredictionCard";
import { useApi } from "../../hooks/useApi";
import { getPredictions } from "../../services/dashboardService";

export default function UserPredictionsPage() {
  const { data: items, loading, error, reload } = useApi(getPredictions, [], 3_000);

  if (loading) {
    return (
      <DashboardLayout title="Predictions" subtitle="Loading..." roleLabel="Operator">
        <Loader />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Predictions" subtitle="Unable to load" roleLabel="Operator">
        <ApiError message={error} onRetry={reload} />
      </DashboardLayout>
    );
  }

  const predictions = items ?? [];

  return (
    <DashboardLayout title="Predictions" subtitle="Prediction visibility and risk level in the operational user space." roleLabel="Operator">
      <div className="v2-card v2-card-pad">
        <div className="v2-card-head" style={{ alignItems: "center" }}>
          <h3>Prediction summary</h3>
          <span className="v2-badge neutral">{predictions.length} records</span>
        </div>
        <div className="v2-rows">
          {predictions.length ? (
            predictions.map((prediction) => (
              <PredictionCard
                key={prediction.id}
                prediction={{
                  id: prediction.id,
                  statutPredit: prediction.statutPredit ?? "N/A",
                  niveauRisque: prediction.niveauRisque ?? "INFO",
                  confiance: prediction.confiance ?? 0,
                  dateCreation: prediction.dateCreation ?? "",
                }}
              />
            ))
          ) : (
            <div className="v2-empty">No predictions available.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
