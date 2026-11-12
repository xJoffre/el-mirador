import { Bike, Phone, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getGetTodayOrdersQueryKey, SessionRole, useCancelOrder, useCloseOrder, useGetSession, useGetTodayOrders, type OrderView } from '@/shared/api/client'
import { money } from '@/shared/lib/format'
import { useLineText } from '@/shared/lib/lines'
import { SAFETY_REFRESH } from '@/shared/lib/live'
import { minutesSince, useNow } from '@/shared/lib/now'
import { cn } from '@/shared/lib/utils'
import { useSaved } from '@/features/panel/useSaved'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'

const COLUMNS = [
  { key: 'kitchen', states: ['received', 'preparing'] },
  { key: 'ready', states: ['ready'] },
  { key: 'done', states: ['delivered', 'cancelled'] },
] as const

export function OrdersPage() {
  const { t } = useTranslation('orders')
  const orders = useGetTodayOrders(SAFETY_REFRESH)
  const session = useGetSession()
  const [charging, setCharging] = useState<OrderView>()
  const [cancelling, setCancelling] = useState<OrderView>()
  const canCancel = session.data?.role === SessionRole.admin

  return (
    <div className="grid items-start gap-4 lg:grid-cols-3">
      {COLUMNS.map(({ key, states }) => {
        const column = orders.data?.filter((order) => (states as readonly string[]).includes(order.state)) ?? []
        return (
          <section key={key} className="grid gap-3">
            <h2 className="font-heading text-2xl font-bold uppercase">{`${t(`columns.${key}`)} (${column.length})`}</h2>
            {column.length === 0 && key === 'kitchen' && <p className="rounded-xl bg-card p-4 text-center text-muted-foreground">{t('empty')}</p>}
            {column.map((order) => (
              <OrderCard key={order.id} order={order} onCharge={() => setCharging(order)} onCancel={canCancel ? () => setCancelling(order) : undefined} />
            ))}
          </section>
        )
      })}
      {charging && <ChargeDialog order={charging} onClose={() => setCharging(undefined)} />}
      {cancelling && <CancelDialog order={cancelling} onClose={() => setCancelling(undefined)} />}
    </div>
  )
}

function OrderCard({ order, onCharge, onCancel }: { order: OrderView; onCharge: () => void; onCancel?: () => void }) {
  const { t } = useTranslation(['orders', 'site'])
  const lineText = useLineText()
  const now = useNow()
  const done = order.state === 'delivered' || order.state === 'cancelled'

  return (
    <article className={cn('grid gap-3 rounded-xl p-4', order.state === 'ready' ? 'bg-accent' : 'bg-card', done && 'opacity-75')}>
      <header className="flex flex-wrap items-center gap-2">
        <span className="font-heading text-3xl font-bold">#{order.id}</span>
        <Badge variant="outline">
          {order.delivery_address ? <Bike aria-hidden /> : <ShoppingBag aria-hidden />}
          {order.delivery_address ? t('delivery') : t('pickup')}
        </Badge>
        {order.state === 'cancelled' && <Badge variant="destructive">{t('cancelled')}</Badge>}
        {order.invoice && <Badge variant="secondary">{t('invoice')}</Badge>}
        <span className="ml-auto text-sm text-muted-foreground">{t('minutesAgo', { count: minutesSince(order.created_at, now) })}</span>
      </header>
      <div className="text-sm">
        <p className="font-medium">{order.customer_name}</p>
        <a className="inline-flex items-center gap-1 text-accent-foreground underline" href={`tel:+${order.customer_phone}`}>
          <Phone className="size-3" aria-hidden />+{order.customer_phone}
        </a>
        {order.delivery_address && <p className="text-muted-foreground">{order.delivery_address}</p>}
        {order.note && <p className="italic">{order.note}</p>}
        {order.cancel_reason && <p className="text-destructive">{order.cancel_reason}</p>}
      </div>
      <ul className="grid gap-1 text-sm">
        {order.lines.map((line) => {
          const { name, details } = lineText(line)
          return (
            <li key={line.id}>
              <span className="font-medium">{`${line.quantity} × ${name}`}</span>
              {details && <span className="text-muted-foreground">{` · ${details}`}</span>}
            </li>
          )
        })}
      </ul>
      <footer className="flex flex-wrap items-center gap-2">
        <span className="font-heading text-2xl font-bold">{money(order.total, order.currency)}</span>
        {order.state === 'delivered' && <span className="text-sm text-muted-foreground">{t('paid')}</span>}
        {!done && onCancel && (
          <Button variant="ghost" className="ml-auto" onClick={onCancel}>
            {t('cancel')}
          </Button>
        )}
        {!done && (
          <Button className={onCancel ? undefined : 'ml-auto'} onClick={onCharge}>
            {order.delivery_address ? t('toCourier') : t('handOver')}
          </Button>
        )}
      </footer>
    </article>
  )
}

