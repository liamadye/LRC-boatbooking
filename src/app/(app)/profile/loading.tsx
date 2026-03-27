export default function ProfileLoading() {
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="h-7 w-28 bg-gray-200 rounded animate-pulse" />
      <div className="rounded-lg border bg-white p-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-9 w-full bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
