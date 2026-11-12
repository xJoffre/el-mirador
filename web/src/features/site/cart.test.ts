import { describe, expect, it } from 'vitest'
import type { Menu, OptionGroup, Product } from '@/shared/api/client'
import { addLine, cartTotal, choiceProblems, lineKey, resolve, setQuantity, type CartLine } from './cart'

const es = (text: string) => ({ es: text })

const sauces: OptionGroup = {
  id: 1,
  name: es('Salsa'),
  min_choices: 1,
  max_choices: 1,
  items: [
    { id: 11, name: es('BBQ'), sold_out: false },
    { id: 12, name: es('Piña'), sold_out: true },
  ],
}

const meats: OptionGroup = {
  id: 2,
  name: es('Carnes'),
  min_choices: 2,
  max_choices: 2,
  items: [
    { id: 21, name: es('Res'), sold_out: false },
    { id: 22, name: es('Chancho'), sold_out: false },
    { id: 23, name: es('Pollo'), sold_out: false },
  ],
}

const product = (id: number, price: number, changes: Partial<Product> = {}): Product => ({
  id,
  name: es(`Plato ${id}`),
  description: null,
  dine_in_only: false,
  sold_out: false,
  photo: null,
  variants: [{ id: id * 10, name: null, price, currency: 'USD' }],
  option_groups: [],
  ...changes,
})

const menu: Menu = {
  categories: [
    {
      id: 1,
      name: es('Picaditas'),
      description: null,
      icon: 'drumstick',
      products: [
        product(1, 5, { option_groups: [sauces] }),
        product(2, 0.1),
        product(3, 0.2),
        product(4, 15, { dine_in_only: true }),
        product(5, 6, { option_groups: [meats] }),
      ],
    },
  ],
  lunch_includes: es('Jugo y gelatina'),
  lunch: [
    { id: 7, kind: 'soup', name: es('Locro'), price_full: null, price_alone: 1.5, currency: 'USD', sold_out: false },
    { id: 8, kind: 'main', name: es('Seco'), price_full: 3.5, price_alone: 3, currency: 'USD', sold_out: false },
    { id: 9, kind: 'main', name: es('Guatita'), price_full: 3.25, price_alone: 2.75, currency: 'USD', sold_out: true },
  ],
}

const resolved = (lines: CartLine[], lunchNow = true) => lines.map((line) => resolve(line, menu, lunchNow))

describe('the cart', () => {
  it('adds up prices by quantity without floating point drift', () => {
    const lines: CartLine[] = [
      { kind: 'product', productId: 2, variantId: 20, optionIds: [], quantity: 1 },
      { kind: 'product', productId: 3, variantId: 30, optionIds: [], quantity: 1 },
      { kind: 'lunch_full', soupId: 7, mainId: 8, quantity: 2 },
    ]

    expect(cartTotal(resolved(lines))).toBe(7.3)
  })

  it('prices the full lunch by its main and the single dishes by themselves', () => {
    const [full, soup, main] = resolved([
      { kind: 'lunch_full', soupId: 7, mainId: 8, quantity: 1 },
      { kind: 'lunch_soup', soupId: 7, quantity: 1 },
      { kind: 'lunch_main', mainId: 8, quantity: 1 },
    ])

    expect([full.unitPrice, soup.unitPrice, main.unitPrice]).toEqual([3.5, 1.5, 3])
  })

  it('merges the same dish with the same choices and keeps different choices apart', () => {
    const wings = (optionIds: number[]): CartLine => ({ kind: 'product', productId: 1, variantId: 10, optionIds, quantity: 1 })

    const cart = addLine(addLine(addLine([], wings([11])), wings([11])), wings([11]))
    const mixed = addLine(addLine([], { kind: 'product', productId: 5, variantId: 50, optionIds: [21, 22], quantity: 1 }), {
      kind: 'product',
      productId: 5,
      variantId: 50,
      optionIds: [22, 21],
      quantity: 1,
    })

    expect(cart).toHaveLength(1)
    expect(cart[0].quantity).toBe(3)
    expect(mixed).toHaveLength(1)
    expect(setQuantity(cart, lineKey(cart[0]), 0)).toEqual([])
  })

  it('leaves out of the total what can no longer be ordered', () => {
    const lines = resolved(
      [
        { kind: 'product', productId: 1, variantId: 10, optionIds: [12], quantity: 1 },
        { kind: 'product', productId: 4, variantId: 40, optionIds: [], quantity: 1 },
        { kind: 'lunch_main', mainId: 9, quantity: 1 },
        { kind: 'product', productId: 99, variantId: 990, optionIds: [], quantity: 1 },
        { kind: 'product', productId: 2, variantId: 20, optionIds: [], quantity: 3 },
      ],
      true,
    )

    expect(lines.map((line) => line.available)).toEqual([false, false, false, false, true])
    expect(cartTotal(lines)).toBe(0.3)
  })

  it('only sells the lunch during lunch hours', () => {
    const [lunch] = resolved([{ kind: 'lunch_soup', soupId: 7, quantity: 1 }], false)

    expect(lunch.available).toBe(false)
  })
})

describe('required choices', () => {
  it('asks for exactly as many items as the choice needs', () => {
    expect(choiceProblems([sauces], [])).toEqual([sauces])
    expect(choiceProblems([sauces], [11])).toEqual([])
    expect(choiceProblems([meats], [21])).toEqual([meats])
    expect(choiceProblems([meats], [21, 22])).toEqual([])
    expect(choiceProblems([meats], [21, 22, 23])).toEqual([meats])
  })

  it('does not ask anything of optional choices', () => {
    expect(choiceProblems([{ ...sauces, min_choices: 0 }], [])).toEqual([])
  })
})
