export default function ProductsLoading() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in w-full max-w-7xl mx-auto pb-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/90 dark:border-slate-800">
        <div className="space-y-1.5 min-w-0">
          <div className="skeleton h-6 sm:h-8 w-44 sm:w-60 rounded-xl" />
          <div className="skeleton h-3.5 w-60 sm:w-96 rounded-md" />
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="skeleton h-9 w-28 sm:w-36 rounded-xl" />
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="skeleton h-10 w-full sm:w-72 rounded-xl shrink-0" />
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0 -mx-1 px-1">
          <div className="skeleton h-9 w-24 sm:w-28 rounded-xl shrink-0" />
          <div className="skeleton h-9 w-24 sm:w-28 rounded-xl shrink-0" />
        </div>
      </div>

      {/* Product Cards Grid (2-cols on mobile, 3-4 cols on tablet/desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 sm:p-5 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="skeleton h-5 w-20 rounded-md" />
              <div className="skeleton w-8 h-8 rounded-lg shrink-0" />
            </div>
            <div className="space-y-1.5">
              <div className="skeleton h-5 w-36 rounded-md" />
              <div className="skeleton h-3.5 w-24 rounded-sm" />
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="skeleton h-5 w-20 rounded-md" />
              <div className="skeleton h-4 w-12 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
