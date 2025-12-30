export function UserPostingStatsCardSkeleton() {
  return (
    <div className='reading-shadow w-full rounded-lg border border-border/50 bg-card'>
      <div className='flex items-start gap-4 p-4'>
        <div className='flex flex-1 items-start gap-4'>
          {/* Avatar skeleton */}
          <div className='size-12 animate-pulse rounded-full bg-muted' />
          <div className='flex flex-col gap-2'>
            {/* Name skeleton */}
            <div className='h-5 w-24 animate-pulse rounded bg-muted' />
            {/* Badge skeleton */}
            <div className='h-4 w-32 animate-pulse rounded bg-muted' />
          </div>
        </div>
        <div className='flex flex-col items-end gap-2'>
          {/* Contribution graph skeleton - matches the 20 squares in grid */}
          <div className='grid w-24 grid-flow-col grid-rows-4 gap-1'>
            {[...Array(20)].map((_, i) => (
              <div key={i} className='aspect-square w-full animate-pulse rounded-sm bg-muted' />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
