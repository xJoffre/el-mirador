import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import type { ResolvedLine } from '@/features/site/cart'
import { rememberOrder, useCart } from '@/features/site/useCart'
import { InvoiceDetailsIdType, usePlaceOrder, type NewOrder } from '@/shared/api/client'
import { PlaceOrderBody } from '@/shared/api/schemas'
import { emptyIsNull, errorText, money } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Switch } from '@/shared/ui/switch'
import { Textarea } from '@/shared/ui/textarea'

type Props = { lines: ResolvedLine[]; total: number; currency: string; onClose: () => void }

export function CheckoutDialog({ lines, total, currency, onClose }: Props) {
  const { t } = useTranslation(['site', 'privacy'])
  const cart = useCart()
  const navigate = useNavigate()
  const [delivery, setDelivery] = useState(false)
  const [error, setError] = useState('')
  const place = usePlaceOrder({ mutation: { onError: (failure) => setError(errorText(failure)) } })
  const form = useForm<NewOrder>({
    resolver: zodResolver(PlaceOrderBody),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      delivery_address: null,
      note: null,
      lines: [],
      invoice: null,
    },
  })

  const submit = form.handleSubmit((details) =>
    place.mutate(
      {
        data: {
          ...details,
          delivery_address: delivery ? details.delivery_address : null,
          lines: lines.map(({ line }) => ({
            kind: line.kind,
            product_variant_id: line.kind === 'product' ? line.variantId : null,
            option_item_ids: line.kind === 'product' ? line.optionIds : null,
            soup_dish_id: 'soupId' in line ? line.soupId : null,
            main_dish_id: 'mainId' in line ? line.mainId : null,
            quantity: line.quantity,
            note: null,
          })),
        },
      },
      {
        onSuccess: (placed) => {
          rememberOrder(placed)
          lines.forEach(({ key }) => cart.setQuantity(key, 0))
          navigate(`/pedido/${placed.tracking_token}`)
        },
      },
    ),
  )

  const invoice = useWatch({ control: form.control, name: 'invoice' }) !== null

  const field = (name: 'customer_name' | 'customer_phone', text: string, hint?: string) => (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{text}</Label>
      <Input
        id={name}
        inputMode={name === 'customer_phone' ? 'numeric' : undefined}
        autoComplete={name === 'customer_phone' ? 'tel' : 'name'}
        aria-invalid={!!form.formState.errors[name]}
        {...form.register(name)}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-svh overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-3xl font-bold uppercase text-brand">{t('yourDetails')}</DialogTitle>
          <DialogDescription>{money(total, currency)}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          {field('customer_name', t('name'))}
          {field('customer_phone', t('phone'), t('phoneHint'))}
          <fieldset className="grid gap-2">
            <legend className="mb-2 font-medium">{t('howToGet')}</legend>
            <div className="grid grid-cols-2 gap-2" role="radiogroup">
              {[false, true].map((option) => (
                <Button
                  key={String(option)}
                  type="button"
                  role="radio"
                  aria-checked={delivery === option}
                  variant={delivery === option ? 'default' : 'secondary'}
                  className={cn('h-auto py-3 whitespace-normal')}
                  onClick={() => setDelivery(option)}
                >
                  {option ? t('delivery') : t('pickup')}
                </Button>
              ))}
            </div>
          </fieldset>
          {delivery && (
            <div className="grid gap-1.5">
              <Label htmlFor="delivery_address">{t('deliveryAddress')}</Label>
              <Textarea id="delivery_address" required {...form.register('delivery_address', emptyIsNull)} />
              <p className="text-xs text-muted-foreground">{t('deliveryHint')}</p>
            </div>
          )}
          <label className="flex items-center gap-2">
            <Switch checked={invoice} onCheckedChange={(on) => form.setValue('invoice', on ? { id_type: InvoiceDetailsIdType.cedula, id_number: '', name: '', email: '', address: null } : null)} />
            {t('wantInvoice')}
          </label>
          {invoice && (
            <fieldset className="grid gap-3 rounded-xl bg-card p-3">
              <div className="grid gap-2" role="radiogroup" aria-label={t('idType')}>
                <Controller
                  control={form.control}
                  name="invoice.id_type"
                  render={({ field }) => (
                    <div className="grid grid-cols-3 gap-2">
                      {Object.values(InvoiceDetailsIdType).map((type) => (
                        <Button key={type} type="button" role="radio" aria-checked={field.value === type} variant={field.value === type ? 'default' : 'secondary'} onClick={() => field.onChange(type)}>
                          {t(`idTypes.${type}`)}
                        </Button>
                      ))}
                    </div>
                  )}
                />
              </div>
              {(
                [
                  ['invoice.id_number', t('idNumber'), 'off'],
                  ['invoice.name', t('invoiceName'), 'name'],
                  ['invoice.email', t('invoiceEmail'), 'email'],
                ] as const
              ).map(([name, text, autoComplete]) => (
                <div key={name} className="grid gap-1.5">
                  <Label htmlFor={name}>{text}</Label>
                  <Input id={name} required autoComplete={autoComplete} type={name === 'invoice.email' ? 'email' : 'text'} {...form.register(name)} />
                </div>
              ))}
              <div className="grid gap-1.5">
                <Label htmlFor="invoice.address">{t('invoiceAddress')}</Label>
                <Input id="invoice.address" autoComplete="street-address" {...form.register('invoice.address', emptyIsNull)} />
              </div>
            </fieldset>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="note">{t('orderNote')}</Label>
            <Textarea id="note" {...form.register('note', emptyIsNull)} />
          </div>
          <p className="min-h-5 text-sm text-destructive" role="alert">
            {error}
          </p>
          <p className="text-xs text-muted-foreground">
            {`${t('privacy:checkoutNote')} `}
            <a className="underline" href="/privacidad" target="_blank" rel="noreferrer">
              {t('privacy:title')}
            </a>
          </p>
          <Button type="submit" size="lg" disabled={place.isPending}>
            {t('send', { total: money(total, currency) })}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
