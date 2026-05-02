/**
 * Streaming skeleton for the (main) route group.
 * Shown while (main)/layout.tsx awaits its async data (retrieveCustomer, checkRegion, etc.).
 *
 * IMPORTANT: The structure and heights below must exactly match the actual
 * Header.tsx output to prevent CLS when the skeleton is swapped for real content:
 *
 * Actual layout above-the-fold heights:
 *   - <header> sticky:  flex py-2 + right-icons py-2 + h-10 = 72 px
 *   - Mobile search row (lg:hidden): px-4 py-2 + h-10 Input = ~58 px
 *   - Desktop Navbar (hidden lg:flex): py-3 + content-h = ~48 px
 */
export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* ── Sticky header skeleton — mirrors <header className="sticky top-0 z-50 ..."> ── */}
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="flex py-2 lg:px-8 px-4">
          {/* Logo — same width/height as <Image width={126} height={40}> */}
          <div className="flex items-center shrink-0">
            <div className="w-[126px] h-10 bg-gray-200 rounded" />
          </div>
          {/* Desktop search — hidden on mobile, exactly like NavbarSearch wrapper */}
          <div className="hidden lg:flex flex-1 items-center justify-center px-4">
            <div className="h-10 w-full bg-gray-200 rounded-full" />
          </div>
          {/* Right icons — same py-2 and h-10 as the actual right-icons div */}
          <div className="flex items-center justify-end gap-2 lg:gap-4 shrink-0 py-2 ml-auto lg:ml-0">
            {/* CountrySelector: w-16 h-10 */}
            <div className="w-16 h-10 bg-gray-200 rounded-lg" />
            {/* Cart icon */}
            <div className="w-5 h-5 bg-gray-200 rounded-full" />
            {/* User icon */}
            <div className="w-5 h-5 bg-gray-200 rounded-full" />
            {/* Hamburger — lg:hidden */}
            <div className="lg:hidden w-5 h-5 bg-gray-200 rounded" />
          </div>
        </div>
      </div>

      {/* ── Mobile search row — mirrors <div className="lg:hidden bg-white shadow-sm border-t px-4 py-2"> ── */}
      <div className="lg:hidden bg-white shadow-sm border-t px-4 py-2">
        <div className="w-4/5 mx-auto h-10 bg-gray-200 rounded-full" />
      </div>

      {/* ── Desktop Navbar — mirrors <Navbar> with hidden lg:flex border py-3 … ── */}
      <div className="hidden lg:flex border py-3 justify-between px-6 items-center">
        <div className="flex items-center gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-20 h-5 bg-gray-200 rounded" />
          ))}
        </div>
        <div className="w-24 h-9 bg-gray-200 rounded" />
      </div>

      {/* ── Page content skeleton ── */}
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
