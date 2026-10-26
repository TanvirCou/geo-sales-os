export default function DashboardLoading() {
  return (
    <div className="page-content">
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Header skeleton */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div className="skeleton" style={{ height: "2rem", width: "200px", borderRadius: "8px" }} />
          <div className="skeleton" style={{ height: "1rem", width: "320px", borderRadius: "6px" }} />
        </div>
        {/* KPI grid skeleton */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1.25rem" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div className="skeleton" style={{ height: "2rem", width: "2rem", borderRadius: "50%" }} />
              <div className="skeleton" style={{ height: "2.5rem", width: "60px" }} />
              <div className="skeleton" style={{ height: "1rem", width: "80%" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
