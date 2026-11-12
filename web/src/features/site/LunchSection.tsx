import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { lineKey } from '@/features/site/cart'
import { DishCard } from '@/features/site/DishCard'
import { useCart } from '@/features/site/useCart'
import type { DailyDish, Menu, Schedule } from '@/shared/api/client'
import { clock, money, useLabel } from '@/shared/lib/format'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'

const LUNCH_ICON = 'soup'

export function LunchSection({ menu, schedule }: { menu: Menu; schedule: Schedule }) {
  const { t } = useTranslation('site')
  const label = useLabel()
  const cart = useCart()
  const [main, setMain] = useState<DailyDish>()
  const includes = label(menu.lunch_includes)
  const hours = { from: clock(schedule.today.lunch_starts_at), to: clock(schedule.today.lunch_ends_at) }
  const closed = schedule.lunch_now ? undefined : t('lunchNotNow', hours)
  const soups = menu.lunch.filter((dish) => dish.kind === 'soup')
  const mains = menu.lunch.filter((dish) => dish.kind === 'main')
  const quantityOf = (soupId: number) =>
    cart.lines.find((line) => line.kind === 'lunch_soup' && line.soupId === soupId)?.quantity ?? 0

  return (
    <div className="grid gap-6">
      <p className="text-muted-foreground">
        {t('lunchIncludes', { includes })} {t('lunchHours', hours)}
      </p>
      <section className="grid gap-3">
        <h3 className="font-heading text-2xl font-bold uppercase">{t('mains')}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {mains.map((dish) => (
            <DishCard
              key={dish.id}
              name={label(dish.name)}
              description={t('lunchFullHint', { includes })}
              details={<p className="text-sm text-muted-foreground">{`${t('mainAlone')}: ${money(dish.price_alone, dish.currency)}`}</p>}
              price={money(dish.price_full ?? 0, dish.currency)}
              icon={LUNCH_ICON}
              unavailable={dish.sold_out ? t('soldOut') : closed}
              onAdd={() => setMain(dish)}
            />
          ))}
        </div>
      </section>
      <section className="grid gap-3">
        <h3 className="font-heading text-2xl font-bold uppercase">{t('soups')}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {soups.map((dish) => (
            <DishCard
              key={dish.id}
              name={label(dish.name)}
              description={t('soupAlone')}
              price={money(dish.price_alone, dish.currency)}
              icon={LUNCH_ICON}
              unavailable={dish.sold_out ? t('soldOut') : closed}
              quantity={quantityOf(dish.id)}
              onAdd={() => cart.add({ kind: 'lunch_soup', soupId: dish.id, quantity: 1 })}
              onRemove={() => cart.setQuantity(lineKey({ kind: 'lunch_soup', soupId: dish.id, quantity: 1 }), quantityOf(dish.id) - 1)}
            />
          ))}
        </div>
      </section>
      {main && <LunchDialog main={main} soups={soups} includes={includes} onClose={() => setMain(undefined)} />}
    </div>
  )
}

function LunchDialog({ main, soups, includes, onClose }: { main: DailyDish; soups: DailyDish[]; includes: string; onClose: () => void }) {
  const { t } = useTranslation('site')
  const label = useLabel()
  const cart = useCart()
  const available = soups.filter((soup) => !soup.sold_out)
  const [soupId, setSoupId] = useState<number | 'alone'>(available[0]?.id ?? 'alone')
  const price = soupId === 'alone' ? main.price_alone : (main.price_full ?? 0)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-3xl font-bold uppercase">{label(main.name)}</DialogTitle>
          <DialogDescription>{t('lunchFullHint', { includes })}</DialogDescription>
        </DialogHeader>
        <fieldset className="grid gap-2">
          <legend className="mb-2 font-heading text-xl font-bold uppercase">{t('chooseSoup')}</legend>
          {available.map((soup) => (
            <label key={soup.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-card p-3 has-checked:ring-2 has-checked:ring-primary">
              <span className="flex items-center gap-3">
                <input type="radio" name="soup" className="accent-primary" checked={soupId === soup.id} onChange={() => setSoupId(soup.id)} />
                {`${t('lunchFull')}: ${label(soup.name)}`}
              </span>
              <span className="font-semibold">{money(main.price_full ?? 0, main.currency)}</span>
            </label>
          ))}
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-card p-3 has-checked:ring-2 has-checked:ring-primary">
            <span className="flex items-center gap-3">
              <input type="radio" name="soup" className="accent-primary" checked={soupId === 'alone'} onChange={() => setSoupId('alone')} />
              {t('mainAlone')}
            </span>
            <span className="font-semibold">{money(main.price_alone, main.currency)}</span>
          </label>
        </fieldset>
        <DialogFooter>
          <Button
            size="lg"
            onClick={() => {
              cart.add(soupId === 'alone' ? { kind: 'lunch_main', mainId: main.id, quantity: 1 } : { kind: 'lunch_full', soupId, mainId: main.id, quantity: 1 })
              onClose()
            }}
          >
            {t('addToOrder', { price: money(price, main.currency) })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
