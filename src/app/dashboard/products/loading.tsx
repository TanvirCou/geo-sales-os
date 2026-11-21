export default function ProductsLoading() {
  return (
    <div className="space-y-6 animate-fade-in w-full pb-8">
      {/* 1. Header Skeleton (Matches ProductsPage header) */}
      <div className="pb-4 border-b border-slate-200/90 dark:border-slate-800">
        <div className="skeleton h-7 sm:h-8 w-56 sm:w-72 rounded-xl mb-1.5" />
        <div className="skeleton h-3.5 sm:h-4 w-72 sm:w-96 rounded-md" />
      </div>

      {/* 2. Filter & Actions Command Bar Skeleton */}
      <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="skeleton h-10 w-full sm:flex-1 rounded-lg" />
          <div className="flex items-center gap-2.5">
            <div className="skeleton h-10 w-32 sm:w-36 rounded-lg" />
            <div className="skeleton h-10 w-32 sm:w-36 rounded-lg" />
          </div>
        </div>
      </div>

      {/* 3. Product Cards Grid (4 columns on laptop/desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="skeleton h-5 w-20 rounded-md" />
              <div className="skeleton w-8 h-8 rounded-lg shrink-0" />
            </div>
            <div className="space-y-2">
              <div className="skeleton h-5 w-40 rounded-md" />
              <div className="skeleton h-3.5 w-24 rounded-sm" />
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <div className="skeleton h-5 w-24 rounded-md" />
              <div className="skeleton h-4 w-12 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
