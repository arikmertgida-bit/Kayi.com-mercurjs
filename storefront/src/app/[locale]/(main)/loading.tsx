/**
 * Streaming skeleton for the (main) route group.
 * Next.js streams this immediately while the layout's async server fetches
 * (retrieveCustomer, checkRegion, listCategories, etc.) are still in flight.
 * The page shell becomes interactive before content loads, so header
 * buttons/links respond to the very first click.
 */
export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="flex py-2 lg:px-8 px-4 items-center gap-4">
          {/* Logo placeholder */}
          <div className="w-[126px] h-10 bg-gray-200 rounded" />
          {/* Search bar placeholder */}
          <div className="flex-1 h-10 bg-gray-200 rounded-full" />
          {/* Action icons placeholder */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
          </div>
        </div>
        {/* Navbar skeleton */}
        <div className="flex gap-6 lg:px-8 px-4 py-2 border-t">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-20 h-4 bg-gray-200 rounded" />
          ))}
        </div>
      </div>

      {/* Page content skeleton */}
      <div className="container mx-auto lg:px-8 px-4 py-8 space-y-6">
        <div className="w-1/3 h-8 bg-gray-200 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-square bg-gray-200 rounded-sm" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
