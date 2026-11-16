export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fff6f6] via-[#ffe6e8] to-[#ffd8dc]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-red-200 border-t-red-600 rounded-full animate-spin" />
        <span className="text-xs font-bold text-[#6B4C4F] animate-pulse">
          লোড হচ্ছে...
        </span>
      </div>
    </div>
  );
}
