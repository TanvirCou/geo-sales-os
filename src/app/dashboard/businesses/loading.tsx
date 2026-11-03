export default function BusinessesLoading() {
  return (
    <div className="space-y-6 animate-fade-in w-full max-w-7xl mx-auto">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="space-y-1.5">
          <div className="skeleton h-7 w-48 rounded-xl" />
          <div className="skeleton h-4 w-72 rounded-lg" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="skeleton h-9 w-28 rounded-xl" />
          <div className="skeleton h-9 w-36 rounded-xl" />
        </div>
      </div>

      {/* Filter Bar Skeleton */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="skeleton h-10 w-full sm:w-80 rounded-xl" />
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <div className="skeleton h-9 w-28 rounded-xl" />
          <div className="skeleton h-9 w-28 rounded-xl" />
          <div className="skeleton h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="skeleton h-4 w-32 rounded-md" />
          <div className="skeleton h-4 w-20 rounded-md" />
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="skeleton h-4 w-44 rounded-sm" />
                  <div className="skeleton h-3 w-64 rounded-sm" />
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-4">
                <div className="skeleton h-6 w-24 rounded-full" />
                <div className="skeleton h-4 w-28 rounded-sm" />
              </div>
              <div className="skeleton h-8 w-16 rounded-lg shrink-0" />
            </div>
          ))}
        </div>

        {/* Pagination Skeleton */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="skeleton h-4 w-36 rounded-md" />
          <div className="flex items-center gap-2">
            <div className="skeleton h-8 w-8 rounded-lg" />
            <div className="skeleton h-8 w-8 rounded-lg" />
            <div className="skeleton h-8 w-8 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
