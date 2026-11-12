import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ResolvedLine } from '@/features/site/cart'
import { useOrder } from '@/features/site/useCart'
import type { Menu, Schedule } from '@/shared/api/client'
import { money, useLabel } from '@/shared/lib/format'
import { Button } from '@/shared/ui/button'

function useLineName() {
  const { t } = useTranslation('site')
  const label = useLabel()
  return ({ line, product, soup, main }: ResolvedLine) => {
    if (line.kind === 'product') {
      const variant = product?.variants.find((candidate) => candidate.id === line.variantId)
      const options = product?.option_groups.flatMap((group) => group.items).filter((item) => line.optionIds.includes(item.id)) ?? []
      return {
        name: [label(product?.name), label(variant?.name)].filter(Boolean).join(' · '),
        details: options.map((option) => label(option.name)).join(', '),
      }
    }
    if (line.kind === 'lunch_full') return { name: t('lunchFull'), details: [label(main?.name), label(soup?.name)].join(', ') }
    if (line.kind === 'lunch_soup') return { name: label(soup?.name), details: t('soupAlone') }
    return { name: label(main?.name), details: t('mainAlone') }
  }
}

export function OrderPanel({ menu, schedule }: { menu: Menu; schedule: Schedule }) {
  const { t } = useTranslation('site')
  const { cart, lines, total, currency } = useOrder(menu, schedule)
  const nameOf = useLineName()
  const whatsapp = schedule.profile.whatsapp

  return (
    <div className="grid content-start gap-4">
      <h2 className="font-heading text-3xl font-bold uppercase text-brand">{t('order')}</h2>
      {lines.length === 0 ? (
        <div className="grid justify-items-center gap-3 py-8 text-center text-muted-foreground">
          <ShoppingBag className="size-10 text-accent-foreground" aria-hidden />
          <p>{t('emptyOrder')}</p>
        </div>
      ) : (
        <>
          <ul className="grid gap-2">
            {lines.map((resolved) => {
              const { name, details } = nameOf(resolved)
              const { key, line, available } = resolved
              return (
                <li key={key} className="grid gap-2 rounded-xl bg-background p-3">
                  <div className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{name}</p>
                      {details && <p className="text-sm text-muted-foreground">{details}</p>}
                      {!available && <p className="text-sm font-medium text-accent-foreground">{t('unavailable')}</p>}
                    </div>
                    <p className="shrink-0 font-semibold">{available && money(resolved.unitPrice * line.quantity, resolved.currency)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {available ? (
                      <>
                        <Button variant="secondary" size="icon-sm" aria-label={t('less', { name })} onClick={() => cart.setQuantity(key, line.quantity - 1)}>
                          <Minus aria-hidden />
                        </Button>
                        <span className="min-w-6 text-center font-semibold">{line.quantity}</span>
                        <Button variant="secondary" size="icon-sm" aria-label={t('more', { name })} onClick={() => cart.setQuantity(key, line.quantity + 1)}>
                          <Plus aria-hidden />
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => cart.setQuantity(key, 0)}>
                        <Trash2 aria-hidden />
                        {t('remove')}
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="flex justify-between font-heading text-2xl font-bold uppercase">
            <span>{t('total')}</span>
            <span>{money(total, currency)}</span>
          </p>
          <p className="text-sm text-muted-foreground">{t('sendSoon')}</p>
          {whatsapp && (
            <Button render={<a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" />} nativeButton={false}>
              {t('writeUs')}
            </Button>
          )}
        </>
      )}
    </div>
  )
}
