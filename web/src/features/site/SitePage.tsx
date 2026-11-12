import { Clock, Info, Search, ShoppingBag } from 'lucide-react'
import { DynamicIcon } from 'lucide-react/dynamic'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { SectionIcon } from '@/features/catalog/catalog'
import { lineKey } from '@/features/site/cart'
import { DishCard } from '@/features/site/DishCard'
import { DishDialog } from '@/features/site/DishDialog'
import { LunchSection } from '@/features/site/LunchSection'
import { OrderPanel } from '@/features/site/OrderPanel'
import { StoreInfoDialog } from '@/features/site/StoreInfoDialog'
import { rememberedOrders, useCart, useOrder } from '@/features/site/useCart'
import zaruma from '@/features/site/zaruma.jpg'
import { useGetMenu, useGetSchedule, type Menu, type Product, type Schedule } from '@/shared/api/client'
import { money, useLabel } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'
import { Button, buttonVariants } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'

const LUNCH = 'lunch' as const

type Tab = number | typeof LUNCH

export function SitePage() {
  const menu = useGetMenu()
  const schedule = useGetSchedule()
  useEffect(() => {
    if (schedule.data) document.title = schedule.data.profile.name
  }, [schedule.data])
  if (!menu.data || !schedule.data) return <div className="min-h-svh bg-ground" />
  return <Site menu={menu.data} schedule={schedule.data} />
}

