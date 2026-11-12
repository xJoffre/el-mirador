import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSaved } from '@/features/panel/useSaved'
import {
  DailyDishKind,
  getGetLunchDishesQueryKey,
  getGetLunchQueryKey,
  getGetMenuQueryKey,
  useCreateLunchDish,
  useGetLunch,
  useGetLunchDishes,
  useGetSchedule,
  usePublishLunch,
  useUnpublishLunch,
  useUpdateLunchDish,
  type LunchDish,
  type LunchPlan,
} from '@/shared/api/client'
import { useLabel } from '@/shared/lib/format'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Switch } from '@/shared/ui/switch'

const KINDS = Object.values(DailyDishKind)

export function LunchPage() {
  const { t } = useTranslation('lunch')
  const schedule = useGetSchedule()
  const [chosen, setChosen] = useState<string>()
  const date = chosen ?? schedule.data?.date
  const dishes = useGetLunchDishes()
  const plan = useGetLunch(date ?? '', { query: { enabled: !!date } })
  if (!date || !dishes.data || !plan.data) return null

  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <div className="grid content-start gap-4">
        <div className="grid max-w-xs gap-1.5">
          <Label htmlFor="lunch-date">{t('date')}</Label>
          <Input id="lunch-date" type="date" value={date} onChange={(event) => setChosen(event.target.value || undefined)} />
        </div>
        <PublishForm key={`${date}:${plan.dataUpdatedAt}`} date={date} dishes={dishes.data} plan={plan.data} />
      </div>
      <DishList dishes={dishes.data} />
    </div>
  )
}

type Row = { included: boolean; alone: string; full: string }