function ChargeDialog({ order, onClose }: { order: OrderView; onClose: () => void }) {
  const { t } = useTranslation(['orders', 'panel'])
  const due = Math.round((order.total - order.paid) * 100) / 100
  const [cash, setCash] = useState(due.toFixed(2))
  const [transfer, setTransfer] = useState('')
  const close = useCloseOrder(useSaved([getGetTodayOrdersQueryKey()], onClose))
  const received = Number(cash || 0) + Number(transfer || 0)
  const missing = Math.round((due - received) * 100) / 100

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-3xl font-bold uppercase">{`#${order.id} · ${money(due, order.currency)}`}</DialogTitle>
          <DialogDescription>{t('chargeHint')}</DialogDescription>
        </DialogHeader>
        <form
          id="charge"
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            const payments = [
              { method: 'cash' as const, amount: Number(cash || 0) },
              { method: 'transfer' as const, amount: Number(transfer || 0) },
            ].filter((payment) => payment.amount > 0)
            close.mutate({ id: order.id, data: { payments } })
          }}
        >
          {(
            [
              ['cash', cash, setCash],
              ['transfer', transfer, setTransfer],
            ] as const
          ).map(([method, value, set]) => (
            <div key={method} className="grid gap-1.5">
              <Label htmlFor={method}>{t(method)}</Label>
              <Input id={method} type="number" inputMode="decimal" min={0} step="0.01" value={value} onChange={(event) => set(event.target.value)} />
            </div>
          ))}
          {missing > 0 && <p className="text-sm font-medium text-destructive">{t('missing', { amount: money(missing, order.currency) })}</p>}
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t('panel:cancel')}
          </Button>
          <Button type="submit" form="charge" disabled={missing > 0 || close.isPending}>
            {t('charge', { total: money(received, order.currency) })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CancelDialog({ order, onClose }: { order: OrderView; onClose: () => void }) {
  const { t } = useTranslation('orders')
  const [reason, setReason] = useState('')
  const cancel = useCancelOrder(useSaved([getGetTodayOrdersQueryKey()], onClose))

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-3xl font-bold uppercase">{t('cancelTitle', { id: order.id })}</DialogTitle>
          <DialogDescription>{t('cancelHint')}</DialogDescription>
        </DialogHeader>
        <form
          id="cancel"
          className="grid gap-1.5"
          onSubmit={(event) => {
            event.preventDefault()
            cancel.mutate({ id: order.id, data: { reason: reason.trim() } })
          }}
        >
          <Label htmlFor="cancel-reason">{t('cancelReason')}</Label>
          <Textarea id="cancel-reason" required value={reason} onChange={(event) => setReason(event.target.value)} />
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t('keep')}
          </Button>
          <Button type="submit" form="cancel" variant="destructive" disabled={!reason.trim() || cancel.isPending}>
            {t('confirmCancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
