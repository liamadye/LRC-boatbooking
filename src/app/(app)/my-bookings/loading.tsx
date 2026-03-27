export default function MyBookingsLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="h-7 w-36 bg-gray-200 rounded animate-pulse" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border bg-white p-4 space-y-2">
          <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
