export default function BusinessesLoading() {
  return (
    <div className="space-y-6 animate-fade-in w-full pb-8">
      {/* 1. Header Skeleton (Matches BusinessesPage header) */}
      <div className="pb-4 border-b border-slate-200/90 dark:border-slate-800">
        <div className="skeleton h-7 sm:h-8 w-52 sm:w-64 rounded-xl mb-1.5" />
        <div className="skeleton h-3.5 sm:h-4 w-72 sm:w-96 rounded-md" />
      </div>

      {/* 2. Filter & Actions Command Bar Skeleton */}
      <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search input skeleton */}
          <div className="skeleton h-10 w-full lg:flex-1 rounded-lg" />
          {/* Filters row */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            <div className="skeleton h-10 w-full sm:w-36 rounded-lg" />
            <div className="skeleton h-10 w-full sm:w-36 rounded-lg" />
            <div className="skeleton h-10 w-full sm:w-36 rounded-lg" />
            <div className="skeleton h-10 w-full sm:w-32 rounded-lg" />
          </div>
        </div>
      </div>

      {/* 3. Businesses Data Table Skeleton (Full Width) */}
      <div className="rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Header Row */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="skeleton h-4 w-32 rounded-md" />
          <div className="skeleton h-4 w-20 rounded-md" />
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="skeleton h-4 w-44 sm:w-60 rounded-sm" />
                  <div className="skeleton h-3 w-56 sm:w-72 rounded-sm" />
                </div>
              </div>
              <div className="hidden md:flex items-center gap-4 shrink-0">
                <div className="skeleton h-6 w-20 rounded-full" />
                <div className="skeleton h-6 w-24 rounded-full" />
                <div className="skeleton h-4 w-28 rounded-sm" />
              </div>
              <div className="skeleton h-9 w-16 sm:w-20 rounded-lg shrink-0" />
            </div>
          ))}
        </div>

        {/* Pagination Skeleton */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/20">
          <div className="skeleton h-4 w-32 sm:w-44 rounded-md" />
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
