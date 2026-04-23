"use client"

import { useAgeVerification } from "@/providers/AgeVerificationProvider"
import { useEffect, useState } from "react"

interface AgeVerificationGateProps {
  /** Server-side cookie kontrolü: true ise overlay hiç render edilmez */
  serverVerified: boolean
}

export function AgeVerificationGate({ serverVerified }: AgeVerificationGateProps) {
  const { isVerified, verify } = useAgeVerification()
  const [mounted, setMounted] = useState(false)

  // Hydration uyumsuzluğunu önlemek için mount sonrası göster
  useEffect(() => {
    setMounted(true)
  }, [])

  // SSR'de verified → hiç render etme (sıfır JS yükü, LCP/CLS etkisi yok)
  if (serverVerified) return null

  // Henüz mount olmadı → overlay'i render etme (CLS önlemi)
  if (!mounted) return null

  // Client-side cookie ile verified
  if (isVerified) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Yaş Doğrulama"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "40px 32px",
          borderRadius: "16px",
          textAlign: "center",
          border: "2px solid #E30A17",
          boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
          maxWidth: "360px",
          width: "90%",
        }}
      >
        <h2
          style={{
            color: "#E30A17",
            marginTop: 0,
            marginBottom: "12px",
            fontSize: "22px",
            fontWeight: 700,
          }}
        >
          +18 İçerik
        </h2>
        <p
          style={{
            color: "#444",
            fontSize: "15px",
            lineHeight: 1.6,
            marginBottom: "24px",
          }}
        >
          Bu içeriği görüntülemek için 18 yaşında veya daha büyük olduğunuzu
          onaylamanız gerekmektedir.
        </p>
        <button
          onClick={verify}
          style={{
            background: "#E30A17",
            color: "#fff",
            border: "none",
            padding: "14px 0",
            fontWeight: 700,
            cursor: "pointer",
            borderRadius: "8px",
            width: "100%",
            fontSize: "16px",
            boxShadow: "0 4px 15px rgba(227,10,23,0.3)",
            transition: "opacity 0.2s ease",
          }}
          onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.opacity = "0.9")}
          onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.opacity = "1")}
        >
          18 Yaşında veya Büyüğüm, Onaylıyorum
        </button>
      </div>
    </div>
  )
}
