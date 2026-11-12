import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { DynamicIcon } from 'lucide-react/dynamic'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useSaved } from '@/features/panel/useSaved'
import { ProductDialog } from '@/features/catalog/ProductDialog'
import { moved, SECTION_ICONS, useRefreshCatalog, type SectionIcon } from '@/features/catalog/catalog'
import {
  getGetCatalogQueryKey,
  getGetMenuQueryKey,
  useCreateCategory,
  useDeleteCategory,
  useGetCatalog,
  useGetMenu,
  useOrderCategories,
  useOrderProducts,
  useUpdateCategory,
  type CatalogCategory,
  type CatalogProduct,
  type CategoryForm,
} from '@/shared/api/client'
import { UpdateCategoryBody } from '@/shared/api/schemas'
import { money, useLabel } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

export function CatalogPage() {
  const catalog = useGetCatalog()
  const [selectedId, setSelectedId] = useState<number>()
  const categories = catalog.data ?? []
  const selected = categories.find((category) => category.id === selectedId) ?? categories[0]

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[16rem_1fr]">
      <SectionList categories={categories} selected={selected} onSelect={setSelectedId} />
      {selected && <Section key={selected.id} category={selected} />}
    </div>
  )
}

function SectionList({ categories, selected, onSelect }: { categories: CatalogCategory[]; selected?: CatalogCategory; onSelect: (id: number) => void }) {
  const { t } = useTranslation(['catalog', 'panel'])
  const label = useLabel()
  const refresh = useRefreshCatalog()
  const [name, setName] = useState('')
  const create = useCreateCategory({
    mutation: {
      onSuccess: ({ id }) => {
        setName('')
        onSelect(id)
        return refresh()
      },
    },
  })

  return (
    <nav className="grid gap-1 rounded-xl bg-card p-2">
      <div className="flex gap-1 overflow-x-auto lg:grid">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={category.id === selected?.id ? 'default' : 'ghost'}
            className="shrink-0 justify-start"
            onClick={() => onSelect(category.id)}
          >
            <DynamicIcon name={category.icon as SectionIcon} aria-hidden />
            {label(category.name)}
          </Button>
        ))}
      </div>
      <form
        className="mt-2 flex gap-1"
        onSubmit={(event) => {
          event.preventDefault()
          if (name.trim()) create.mutate({ data: { name: { es: name.trim() }, description: null, icon: 'utensils' } })
        }}
      >
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t('newSection')} aria-label={t('newSection')} />
        <Button type="submit" size="icon" aria-label={t('addSection')} disabled={create.isPending}>
          <Plus aria-hidden />
        </Button>
      </form>
    </nav>
  )
}

