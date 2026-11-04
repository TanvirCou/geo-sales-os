export default function SettingsLoading() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in w-full max-w-5xl pb-6">
      {/* Header Skeleton */}
      <div className="space-y-1.5 pb-3 border-b border-slate-200/90 dark:border-slate-800">
        <div className="skeleton h-6 sm:h-8 w-48 sm:w-64 rounded-xl" />
        <div className="skeleton h-3.5 w-64 sm:w-96 rounded-md" />
      </div>

      {/* Tabs Row Skeleton (Mobile Scrollable) */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0 -mx-1 px-1">
        <div className="skeleton h-10 w-28 sm:w-32 rounded-xl shrink-0" />
        <div className="skeleton h-10 w-32 sm:w-36 rounded-xl shrink-0" />
        <div className="skeleton h-10 w-36 sm:w-40 rounded-xl shrink-0" />
        <div className="skeleton h-10 w-32 sm:w-36 rounded-xl shrink-0" />
      </div>

      {/* Settings Form Card Skeleton */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-5">
        <div className="space-y-1.5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="skeleton h-5 w-40 rounded-md" />
          <div className="skeleton h-3 w-60 rounded-sm" />
        </div>

        <div className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <div className="skeleton h-3.5 w-24 rounded-sm" />
            <div className="skeleton h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="skeleton h-3.5 w-28 rounded-sm" />
            <div className="skeleton h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="skeleton h-3.5 w-20 rounded-sm" />
            <div className="skeleton h-10 w-full rounded-xl" />
          </div>

          <div className="pt-2">
            <div className="skeleton h-10 w-32 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
