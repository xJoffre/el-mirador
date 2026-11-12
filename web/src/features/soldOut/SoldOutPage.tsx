import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getGetMenuQueryKey, useGetMenu, useGetSchedule, useMarkLunchDishSoldOut, useMarkOptionItemSoldOut, useMarkProductSoldOut } from '@/shared/api/client'
import { useLabel } from '@/shared/lib/format'
import { Label } from '@/shared/ui/label'
import { Switch } from '@/shared/ui/switch'

export function SoldOutPage() {
  const { t } = useTranslation('soldOut')
  const label = useLabel()
  const menu = useGetMenu()
  const queries = useQueryClient()
  const refresh = { mutation: { onSuccess: () => queries.invalidateQueries({ queryKey: getGetMenuQueryKey() }) } }
  const markProduct = useMarkProductSoldOut(refresh)
  const markItem = useMarkOptionItemSoldOut(refresh)
  const markLunch = useMarkLunchDishSoldOut(refresh)
  const schedule = useGetSchedule()

  return (
    <div className="grid gap-6">
      <p className="text-muted-foreground">{t('hint')}</p>
      {schedule.data && menu.data && menu.data.lunch.length > 0 && (
        <section className="grid gap-2">
          <h2 className="font-heading text-2xl font-bold uppercase">{t('lunch')}</h2>
          <ul className="grid gap-2 md:grid-cols-2">
            {menu.data.lunch.map((dish) => (
              <li key={dish.id} className="flex items-center justify-between gap-4 rounded-xl bg-card p-3">
                <Label htmlFor={`lunch-${dish.id}`} className="text-base">
                  {label(dish.name)}
                </Label>
                <Switch
                  id={`lunch-${dish.id}`}
                  checked={dish.sold_out}
                  onCheckedChange={(soldOut) => markLunch.mutate({ date: schedule.data.date, id: dish.id, data: { sold_out: soldOut } })}
                  aria-label={t('soldOut')}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
      {menu.data?.categories.map((category) => (
        <section key={category.id} className="grid gap-2">
          <h2 className="font-heading text-2xl font-bold uppercase">{label(category.name)}</h2>
          <ul className="grid gap-2 md:grid-cols-2">
            {category.products.map((product) => (
              <li key={product.id} className="grid gap-2 rounded-xl bg-card p-3">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor={`product-${product.id}`} className="text-base">
                    {label(product.name)}
                  </Label>
                  <Switch
                    id={`product-${product.id}`}
                    checked={product.sold_out}
                    onCheckedChange={(soldOut) => markProduct.mutate({ id: product.id, data: { sold_out: soldOut } })}
                    aria-label={t('soldOut')}
                  />
                </div>
                {product.option_groups.flatMap((group) => group.items).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 pl-4 text-sm">
                    <Label htmlFor={`item-${item.id}`}>{label(item.name)}</Label>
                    <Switch
                      id={`item-${item.id}`}
                      size="sm"
                      checked={item.sold_out}
                      onCheckedChange={(soldOut) => markItem.mutate({ id: item.id, data: { sold_out: soldOut } })}
                      aria-label={t('soldOut')}
                    />
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