function Section({ category }: { category: CatalogCategory }) {
  const { t } = useTranslation(['catalog', 'panel'])
  const label = useLabel()
  const refresh = useRefreshCatalog()
  const catalog = useGetCatalog()
  const menu = useGetMenu()
  const soldOut = new Set(menu.data?.categories.flatMap((section) => section.products).filter((product) => product.sold_out).map((product) => product.id))
  const ids = catalog.data?.map((section) => section.id) ?? []
  const position = ids.indexOf(category.id)
  const [editing, setEditing] = useState<CatalogProduct | 'new'>()
  const reorder = useOrderCategories({ mutation: { onSuccess: refresh } })
  const reorderProducts = useOrderProducts({ mutation: { onSuccess: refresh } })
  const remove = useDeleteCategory({ mutation: { onSuccess: refresh } })
  const productIds = category.products.map((product) => product.id)

  return (
    <section className="grid gap-4">
      <div className="grid gap-4 rounded-xl bg-card p-4">
        <SectionForm category={category} />
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" disabled={position <= 0} onClick={() => reorder.mutate({ data: { ids: moved(ids, position, -1) } })}>
            <ArrowUp aria-hidden />
            {t('panel:moveUp')}
          </Button>
          <Button variant="ghost" disabled={position >= ids.length - 1} onClick={() => reorder.mutate({ data: { ids: moved(ids, position, 1) } })}>
            <ArrowDown aria-hidden />
            {t('panel:moveDown')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => window.confirm(t('deleteSectionConfirm', { name: label(category.name) })) && remove.mutate({ id: category.id })}
          >
            <Trash2 aria-hidden />
            {t('deleteSection')}
          </Button>
          <Button className="ml-auto" onClick={() => setEditing('new')}>
            <Plus aria-hidden />
            {t('newDish')}
          </Button>
        </div>
      </div>

      {category.products.length === 0 && <p className="text-muted-foreground">{t('empty')}</p>}
      <ul className="grid gap-2">
        {category.products.map((product, index) => (
          <li key={product.id} className="flex items-center gap-3 rounded-xl bg-card p-2">
            {product.photo ? (
              <img src={product.photo} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="grid size-16 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                <DynamicIcon name={category.icon as SectionIcon} aria-hidden />
              </span>
            )}
            <div className="grid min-w-0 flex-1 gap-1">
              <p className={cn('truncate font-medium', product.hidden && 'text-muted-foreground line-through')}>{label(product.name)}</p>
              <p className="text-sm text-muted-foreground">
                {product.variants.map((variant) => [label(variant.name), money(variant.price, variant.currency)].filter(Boolean).join(' ')).join(' · ')}
              </p>
              <div className="flex flex-wrap gap-1">
                {product.hidden && <Badge variant="secondary">{t('badges.hidden')}</Badge>}
                {soldOut.has(product.id) && <Badge variant="destructive">{t('badges.soldOut')}</Badge>}
                {product.dine_in_only && <Badge variant="outline">{t('badges.dineInOnly')}</Badge>}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('panel:moveUp')}
              disabled={index === 0}
              onClick={() => reorderProducts.mutate({ id: category.id, data: { ids: moved(productIds, index, -1) } })}
            >
              <ArrowUp aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('panel:moveDown')}
              disabled={index === productIds.length - 1}
              onClick={() => reorderProducts.mutate({ id: category.id, data: { ids: moved(productIds, index, 1) } })}
            >
              <ArrowDown aria-hidden />
            </Button>
            <Button variant="secondary" aria-label={t('edit')} onClick={() => setEditing(product)}>
              <Pencil aria-hidden />
              <span className="hidden sm:inline">{t('edit')}</span>
            </Button>
          </li>
        ))}
      </ul>

      {editing && (
        <ProductDialog
          category={category}
          product={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(undefined)}
        />
      )}
    </section>
  )
}

function SectionForm({ category }: { category: CatalogCategory }) {
  const { t } = useTranslation(['catalog', 'panel'])
  const form = useForm<CategoryForm>({
    resolver: zodResolver(UpdateCategoryBody),
    defaultValues: { name: category.name, description: category.description ?? { es: '' }, icon: category.icon },
  })
  const update = useUpdateCategory(useSaved([getGetCatalogQueryKey(), getGetMenuQueryKey()]))

  return (
    <form
      className="grid items-end gap-3 sm:grid-cols-2 2xl:grid-cols-[1fr_1fr_12rem_auto]"
      onSubmit={form.handleSubmit((data) =>
        update.mutate({ id: category.id, data: { ...data, description: data.description?.es?.trim() ? data.description : null } }),
      )}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="section-name">{t('sectionName')}</Label>
        <Input id="section-name" required {...form.register('name.es')} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="section-phrase">{t('sectionPhrase')}</Label>
        <Input id="section-phrase" {...form.register('description.es')} />
      </div>
      <Controller
        control={form.control}
        name="icon"
        render={({ field }) => (
          <div className="grid gap-1.5">
            <Label>{t('sectionIcon')}</Label>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger aria-label={t('sectionIcon')}>
                <SelectValue>
                  <DynamicIcon name={field.value as SectionIcon} aria-hidden />
                  {t(`icons.${field.value as SectionIcon}`)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SECTION_ICONS.map((icon) => (
                  <SelectItem key={icon} value={icon}>
                    <DynamicIcon name={icon} aria-hidden />
                    {t(`icons.${icon}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      />
      <Button type="submit" disabled={update.isPending}>
        {t('panel:save')}
      </Button>
    </form>
  )
}
