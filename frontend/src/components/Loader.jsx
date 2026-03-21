export default function Loader({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-indigo-100 bg-white px-6 py-12 shadow-sm">
      {/* Animated Spinner */}
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600 border-r-indigo-400"></div>
        <div className="absolute inset-1 animate-spin rounded-full border-2 border-transparent border-b-violet-600" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
      </div>
      
      {/* Loading Text */}
      <p className="text-center text-slate-600 font-medium">{text}</p>
      
      {/* Animated Dots */}
      <div className="flex gap-1">
        <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" style={{ animationDelay: '0s' }}></span>
        <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" style={{ animationDelay: '0.2s' }}></span>
        <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: '0.4s' }}></span>
      </div>
    </div>
  );
}
