import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "var(--surface-0)", padding: "2rem", textAlign: "center"
    }}>
      <div style={{ fontSize: "6rem", lineHeight: 1, marginBottom: "1rem" }}>404</div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Page Not Found</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link href="/dashboard" className="btn btn-primary">
        Go to Dashboard
      </Link>
    </div>
  );
}
