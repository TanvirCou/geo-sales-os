export default function ImportsLoading() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in w-full max-w-5xl pb-6">
      {/* Header Skeleton */}
      <div className="space-y-1.5 pb-3 border-b border-slate-200/90 dark:border-slate-800">
        <div className="skeleton h-6 sm:h-8 w-48 sm:w-64 rounded-xl" />
        <div className="skeleton h-3.5 w-64 sm:w-96 rounded-md" />
      </div>

      {/* Upload Dropzone Card Skeleton */}
      <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 p-6 sm:p-10 flex flex-col items-center justify-center text-center space-y-4">
        <div className="skeleton w-14 h-14 rounded-2xl" />
        <div className="space-y-1.5 flex flex-col items-center">
          <div className="skeleton h-4 w-44 rounded-md" />
          <div className="skeleton h-3 w-60 rounded-sm" />
        </div>
        <div className="skeleton h-9 w-36 rounded-xl" />
      </div>

      {/* History Table Skeleton */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="skeleton h-5 w-40 rounded-md" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="skeleton h-3.5 w-36 rounded-sm" />
                <div className="skeleton h-3 w-48 rounded-sm" />
              </div>
              <div className="skeleton h-6 w-20 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
