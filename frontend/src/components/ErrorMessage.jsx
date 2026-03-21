export default function ErrorMessage({ message }) {
  if (!message) return null;

  return (
    <div className="alert-error">
      <span className="text-base">⚠️</span>
      <span>{message}</span>
    </div>
  );
}
