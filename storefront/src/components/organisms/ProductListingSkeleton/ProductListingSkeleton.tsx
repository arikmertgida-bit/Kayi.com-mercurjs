export const ProductListingSkeleton = () => {
  return (
    <div className='py-4'>
      <div className='lg:flex justify-between lg:h-10 items-center'>
        <div className='h-6 bg-secondary w-20 rounded-sm animate-pulse' />
        <div className='h-10 w-[200px] bg-secondary rounded-sm animate-pulse hidden lg:block' />
        <div className='flex lg:hidden gap-2 mt-4 mb-2'>
          <div className='w-1/2 h-[38px] bg-secondary rounded-sm animate-pulse' />
          <div className='w-1/2 h-[38px] bg-secondary rounded-sm animate-pulse' />
        </div>
      </div>
      <div className='md:flex gap-4 mt-6'>
        {/* Sidebar skeleton - matches actual w-[280px] sidebar */}
        <div className='w-[280px] flex-shrink-0 hidden md:block'>
          <div className='rounded-sm bg-secondary h-80 border border-white animate-pulse' />
        </div>
        {/* Product grid skeleton - matches actual grid layout and card aspect ratio */}
        <div className='w-full'>
          <div className='grid grid-cols-1 min-[425px]:grid-cols-2 lg:grid-cols-3 min-[1440px]:grid-cols-4 gap-4'>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className='rounded-sm border overflow-hidden animate-pulse'>
                <div className='aspect-square bg-secondary w-full' />
                <div className='p-4 space-y-2'>
                  <div className='h-5 bg-secondary rounded-sm w-3/4' />
                  <div className='h-4 bg-secondary rounded-sm w-1/2' />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
