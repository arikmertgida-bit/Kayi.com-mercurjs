"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

const COOKIE_NAME = "kayi_age_verified"
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 gün (saniye)

interface AgeVerificationContextValue {
  isVerified: boolean
  verify: () => void
}

const AgeVerificationContext = createContext<AgeVerificationContextValue>({
  isVerified: false,
  verify: () => {},
})

export function AgeVerificationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [isVerified, setIsVerified] = useState(false)

  // Mount'ta cookie kontrol et — sadece client-side
  useEffect(() => {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${COOKIE_NAME}=`))
    if (match?.split("=")[1] === "1") {
      setIsVerified(true)
    }
  }, [])

  const verify = useCallback(() => {
    const secure = window.location.protocol === "https:" ? "; Secure" : ""
    document.cookie = `${COOKIE_NAME}=1; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`
    setIsVerified(true)
  }, [])

  return (
    <AgeVerificationContext.Provider value={{ isVerified, verify }}>
      {children}
    </AgeVerificationContext.Provider>
  )
}

export function useAgeVerification(): AgeVerificationContextValue {
  return useContext(AgeVerificationContext)
}
