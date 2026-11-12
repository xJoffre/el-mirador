import { useSyncExternalStore } from 'react'

const MINUTE = 60_000

let now = Date.now()
const listeners = new Set<() => void>()
let ticking: ReturnType<typeof setInterval> | undefined

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  ticking ??= setInterval(() => {
    now = Date.now()
    listeners.forEach((notify) => notify())
  }, MINUTE)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      clearInterval(ticking)
      ticking = undefined
    }
  }
}

export const useNow = () => useSyncExternalStore(subscribe, () => now)

export const minutesSince = (instant: string, at: number) => Math.max(0, Math.floor((at - new Date(instant).getTime()) / MINUTE))
