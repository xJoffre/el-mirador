import { useTranslation } from 'react-i18next'
import i18n, { baseLanguage } from '@/shared/i18n'
import { ApiError } from '@/shared/lib/request'

export type Label = Record<string, string>

export function useLabel() {
  const { i18n: current } = useTranslation()
  return (label: Label | null | undefined) =>
    label?.[current.resolvedLanguage ?? baseLanguage] ?? label?.[baseLanguage] ?? ''
}

export const money = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(amount)

const isoDateTime = /^\d{4}-\d{2}-\d{2}T/

export function errorText(error: unknown) {
  const { code, details } = error instanceof ApiError ? error : new ApiError(0, 'shared.unexpected', {})
  const values = Object.fromEntries(
    Object.entries(details).map(([key, value]) => [key, typeof value === 'string' && isoDateTime.test(value) ? new Date(value) : value]),
  )
  return i18n.t(code as 'shared.unexpected', { ns: 'errors', ...values })
}

const MONDAY = new Date(2024, 0, 1)

export const weekdayName = (isoDay: number) =>
  new Intl.DateTimeFormat(i18n.resolvedLanguage, { weekday: 'long' }).format(
    new Date(MONDAY.getFullYear(), MONDAY.getMonth(), MONDAY.getDate() + isoDay - 1),
  )

export const clock = (time: string | null | undefined) =>
  time ? new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date(`1970-01-01T${time}`)) : ''
