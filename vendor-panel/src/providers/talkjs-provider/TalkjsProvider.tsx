// TalkjsProvider.tsx — TalkJS removed
// MessengerProvider in providers/messenger-provider/ replaces this.
import React, { createContext, useContext } from "react"

const TalkjsUnreadsContext = createContext<undefined>(undefined)

/** @deprecated Use useMessengerUnreads from messenger-provider instead */
export const useTalkjsUnreads = () => useContext(TalkjsUnreadsContext)

export const TalkjsProvider = ({ children }: { children: React.ReactNode }) => {
  return <TalkjsUnreadsContext.Provider value={undefined}>{children}</TalkjsUnreadsContext.Provider>
}
