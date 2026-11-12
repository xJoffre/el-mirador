import type { DailyDish, Menu, OptionGroup, Product } from '@/shared/api/client'

export type CartLine =
  | { kind: 'product'; productId: number; variantId: number; optionIds: number[]; quantity: number }
  | { kind: 'lunch_full'; soupId: number; mainId: number; quantity: number }
  | { kind: 'lunch_soup'; soupId: number; quantity: number }
  | { kind: 'lunch_main'; mainId: number; quantity: number }

export type Cart = CartLine[]

export type ResolvedLine = {
  line: CartLine
  key: string
  product?: Product
  soup?: DailyDish
  main?: DailyDish
  unitPrice: number
  currency: string
  available: boolean
}

export const lineKey = (line: CartLine) =>
  line.kind === 'product'
    ? `product:${line.variantId}:${[...line.optionIds].sort((a, b) => a - b).join(',')}`
    : `${line.kind}:${'soupId' in line ? line.soupId : ''}:${'mainId' in line ? line.mainId : ''}`

export function addLine(cart: Cart, line: CartLine): Cart {
  const key = lineKey(line)
  return cart.some((current) => lineKey(current) === key)
    ? cart.map((current) => (lineKey(current) === key ? { ...current, quantity: current.quantity + line.quantity } : current))
    : [...cart, line]
}

export function setQuantity(cart: Cart, key: string, quantity: number): Cart {
  return quantity <= 0
    ? cart.filter((line) => lineKey(line) !== key)
    : cart.map((line) => (lineKey(line) === key ? { ...line, quantity } : line))
}

export function choiceProblems(groups: OptionGroup[], chosen: number[]) {
  return groups.filter((group) => {
    const count = group.items.filter((item) => chosen.includes(item.id)).length
    return count < group.min_choices || count > group.max_choices
  })
}

export function resolve(line: CartLine, menu: Menu, lunchNow: boolean): ResolvedLine {
  const key = lineKey(line)
  if (line.kind === 'product') {
    const product = menu.categories.flatMap((category) => category.products).find((candidate) => candidate.id === line.productId)
    const variant = product?.variants.find((candidate) => candidate.id === line.variantId)
    const items = product?.option_groups.flatMap((group) => group.items) ?? []
    const optionsOk = line.optionIds.every((id) => items.some((item) => item.id === id && !item.sold_out))
    const available =
      !!product && !!variant && !product.sold_out && !product.dine_in_only && optionsOk && choiceProblems(product.option_groups, line.optionIds).length === 0
    return { line, key, product, unitPrice: variant?.price ?? 0, currency: variant?.currency ?? '', available }
  }
  const dish = (id?: number) => menu.lunch.find((candidate) => candidate.id === id)
  const soup = 'soupId' in line ? dish(line.soupId) : undefined
  const main = 'mainId' in line ? dish(line.mainId) : undefined
  const needed = [soup, main].filter((_, index) => (index === 0 ? 'soupId' in line : 'mainId' in line))
  const available = lunchNow && needed.every((part) => part && !part.sold_out)
  const unitPrice = line.kind === 'lunch_full' ? (main?.price_full ?? 0) : ((soup ?? main)?.price_alone ?? 0)
  return { line, key, soup, main, unitPrice, currency: (soup ?? main)?.currency ?? '', available }
}

export function cartTotal(lines: ResolvedLine[]) {
  return lines.filter((line) => line.available).reduce((sum, line) => sum + Math.round(line.unitPrice * 100) * line.line.quantity, 0) / 100
}
