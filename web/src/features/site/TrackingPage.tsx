import { Check } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { OrderViewState, useGetSchedule, useGetTracking } from '@/shared/api/client'
import { money } from '@/shared/lib/format'
import { useLineText } from '@/shared/lib/lines'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'

const STEPS: OrderViewState[] = [OrderViewState.received, OrderViewState.preparing, OrderViewState.ready, OrderViewState.delivered]

export function TrackingPage() {
  const { t } = useTranslation('site')
  const { token = '' } = useParams()
  const order = useGetTracking(token)
  const schedule = useGetSchedule()
  const lineText = useLineText()
  useEffect(() => {
    if (order.data) document.title = t('orderNumber', { id: order.data.id })
  }, [order.data, t])

  if (order.isError) {
    return (
      <main className="grid min-h-svh place-items-center bg-ground p-4">
        <section className="grid justify-items-center gap-4 rounded-3xl bg-background p-8 text-center">
          <p>{t('orderNotFound')}</p>
          <Button render={<Link to="/" />} nativeButton={false}>
            {t('backToMenu')}
          </Button>
        </section>
      </main>
    )
  }
  if (!order.data) return <div className="min-h-svh bg-ground" />

  const { id, state, delivery_address, lines, total, currency } = order.data
  const reached = STEPS.indexOf(state)
  const hint = state === 'ready' && delivery_address ? t('stateHints.readyDelivery') : t(`stateHints.${state}`)
  const profile = schedule.data?.profile

  return (
    <main className="min-h-svh bg-ground p-0 md:p-4">
      <section className="mx-auto grid min-h-svh max-w-xl content-start gap-6 bg-background p-6 md:min-h-0 md:rounded-3xl">
        <header className="grid gap-1">
          <h1 className="font-heading text-5xl font-bold uppercase text-brand">{t('orderNumber', { id })}</h1>
          <p className="text-lg font-semibold" role="status">
            {hint}
          </p>
        </header>

        {state === 'cancelled' ? (
          <p className="rounded-xl bg-destructive/10 p-4 font-semibold text-destructive">{t('states.cancelled')}</p>
        ) : (
          <ol className="grid grid-cols-4 gap-2">
            {STEPS.map((step, index) => (
              <li key={step} className="grid justify-items-center gap-2 text-center text-sm">
                <span
                  className={cn(
                    'grid size-10 place-items-center rounded-full font-bold',
                    index <= reached ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
                  )}
                  aria-hidden
                >
                  {index < reached ? <Check className="size-5" /> : index + 1}
                </span>
                <span className={cn(index === reached && 'font-semibold')}>{t(`states.${step}`)}</span>
              </li>
            ))}
          </ol>
        )}

        <ul className="grid gap-2 rounded-xl bg-card p-4">
          {lines.map((line) => {
            const { name, details } = lineText(line)
            return (
              <li key={line.id} className="flex justify-between gap-4">
                <span>
                  <span className="font-medium">{`${line.quantity} × ${name}`}</span>
                  {details && <span className="block text-sm text-muted-foreground">{details}</span>}
                </span>
                <span className="shrink-0">{money(line.unit_price * line.quantity, line.currency)}</span>
              </li>
            )
          })}
          <li className="mt-2 flex justify-between border-t pt-2 font-heading text-2xl font-bold uppercase">
            <span>{t('total')}</span>
            <span>{money(total, currency)}</span>
          </li>
        </ul>

        {state !== 'cancelled' && (
          <div className="grid gap-1 text-sm">
            <p className="font-medium">{delivery_address ? t('deliveryTo', { address: delivery_address }) : t('pickupAt')}</p>
            <p className="text-muted-foreground">{delivery_address ? t('payDelivery') : t('payHint')}</p>
            {profile?.bank_account && <p className="text-muted-foreground">{t('bankAccount', { account: profile.bank_account })}</p>}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" render={<Link to="/" />} nativeButton={false}>
            {t('backToMenu')}
          </Button>
          {profile?.whatsapp && (
            <Button render={<a href={`https://wa.me/${profile.whatsapp}`} target="_blank" rel="noreferrer" />} nativeButton={false}>
              {t('writeUs')}
            </Button>
          )}
        </div>
      </section>
    </main>
  )
}
