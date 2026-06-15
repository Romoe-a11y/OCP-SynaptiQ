interface LoaderProps {
  message?: string;
}

export default function Loader({ message = "Loading data..." }: LoaderProps) {
  return (
    <div className="spinner-wrapper">
      <div className="spinner" />
      <span>{message}</span>
    </div>
  );
}
