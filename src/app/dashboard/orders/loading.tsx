export default function OrdersLoading() {
  return (
    <div className="space-y-6 animate-fade-in w-full pb-8">
      {/* 1. Header Skeleton (Matches OrdersPage header) */}
      <div className="pb-4 border-b border-slate-200/90 dark:border-slate-800">
        <div className="skeleton h-7 sm:h-8 w-56 sm:w-72 rounded-xl mb-1.5" />
        <div className="skeleton h-3.5 sm:h-4 w-72 sm:w-96 rounded-md" />
      </div>

      {/* 2. KPI Stats Strip (4 Cards matching OrderListClient) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2"
          >
            <div className="skeleton h-3.5 w-20 sm:w-24 rounded-md" />
            <div className="skeleton h-6 sm:h-7 w-24 sm:w-32 rounded-lg" />
          </div>
        ))}
      </div>

      {/* 3. Filter & Action Command Bar Skeleton */}
      <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="skeleton h-10 w-full lg:flex-1 rounded-lg" />
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            <div className="skeleton h-10 w-full sm:w-40 rounded-lg" />
            <div className="skeleton h-10 w-full sm:w-36 rounded-lg" />
            <div className="skeleton h-10 w-full sm:w-32 rounded-lg" />
          </div>
        </div>
      </div>

      {/* 4. Orders Data Table Skeleton (Full Width) */}
      <div className="rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Header Row */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="skeleton h-4 w-32 rounded-md" />
          <div className="skeleton h-4 w-20 rounded-md" />
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="skeleton h-4 w-36 sm:w-48 rounded-sm" />
                  <div className="skeleton h-3 w-44 sm:w-60 rounded-sm" />
                </div>
              </div>
              <div className="flex items-center gap-4 sm:gap-8 shrink-0">
                <div className="skeleton h-4 w-20 sm:w-24 rounded-sm" />
                <div className="skeleton h-6 w-20 sm:w-24 rounded-full" />
                <div className="skeleton h-9 w-16 sm:w-20 rounded-lg" />
              </div>
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
