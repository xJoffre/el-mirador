import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { choiceProblems } from '@/features/site/cart'
import { useCart } from '@/features/site/useCart'
import type { OptionGroup, Product } from '@/shared/api/client'
import { money, useLabel } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'

export function DishDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const { t } = useTranslation('site')
  const label = useLabel()
  const cart = useCart()
  const [variantId, setVariantId] = useState(product.variants[0].id)
  const [chosen, setChosen] = useState<number[]>([])
  const [quantity, setQuantity] = useState(1)
  const variant = product.variants.find((candidate) => candidate.id === variantId)!
  const missing = choiceProblems(product.option_groups, chosen)

  const toggle = (group: OptionGroup, item: number) =>
    setChosen((current) => {
      if (current.includes(item)) return current.filter((id) => id !== item)
      const inGroup = group.items.map((option) => option.id)
      const others = group.max_choices === 1 ? current.filter((id) => !inGroup.includes(id)) : current
      const count = others.filter((id) => inGroup.includes(id)).length
      return count < group.max_choices ? [...others, item] : others
    })

  const rule = (group: OptionGroup) =>
    group.min_choices === 0
      ? `${t('optional')} · ${t('chooseUpTo', { count: group.max_choices })}`
      : group.max_choices === 1
        ? t('chooseOne')
        : t('chooseMany', { count: group.max_choices })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-svh overflow-y-auto sm:max-w-lg">
        {product.photo && <img src={product.photo} alt="" className="aspect-video w-full rounded-lg object-cover" />}
        <DialogHeader>
          <DialogTitle className="font-heading text-3xl font-bold uppercase">{label(product.name)}</DialogTitle>
          {product.description && <DialogDescription>{label(product.description)}</DialogDescription>}
        </DialogHeader>

        {product.variants.length > 1 && (
          <fieldset className="grid gap-2">
            <legend className="mb-2 font-heading text-xl font-bold uppercase">{t('size')}</legend>
            {product.variants.map((option) => (
              <label key={option.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-card p-3 has-checked:ring-2 has-checked:ring-primary">
                <span className="flex items-center gap-3">
                  <input type="radio" name="variant" className="accent-primary" checked={option.id === variantId} onChange={() => setVariantId(option.id)} />
                  {label(option.name)}
                </span>
                <span className="font-semibold">{money(option.price, option.currency)}</span>
              </label>
            ))}
          </fieldset>
        )}

        {product.option_groups.map((group) => (
          <fieldset key={group.id} className="grid gap-2">
            <legend className="mb-2 flex w-full items-baseline justify-between gap-2">
              <span className="font-heading text-xl font-bold uppercase">{label(group.name)}</span>
              <span className={cn('text-sm', missing.includes(group) ? 'text-accent-foreground' : 'text-muted-foreground')}>{rule(group)}</span>
            </legend>
            {group.items.map((item) => (
              <label key={item.id} className={cn('flex items-center gap-3 rounded-lg bg-card p-3', item.sold_out ? 'text-muted-foreground' : 'cursor-pointer has-checked:ring-2 has-checked:ring-primary')}>
                <input
                  type={group.max_choices === 1 ? 'radio' : 'checkbox'}
                  name={`group-${group.id}`}
                  className="accent-primary"
                  disabled={item.sold_out}
                  checked={chosen.includes(item.id)}
                  onChange={() => toggle(group, item.id)}
                />
                {label(item.name)}
                {item.sold_out && <span className="ml-auto text-sm text-accent-foreground">{t('soldOut')}</span>}
              </label>
            ))}
          </fieldset>
        ))}

        <DialogFooter className="flex-row items-center gap-2 sm:justify-between">
          <div className="flex items-center gap-2" role="group" aria-label={t('quantity')}>
            <Button variant="secondary" size="icon" aria-label={t('less', { name: label(product.name) })} disabled={quantity === 1} onClick={() => setQuantity(quantity - 1)}>
              <Minus aria-hidden />
            </Button>
            <span className="min-w-6 text-center font-semibold">{quantity}</span>
            <Button variant="secondary" size="icon" aria-label={t('more', { name: label(product.name) })} onClick={() => setQuantity(quantity + 1)}>
              <Plus aria-hidden />
            </Button>
          </div>
          <Button
            size="lg"
            className="flex-1 sm:flex-none"
            disabled={missing.length > 0}
            onClick={() => {
              cart.add({ kind: 'product', productId: product.id, variantId, optionIds: chosen, quantity })
              onClose()
            }}
          >
            {t('addToOrder', { price: money(variant.price * quantity, variant.currency) })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
