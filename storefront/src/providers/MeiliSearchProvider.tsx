"use client"

import { createContext, useContext, useMemo } from "react"
import { createMeiliSearchClient } from "@/lib/client"

type MeiliSearchContextValue = {
  host: string
  key: string
  searchClient: ReturnType<typeof createMeiliSearchClient>
}

const defaultContextValue: MeiliSearchContextValue = {
  host: "",
  key: "",
  searchClient: null,
}

const MeiliSearchContext = createContext<MeiliSearchContextValue>(defaultContextValue)

export function MeiliSearchProvider({
  host,
  apiKey,
  children,
}: {
  host: string
  apiKey: string
  children: React.ReactNode
}) {
  const searchClient = useMemo(() => createMeiliSearchClient(host, apiKey), [host, apiKey])

  return (
    <MeiliSearchContext.Provider value={{ host, key: apiKey, searchClient }}>
      {children}
    </MeiliSearchContext.Provider>
  )
}

export function useMeiliSearchClient(): MeiliSearchContextValue {
  return useContext(MeiliSearchContext)
}
