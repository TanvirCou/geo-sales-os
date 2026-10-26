"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0a0f1e", color: "#f8fafc", fontFamily: "Inter, sans-serif" }}>
        <div style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "2rem", textAlign: "center"
        }}>
          <div style={{ fontSize: "4rem", lineHeight: 1, marginBottom: "1rem" }}>⚠️</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Something went wrong</h1>
          <p style={{ color: "#94a3b8", marginBottom: "0.5rem", maxWidth: 400 }}>
            {error.message || "An unexpected error occurred."}
          </p>
          {error.digest && (
            <p style={{ color: "#64748b", fontSize: "0.75rem", marginBottom: "1.5rem" }}>
              Error ID: {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={reset} style={{
              padding: "0.625rem 1.25rem", background: "#2563eb", color: "#fff",
              border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 500
            }}>
              Try Again
            </button>
            <Link href="/dashboard" style={{
              padding: "0.625rem 1.25rem", background: "transparent", color: "#94a3b8",
              border: "1px solid rgba(148,163,184,0.2)", borderRadius: "8px", textDecoration: "none", fontWeight: 500
            }}>
              Go to Dashboard
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