function Site({ menu, schedule }: { menu: Menu; schedule: Schedule }) {
  const { t } = useTranslation('site')
  const label = useLabel()
  const cart = useCart()
  const order = useOrder(menu, schedule)
  const [tab, setTab] = useState<Tab>()
  const [search, setSearch] = useState('')
  const [dish, setDish] = useState<Product>()
  const [info, setInfo] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)
  const [latest] = useState(() => rememberedOrders()[0])

  const tabs: Tab[] = [...(menu.lunch.length > 0 ? [LUNCH] : []), ...menu.categories.map((category) => category.id)]
  const current = tab !== undefined && tabs.includes(tab) ? tab : tabs[0]
  const section = menu.categories.find((category) => category.id === current)
  const query = search.trim().toLocaleLowerCase()
  const found = menu.categories.flatMap((category) =>
    category.products.filter((product) => label(product.name).toLocaleLowerCase().includes(query)).map((product) => ({ product, icon: category.icon })),
  )
  const count = cart.lines.reduce((sum, line) => sum + line.quantity, 0)

  const simple = (product: Product) => product.variants.length === 1 && product.option_groups.length === 0
  const simpleKey = (product: Product) => lineKey({ kind: 'product', productId: product.id, variantId: product.variants[0].id, optionIds: [], quantity: 1 })
  const quantityOf = (product: Product) =>
    simple(product) ? (cart.lines.find((line) => lineKey(line) === simpleKey(product))?.quantity ?? 0) : 0

  const card = (product: Product, icon: string) => {
    const prices = product.variants.map((variant) => variant.price)
    const lowest = Math.min(...prices)
    const price = money(lowest, product.variants[0].currency)
    return (
      <DishCard
        key={product.id}
        name={label(product.name)}
        description={label(product.description)}
        price={prices.length > 1 ? t('from', { price }) : price}
        photo={product.photo}
        icon={icon}
        unavailable={product.sold_out ? t('soldOut') : product.dine_in_only ? t('dineInOnly') : undefined}
        quantity={quantityOf(product)}
        onAdd={() =>
          simple(product)
            ? cart.add({ kind: 'product', productId: product.id, variantId: product.variants[0].id, optionIds: [], quantity: 1 })
            : setDish(product)
        }
        onRemove={() => cart.setQuantity(simpleKey(product), quantityOf(product) - 1)}
      />
    )
  }

  return (
    <div className="min-h-svh bg-ground bg-cover bg-fixed bg-center md:p-4" style={{ backgroundImage: `url(${zaruma})` }}>
      <div className="mx-auto max-w-7xl overflow-hidden bg-background md:rounded-3xl">
        <header className="flex items-center gap-4 p-4">
          <h1 className="font-heading leading-none font-bold uppercase text-brand">
            <span className="block text-xl">{schedule.profile.name.split(' ').slice(0, -1).join(' ')}</span>
            <span className="block text-5xl">{schedule.profile.name.split(' ').at(-1)}</span>
          </h1>
          <div className="hidden min-w-0 sm:block">
            <p className="font-semibold">{t('tagline')}</p>
            {schedule.profile.address && <p className="text-sm text-muted-foreground">{schedule.profile.address}</p>}
          </div>
          {latest && (
            <Link className={buttonVariants({ variant: 'secondary', className: 'ml-auto' })} to={`/pedido/${latest.tracking_token}`}>
              {t('orderNumber', { id: latest.id })}
            </Link>
          )}
          <Button variant="secondary" className={latest ? undefined : 'ml-auto'} aria-label={t('info')} onClick={() => setInfo(true)}>
            <Info aria-hidden />
            <span className="hidden sm:inline">{t('info')}</span>
          </Button>
        </header>

        <StatusBanner schedule={schedule} />

        <nav className="flex gap-2 overflow-x-auto p-4" aria-label={t('sections')}>
          {tabs.map((id) => {
            const category = menu.categories.find((candidate) => candidate.id === id)
            return (
              <Button
                key={id}
                variant={id === current && !query ? 'default' : 'secondary'}
                aria-pressed={id === current && !query}
                className="shrink-0 font-heading text-base font-bold uppercase"
                onClick={() => {
                  setSearch('')
                  setTab(id)
                }}
              >
                <DynamicIcon name={(category?.icon ?? 'soup') as SectionIcon} aria-hidden />
                {category ? label(category.name) : t('lunchTab')}
              </Button>
            )
          })}
        </nav>

        <div className="lg:grid lg:grid-cols-[1fr_24rem]">
          <main className="grid content-start gap-4 p-4 pb-24 lg:pb-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-heading text-5xl font-bold uppercase text-brand">
                  {query ? t('searchResults') : section ? label(section.name) : t('lunchTab')}
                </h2>
                {!query && section?.description && <p className="text-muted-foreground">{label(section.description)}</p>}
              </div>
              <label className="relative w-full sm:w-72">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input type="search" className="pl-9" placeholder={t('search')} aria-label={t('search')} value={search} onChange={(event) => setSearch(event.target.value)} />
              </label>
            </div>

            {query ? (
              found.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">{found.map(({ product, icon }) => card(product, icon))}</div>
              ) : (
                <p className="text-muted-foreground">{t('noResults')}</p>
              )
            ) : section ? (
              <div className="grid gap-3 md:grid-cols-2">{section.products.map((product) => card(product, section.icon))}</div>
            ) : (
              <LunchSection menu={menu} schedule={schedule} />
            )}
          </main>

          <aside className="hidden bg-card p-4 lg:block">
            <div className="sticky top-4">
              <OrderPanel menu={menu} schedule={schedule} />
            </div>
          </aside>
        </div>
      </div>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 p-3 lg:hidden">
          <Button size="lg" className="h-14 w-full justify-between text-base" onClick={() => setOrderOpen(true)}>
            <span className="flex items-center gap-2">
              <ShoppingBag aria-hidden />
              {t('seeOrder')} · {count}
            </span>
            <span>{money(order.total, order.currency)}</span>
          </Button>
        </div>
      )}

      {dish && <DishDialog product={dish} onClose={() => setDish(undefined)} />}
      {info && <StoreInfoDialog schedule={schedule} onClose={() => setInfo(false)} />}
      {orderOpen && (
        <Dialog open onOpenChange={setOrderOpen}>
          <DialogContent className="max-h-svh overflow-y-auto bg-card">
            <DialogTitle className="sr-only">{t('order')}</DialogTitle>
            <OrderPanel menu={menu} schedule={schedule} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function StatusBanner({ schedule }: { schedule: Schedule }) {
  const { t } = useTranslation('site')
  const { status, wait_minutes, reason, until_at } = schedule.status
  const message =
    status === 'open'
      ? t('status.open')
      : status === 'delayed'
        ? wait_minutes
          ? t('status.delayed', { count: wait_minutes })
          : t('status.delayedNoTime')
        : until_at
          ? t('status.closedUntil', { until: new Date(until_at) })
          : t('status.closed')

  return (
    <p className={cn('flex items-center gap-3 px-4 py-3 font-semibold', status === 'open' ? 'bg-secondary' : 'bg-primary text-primary-foreground')} role="status">
      <Clock className="size-5 shrink-0" aria-hidden />
      <span>
        {message} {reason}
      </span>
    </p>
  )
}
