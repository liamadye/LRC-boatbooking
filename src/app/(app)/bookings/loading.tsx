export default function BookingsLoading() {
  return (
    <div className="space-y-4">
      {/* Header + week nav skeleton */}
      <div className="sticky top-0 z-40 bg-background pb-3 space-y-3">
        <div className="h-7 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="flex gap-1">
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              className="h-10 flex-1 bg-gray-100 rounded animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-2">
        {["Shells", "Tinnies", "Oars", "Gym"].map((tab) => (
          <div
            key={tab}
            className="h-9 w-20 bg-gray-100 rounded animate-pulse"
          />
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="h-10 w-full bg-gray-50 border rounded animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