function PublishForm({ date, dishes, plan }: { date: string; dishes: LunchDish[]; plan: LunchPlan }) {
  const { t } = useTranslation(['lunch', 'panel'])
  const label = useLabel()
  const saved = useSaved([getGetLunchQueryKey(date), getGetMenuQueryKey()])
  const publish = usePublishLunch(saved)
  const unpublish = useUnpublishLunch(saved)
  const offered = dishes.filter((dish) => !dish.hidden)
  const [includes, setIncludes] = useState(plan.includes?.es ?? '')
  const [rows, setRows] = useState<Record<number, Row>>(() =>
    Object.fromEntries(
      offered.map((dish) => {
        const published = plan.dishes.find((candidate) => candidate.id === dish.id)
        return [dish.id, { included: !!published, alone: published?.price_alone.toFixed(2) ?? '', full: published?.price_full?.toFixed(2) ?? '' }]
      }),
    ),
  )
  const change = (id: number, row: Partial<Row>) => setRows((current) => ({ ...current, [id]: { ...current[id], ...row } }))

  return (
    <form
      className="grid gap-4 rounded-xl bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault()
        publish.mutate({
          date,
          data: {
            includes: { ...plan.includes, es: includes.trim() },
            dishes: offered
              .filter((dish) => rows[dish.id].included)
              .map((dish) => ({
                lunch_dish_id: dish.id,
                price_alone: Number(rows[dish.id].alone),
                price_full: dish.kind === 'main' ? Number(rows[dish.id].full) : null,
              })),
          },
        })
      }}
    >
      <p className="text-sm font-medium">{plan.dishes.length > 0 ? t('published') : t('notPublished')}</p>
      <div className="grid gap-1.5">
        <Label htmlFor="includes">{t('includes')}</Label>
        <Input id="includes" required placeholder={t('includesHint')} value={includes} onChange={(event) => setIncludes(event.target.value)} />
      </div>
      {KINDS.map((kind) => (
        <fieldset key={kind} className="grid gap-2">
          <legend className="mb-1 font-heading text-xl font-bold uppercase">{kind === 'soup' ? t('soups') : t('mains')}</legend>
          <div className="hidden text-xs text-muted-foreground sm:grid sm:grid-cols-[auto_1fr_7rem_7rem] sm:gap-2" aria-hidden>
            <span className="w-8" />
            <span />
            <span>{t('priceAlone')}</span>
            {kind === 'main' && <span>{t('priceFull')}</span>}
          </div>
          {offered
            .filter((dish) => dish.kind === kind)
            .map((dish) => (
              <div key={dish.id} className="grid grid-cols-[auto_1fr] items-center gap-2 sm:grid-cols-[auto_1fr_7rem_7rem]">
                <Switch id={`in-${dish.id}`} checked={rows[dish.id].included} onCheckedChange={(included) => change(dish.id, { included })} aria-label={t('inMenu')} />
                <Label htmlFor={`in-${dish.id}`}>{label(dish.name)}</Label>
                {rows[dish.id].included && (
                  <>
                    <Input
                      aria-label={`${label(dish.name)} ${t('priceAlone')}`}
                      placeholder={t('priceAlone')}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      required
                      value={rows[dish.id].alone}
                      onChange={(event) => change(dish.id, { alone: event.target.value })}
                    />
                    {dish.kind === 'main' && (
                      <Input
                        aria-label={`${label(dish.name)} ${t('priceFull')}`}
                        placeholder={t('priceFull')}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        required
                        value={rows[dish.id].full}
                        onChange={(event) => change(dish.id, { full: event.target.value })}
                      />
                    )}
                  </>
                )}
              </div>
            ))}
        </fieldset>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={publish.isPending}>
          {t('publish')}
        </Button>
        {plan.dishes.length > 0 && (
          <Button type="button" variant="destructive" onClick={() => window.confirm(t('unpublishConfirm')) && unpublish.mutate({ date })}>
            {t('unpublish')}
          </Button>
        )}
      </div>
    </form>
  )
}

function DishList({ dishes }: { dishes: LunchDish[] }) {
  const { t } = useTranslation(['lunch', 'panel'])
  const saved = useSaved([getGetLunchDishesQueryKey()])
  const create = useCreateLunchDish(saved)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<DailyDishKind>(DailyDishKind.main)

  return (
    <div className="grid content-start gap-4 rounded-xl bg-card p-4">
      <div>
        <h2 className="font-heading text-2xl font-bold uppercase">{t('dishes')}</h2>
        <p className="text-sm text-muted-foreground">{t('dishesHint')}</p>
      </div>
      <ul className="grid gap-2">
        {dishes.map((dish) => (
          <DishRow key={dish.id} dish={dish} />
        ))}
      </ul>
      <form
        className="flex flex-wrap items-end gap-2 rounded-xl border-2 border-dashed p-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (name.trim()) create.mutate({ data: { kind, name: { es: name.trim() }, hidden: false } }, { onSuccess: () => setName('') })
        }}
      >
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor="new-dish">{t('newDish')}</Label>
          <Input id="new-dish" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="flex gap-1" role="radiogroup" aria-label={t('kind')}>
          {KINDS.map((option) => (
            <Button key={option} type="button" role="radio" aria-checked={kind === option} variant={kind === option ? 'default' : 'secondary'} onClick={() => setKind(option)}>
              {option === 'soup' ? t('soups') : t('mains')}
            </Button>
          ))}
        </div>
        <Button type="submit" disabled={create.isPending}>
          {t('add')}
        </Button>
      </form>
    </div>
  )
}

function DishRow({ dish }: { dish: LunchDish }) {
  const { t } = useTranslation(['lunch', 'panel'])
  const update = useUpdateLunchDish(useSaved([getGetLunchDishesQueryKey()]))
  const [name, setName] = useState(dish.name.es ?? '')

  return (
    <li>
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          update.mutate({ id: dish.id, data: { kind: dish.kind, name: { ...dish.name, es: name.trim() }, hidden: dish.hidden } })
        }}
      >
        <span className="w-20 shrink-0 text-xs text-muted-foreground uppercase">{dish.kind === 'soup' ? t('soups') : t('mains')}</span>
        <Input aria-label={t('name')} required value={name} onChange={(event) => setName(event.target.value)} />
        <div className="flex shrink-0 items-center gap-2">
          <Switch
            id={`hidden-${dish.id}`}
            size="sm"
            checked={dish.hidden}
            onCheckedChange={(hidden) => update.mutate({ id: dish.id, data: { kind: dish.kind, name: dish.name, hidden } })}
          />
          <Label htmlFor={`hidden-${dish.id}`} className="text-sm">
            {t('hidden')}
          </Label>
        </div>
        <Button type="submit" variant="secondary" disabled={update.isPending}>
          {t('panel:save')}
        </Button>
      </form>
    </li>
  )
}
