import { RefreshCw, WifiOff } from "lucide-react";

interface ApiErrorProps {
  message?: string;
  onRetry?: () => void;
}

export default function ApiError({
  message = "Failed to load data. Please try again.",
  onRetry,
}: ApiErrorProps) {
  return (
    <div className="api-error">
      <div className="api-error-icon">
        <WifiOff size={32} strokeWidth={1.8} />
      </div>
      <p className="api-error-message">{message}</p>
      {onRetry && (
        <button type="button" className="api-error-retry" onClick={onRetry}>
          <RefreshCw size={14} />
          Retry
        </button>
      )}
    </div>
  );
}
