"use client";

export interface MapFiltersState {
  q: string;
  category: string;
  district: string;
  area: string;
  orderColor: "ALL" | "GREEN" | "RED";
}

interface FilterProps {
  filters: MapFiltersState;
  onChange: (filters: MapFiltersState) => void;
  categories: string[];
  districts: string[];
  areas?: string[];
  stats: {
    total: number;
    located: number;
    unlocated: number;
    green: number;
    red: number;
  };
}

export default function BusinessMapFilters({
  filters,
  onChange,
  categories,
  districts,
  areas,
  stats,
}: FilterProps) {
  const handleReset = () => {
    onChange({
      q: "",
      category: "ALL",
      district: "ALL",
      area: "ALL",
      orderColor: "ALL",
    });
  };

  const selectCls =
    "w-full sm:w-auto flex-1 min-w-[135px] px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all cursor-pointer shadow-sm";

  return (
    <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm mb-4 space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
        {/* Name / Phone search */}
        <div className="w-full lg:flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search company business name or phone…"
            value={filters.q}
            onChange={(e) => onChange({ ...filters, q: e.target.value })}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>

        {/* Category */}
        <select
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
          className={selectCls}
        >
          <option value="ALL">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* District */}
        <select
          value={filters.district}
          onChange={(e) => onChange({ ...filters, district: e.target.value, area: "ALL" })}
          className={selectCls}
        >
          <option value="ALL">All Districts</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {/* Marker Color Filter */}
        <select
          value={filters.orderColor}
          onChange={(e) => onChange({ ...filters, orderColor: e.target.value as any })}
          className={selectCls}
        >
          <option value="ALL">All Markers (Clients &amp; Leads)</option>
          <option value="GREEN">🟢 Clients (In Database)</option>
          <option value="RED">🔴 Leads / Prospects (Not in DB)</option>
        </select>

        {/* Reset button */}
        <button
          onClick={handleReset}
          className="w-full sm:w-auto px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:text-sm font-medium transition-all shadow-sm"
        >
          Reset Filters
        </button>
      </div>

      {/* Filter Counts Bar */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs">
        <span className="text-slate-500 dark:text-slate-400">
          Total Mapped Pins: <strong className="text-slate-900 dark:text-slate-100 font-semibold">{stats.total}</strong>
        </span>

        <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          {stats.green} Clients (In Database)
        </span>

        <span className="text-rose-700 dark:text-rose-400 font-medium flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
          {stats.red} Leads (Live Prospects)
        </span>
      </div>
    </div>
  );
}
