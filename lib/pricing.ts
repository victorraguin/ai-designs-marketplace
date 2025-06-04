export interface PriceModifier {
  type: 'margin' | 'discount'
  value: number
  code?: string // Pour les codes de réduction
  startDate?: Date // Pour les promotions temporaires
  endDate?: Date
}

export interface ProductPrice {
  basePrice: number
  currency: string
  margin?: number
  discount?: number
  discountCode?: string
}

export function calculateFinalPrice (price: ProductPrice): number {
  let finalPrice = price.basePrice

  // Appliquer la marge
  if (price.margin) {
    finalPrice *= 1 + price.margin
  }

  // Appliquer la réduction
  if (price.discount) {
    finalPrice *= 1 - price.discount
  }

  // Arrondir à 2 décimales
  return Math.round(finalPrice * 100) / 100
}

export function validateDiscountCode (
  code: string,
  validCodes: Map<string, number>
): number | null {
  return validCodes.get(code) || null
}

export function isPromotionValid (startDate?: Date, endDate?: Date): boolean {
  if (!startDate && !endDate) return true

  const now = new Date()
  if (startDate && now < startDate) return false
  if (endDate && now > endDate) return false

  return true
}
