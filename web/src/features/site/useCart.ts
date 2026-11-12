import { useSyncExternalStore } from 'react'
import { addLine, cartTotal, resolve, setQuantity, type Cart, type CartLine } from '@/features/site/cart'
import type { Menu, Placed, Schedule } from '@/shared/api/client'

const STORAGE_KEY = 'el-mirador.cart'
const ORDERS_KEY = 'el-mirador.orders'
const REMEMBERED_ORDERS = 5
const listeners = new Set<() => void>()

const read = (): Cart => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

let cart = read()

const write = (next: Cart) => {
  cart = next
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useCart() {
  const lines = useSyncExternalStore(subscribe, () => cart)
  return {
    lines,
    add: (line: CartLine) => write(addLine(cart, line)),
    setQuantity: (key: string, quantity: number) => write(setQuantity(cart, key, quantity)),
  }
}

export function useOrder(menu: Menu, schedule: Schedule) {
  const cart = useCart()
  const lines = cart.lines.map((line) => resolve(line, menu, schedule.lunch_now))
  const currency = lines.find((line) => line.available)?.currency ?? menu.categories[0]?.products[0]?.variants[0]?.currency ?? ''
  return { cart, lines, total: cartTotal(lines), currency }
}

export type RememberedOrder = Pick<Placed, 'id' | 'tracking_token'>

export const rememberedOrders = (): RememberedOrder[] => {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function rememberOrder({ id, tracking_token }: Placed) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify([{ id, tracking_token }, ...rememberedOrders()].slice(0, REMEMBERED_ORDERS)))
}
