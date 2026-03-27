export default function AdminLoading() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-32 bg-gray-200 rounded animate-pulse" />
      {/* Tabs skeleton */}
      <div className="flex gap-2">
        {["Users", "Boats", "Squads", "Invitations"].map((tab) => (
          <div
            key={tab}
            className="h-9 w-24 bg-gray-100 rounded animate-pulse"
          />
        ))}
      </div>
      {/* Table skeleton */}
      <div className="rounded-lg border bg-white">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 border-b last:border-b-0"
          >
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
