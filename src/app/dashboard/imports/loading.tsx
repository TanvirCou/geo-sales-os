export default function ImportsLoading() {
  return (
    <div className="space-y-6 animate-fade-in w-full pb-8">
      {/* 1. Top Header Actions Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/90 dark:border-slate-800">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="skeleton w-8 h-8 rounded-lg shrink-0" />
            <div className="skeleton h-7 sm:h-8 w-56 sm:w-72 rounded-xl" />
          </div>
          <div className="skeleton h-3.5 w-64 sm:w-96 rounded-md" />
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="skeleton h-9 sm:h-10 w-44 rounded-xl" />
          <div className="skeleton h-9 sm:h-10 w-44 rounded-xl" />
        </div>
      </div>

      {/* 2. Geocoding Engine Selector Grid (3 Cards) Skeleton */}
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="skeleton h-4 w-48 rounded-md" />
          <div className="skeleton h-3 w-72 rounded-sm" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="skeleton h-4 w-36 rounded-md" />
                <div className="skeleton w-4 h-4 rounded-full shrink-0" />
              </div>
              <div className="space-y-1.5">
                <div className="skeleton h-3 w-full rounded-sm" />
                <div className="skeleton h-3 w-4/5 rounded-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Upload Dropzone Card Skeleton (Full Width) */}
      <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 p-10 sm:p-14 flex flex-col items-center justify-center text-center space-y-4 shadow-xs">
        <div className="skeleton w-16 h-16 rounded-2xl" />
        <div className="space-y-2 flex flex-col items-center">
          <div className="skeleton h-5 sm:h-6 w-64 sm:w-80 rounded-xl" />
          <div className="skeleton h-3.5 w-72 sm:w-96 rounded-md" />
        </div>
        <div className="skeleton h-10 w-36 rounded-xl mt-2" />
      </div>

      {/* 4. Import History / Batches Table Skeleton */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="skeleton h-5 w-44 rounded-md" />
          <div className="skeleton h-7 w-24 rounded-lg" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-2 min-w-0 flex-1">
                <div className="skeleton h-4 w-48 rounded-md" />
                <div className="skeleton h-3 w-64 rounded-sm" />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="skeleton h-6 w-20 rounded-full" />
                <div className="skeleton h-6 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
