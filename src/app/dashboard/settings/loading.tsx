export default function SettingsLoading() {
  return (
    <div className="space-y-8 animate-fade-in w-full pb-8">
      {/* 1. Responsive Navigation Tabs Bar Skeleton */}
      <div className="p-1 sm:p-1.5 bg-slate-100/90 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none">
          <div className="skeleton h-9 sm:h-10 flex-1 min-w-[130px] rounded-xl" />
          <div className="skeleton h-9 sm:h-10 flex-1 min-w-[130px] rounded-xl" />
          <div className="skeleton h-9 sm:h-10 flex-1 min-w-[140px] rounded-xl" />
          <div className="skeleton h-9 sm:h-10 flex-1 min-w-[140px] rounded-xl" />
        </div>
      </div>

      {/* 2. Settings Content Cards Skeleton (Full Width) */}
      <div className="space-y-6 sm:space-y-8">
        {/* Card 1: Profile & Account Information */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="skeleton w-11 h-11 rounded-xl shrink-0" />
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="skeleton h-5 w-36 rounded-md" />
                  <div className="skeleton h-4 w-16 rounded-full" />
                </div>
                <div className="skeleton h-3 w-28 rounded-sm" />
              </div>
            </div>
            <div className="skeleton h-9 w-28 rounded-xl shrink-0" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="skeleton h-3.5 w-24 rounded-sm" />
              <div className="skeleton h-10 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <div className="skeleton h-3.5 w-28 rounded-sm" />
              <div className="skeleton h-10 w-full rounded-xl" />
            </div>
          </div>
        </div>

        {/* Card 2: Security & PIN Management */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-6">
          <div className="space-y-1 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="skeleton h-5 w-44 rounded-md" />
            <div className="skeleton h-3 w-64 rounded-sm" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div className="space-y-2">
              <div className="skeleton h-3.5 w-24 rounded-sm" />
              <div className="skeleton h-10 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <div className="skeleton h-3.5 w-28 rounded-sm" />
              <div className="skeleton h-10 w-full rounded-xl" />
            </div>
          </div>
          <div className="pt-2">
            <div className="skeleton h-10 w-36 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
