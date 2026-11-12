import { Download } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSaved } from '@/features/panel/useSaved'
import {
  getGetInvoiceRequestsQueryKey,
  getGetPaymentsQueryKey,
  getGetSalesCsvUrl,
  useGetInvoiceRequests,
  useGetPayments,
  useGetSales,
  useGetSchedule,
  useIssueInvoice,
  useVerifyPayment,
  type InvoiceRequest,
} from '@/shared/api/client'
import { money } from '@/shared/lib/format'
import { Button, buttonVariants } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

export function CashPage() {
  const { t } = useTranslation('cash')
  const schedule = useGetSchedule()
  const [chosen, setChosen] = useState<string>()
  const day = chosen ?? schedule.data?.date
  if (!day) return null

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="cash-day">{t('day')}</Label>
          <Input id="cash-day" type="date" value={day} onChange={(event) => setChosen(event.target.value || undefined)} />
        </div>
        <a className={buttonVariants()} href={getGetSalesCsvUrl({ from: day, to: day })} download>
          <Download aria-hidden />
          {t('download')}
        </a>
      </div>
      <Summary day={day} />
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Transfers day={day} />
        <Invoices day={day} />
      </div>
    </div>
  )
}

function Summary({ day }: { day: string }) {
  const { t } = useTranslation('cash')
  const sales = useGetSales({ from: day, to: day })
  const rows = sales.data ?? []
  const currency = rows[0]?.currency ?? ''
  const sum = (pick: (sale: (typeof rows)[number]) => number) => rows.reduce((total, sale) => total + Math.round(pick(sale) * 100), 0) / 100
  const amount = (value: number) => (currency ? money(value, currency) : '—')
  const figures = [
    { label: t('sales'), value: amount(sum((sale) => sale.total)) },
    { label: t('cash'), value: amount(sum((sale) => sale.cash)) },
    { label: t('transfers'), value: amount(sum((sale) => sale.transfer)) },
    { label: t('orders'), value: String(rows.length) },
  ]

  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {figures.map(({ label, value }) => (
        <div key={label} className="rounded-xl bg-card p-4">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="font-heading text-3xl font-bold">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Transfers({ day }: { day: string }) {
  const { t } = useTranslation('cash')
  const payments = useGetPayments(day)
  const verify = useVerifyPayment(useSaved([getGetPaymentsQueryKey(day)]))
  const transfers = payments.data?.filter((payment) => payment.method === 'transfer') ?? []

  return (
    <section className="grid content-start gap-3 rounded-xl bg-card p-4">
      <div>
        <h2 className="font-heading text-2xl font-bold uppercase">{t('toVerify')}</h2>
        <p className="text-sm text-muted-foreground">{t('toVerifyHint')}</p>
      </div>
      {transfers.length === 0 && <p className="text-muted-foreground">{t('noTransfers')}</p>}
      <ul className="grid gap-2">
        {transfers.map((payment) => (
          <li key={payment.id} className="flex items-center justify-between gap-3 rounded-lg bg-background p-3">
            <div>
              <p className="font-medium">{`${t('order', { id: payment.order_id })} · ${payment.customer_name}`}</p>
              <p className="font-heading text-xl font-bold">{money(payment.amount, payment.currency)}</p>
            </div>
            {payment.verified ? (
              <span className="text-sm text-success">{t('verified')}</span>
            ) : (
              <Button disabled={verify.isPending} onClick={() => verify.mutate({ id: payment.id })}>
                {t('verify')}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Invoices({ day }: { day: string }) {
  const { t } = useTranslation(['cash', 'site'])
  const requests = useGetInvoiceRequests(day)

  return (
    <section className="grid content-start gap-3 rounded-xl bg-card p-4">
      <div>
        <h2 className="font-heading text-2xl font-bold uppercase">{t('invoices')}</h2>
        <p className="text-sm text-muted-foreground">{t('invoicesHint')}</p>
      </div>
      {requests.data?.length === 0 && <p className="text-muted-foreground">{t('noInvoices')}</p>}
      <ul className="grid gap-2">
        {requests.data?.map((request) => (
          <InvoiceRow key={request.id} request={request} day={day} />
        ))}
      </ul>
    </section>
  )
}

function InvoiceRow({ request, day }: { request: InvoiceRequest; day: string }) {
  const { t } = useTranslation(['cash', 'site', 'panel'])
  const issue = useIssueInvoice(useSaved([getGetInvoiceRequestsQueryKey(day)]))
  const [number, setNumber] = useState('')

  return (
    <li className="grid gap-2 rounded-lg bg-background p-3 text-sm">
      <p className="font-medium">{`${t('order', { id: request.order_id })} · ${money(request.total, request.currency)}`}</p>
      <p>
        {`${t(`site:idTypes.${request.id_type}`)} ${request.id_number} · ${request.name}`}
        <span className="block text-muted-foreground">{[request.email, request.address].filter(Boolean).join(' · ')}</span>
      </p>
      {request.invoice_number ? (
        <p className="text-success">{t('issued', { number: request.invoice_number })}</p>
      ) : request.order_status !== 'closed' ? (
        <p className="text-muted-foreground">{t(request.order_status === 'cancelled' ? 'orderStates.cancelled' : 'orderStates.open')}</p>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (number.trim()) issue.mutate({ id: request.id, data: { invoice_number: number.trim() } })
          }}
        >
          <Input aria-label={t('invoiceNumber')} placeholder={t('invoiceNumber')} value={number} onChange={(event) => setNumber(event.target.value)} />
          <Button type="submit" disabled={issue.isPending}>
            {t('panel:save')}
          </Button>
        </form>
      )}
    </li>
  )
}
