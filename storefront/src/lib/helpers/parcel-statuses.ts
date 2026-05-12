export const steps = ["Sipariş Alındı", "Hazırlanıyor", "Kargoya Verildi", "Teslim Edildi"]

export const parcelStatuses = (
  order: "not_fulfilled" | "fulfilled" | "delivered" | "shipped"
) => {
  switch (order) {
    case "not_fulfilled":
      return 0
    case "fulfilled":
      return 1
    case "delivered":
      return 3
    case "shipped":
      return 2
    default:
      return 0
  }
}
