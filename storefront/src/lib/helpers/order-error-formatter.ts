export const orderErrorFormatter = (error: unknown) => {
  if (!(error instanceof Error)) return null

  if (error.message === "NEXT_REDIRECT") {
    return null
  }

  if (error.message.includes("Not enough stock available")) {
    return "Not enough stock available"
  }

  return error.message
}
