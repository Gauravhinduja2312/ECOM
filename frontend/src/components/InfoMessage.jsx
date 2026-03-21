export default function InfoMessage({ message }) {
  if (!message) return null;

  return (
    <div className="alert-info">
      <span className="text-base">ℹ️</span>
      <span>{message}</span>
    </div>
  );
}
