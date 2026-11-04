export default function OrdersLoading() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in w-full max-w-7xl mx-auto pb-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/90 dark:border-slate-800">
        <div className="space-y-1.5 min-w-0">
          <div className="skeleton h-6 sm:h-8 w-40 sm:w-52 rounded-xl" />
          <div className="skeleton h-3.5 w-60 sm:w-80 rounded-md" />
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="skeleton h-9 w-28 sm:w-32 rounded-xl" />
          <div className="skeleton h-9 w-28 sm:w-36 rounded-xl" />
        </div>
      </div>

      {/* KPI Stats Strip (2-cols on mobile) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-3 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2">
            <div className="skeleton h-3 w-16 sm:w-20 rounded-md" />
            <div className="skeleton h-5 sm:h-6 w-20 sm:w-28 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Filter Bar Skeleton */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="skeleton h-10 w-full sm:w-72 rounded-xl shrink-0" />
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0 -mx-1 px-1">
          <div className="skeleton h-9 w-24 sm:w-28 rounded-xl shrink-0" />
          <div className="skeleton h-9 w-24 sm:w-28 rounded-xl shrink-0" />
          <div className="skeleton h-9 w-24 sm:w-28 rounded-xl shrink-0" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-3 sm:p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="skeleton w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0" />
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="skeleton h-3.5 sm:h-4 w-28 sm:w-36 rounded-sm" />
                  <div className="skeleton h-3 w-36 sm:w-48 rounded-sm" />
                </div>
              </div>
              <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                <div className="skeleton h-3.5 sm:h-4 w-16 sm:w-20 rounded-sm" />
                <div className="skeleton h-5 sm:h-6 w-18 sm:w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Skeleton */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="skeleton h-4 w-28 sm:w-36 rounded-md" />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="skeleton h-8 w-8 rounded-lg" />
            <div className="skeleton h-8 w-8 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
