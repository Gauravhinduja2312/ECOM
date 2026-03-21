export default function SuccessMessage({ message }) {
  if (!message) return null;

  return (
    <div className="alert-success">
      <span className="text-base">✓</span>
      <span>{message}</span>
    </div>
  );
}
