"use client"
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="tr">
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#f9fafb" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Bir hata oluştu
          </h1>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
            Beklenmedik bir sorunla karşılaşıldı. Lütfen tekrar deneyin.
          </p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={() => reset()}
              style={{
                padding: "0.5rem 1.25rem",
                background: "#111827",
                color: "#fff",
                border: "none",
                borderRadius: "0.375rem",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Tekrar Dene
            </button>
            <a
              href="/"
              style={{
                padding: "0.5rem 1.25rem",
                background: "#fff",
                color: "#111827",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Ana Sayfaya Dön
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
