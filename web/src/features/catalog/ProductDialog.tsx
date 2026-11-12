import { zodResolver } from '@hookform/resolvers/zod'
import { ImageUp, Plus, Trash2, X } from 'lucide-react'
import { DynamicIcon } from 'lucide-react/dynamic'
import { Controller, useFieldArray, useForm, type Control, type UseFormRegister } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useSaved } from '@/features/panel/useSaved'
import { shrinkPhoto, useRefreshCatalog, type SectionIcon } from '@/features/catalog/catalog'
import {
  getGetCatalogQueryKey,
  getGetMenuQueryKey,
  useCreateProduct,
  useDeleteProduct,
  useGetCatalog,
  useRemovePhoto,
  useReplacePhoto,
  useUpdateProduct,
  type CatalogCategory,
  type CatalogProduct,
  type ProductForm,
} from '@/shared/api/client'
import { CreateProductBody } from '@/shared/api/schemas'
import { useLabel } from '@/shared/lib/format'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Switch } from '@/shared/ui/switch'
import { Textarea } from '@/shared/ui/textarea'

const blank = { es: '' }

const toForm = (categoryId: number, product?: CatalogProduct): ProductForm => ({
  category_id: categoryId,
  name: product?.name ?? blank,
  description: product?.description ?? blank,
  dine_in_only: product?.dine_in_only ?? false,
  hidden: product?.hidden ?? false,
  variants: product?.variants.map(({ id, name, price }) => ({ id, name: name ?? blank, price })) ?? [{ id: null, name: blank, price: 0 }],
  option_groups:
    product?.option_groups.map(({ id, name, min_choices, max_choices, items }) => ({
      id,
      name,
      min_choices,
      max_choices,
      items: items.map((item) => ({ id: item.id, name: item.name, hidden: item.hidden })),
    })) ?? [],
})

const filled = (label: ProductForm['description']) => (label?.es?.trim() ? label : null)

const toRequest = (form: ProductForm): ProductForm => ({
  ...form,
  description: filled(form.description),
  variants: form.variants.map((variant) => ({ ...variant, name: filled(variant.name) })),
  option_groups: form.option_groups.map((group) => ({ ...group, min_choices: group.min_choices === 0 ? 0 : group.max_choices })),
})

type Props = { category: CatalogCategory; product?: CatalogProduct; onClose: () => void }

export function ProductDialog({ category, product, onClose }: Props) {
  const { t } = useTranslation(['catalog', 'panel'])
  const label = useLabel()
  const refresh = useRefreshCatalog()
  const form = useForm<ProductForm>({ resolver: zodResolver(CreateProductBody), defaultValues: toForm(category.id, product) })
  const variants = useFieldArray({ control: form.control, name: 'variants' })
  const groups = useFieldArray({ control: form.control, name: 'option_groups' })
  const done = { mutation: { onSuccess: () => refresh().then(onClose) } }
  const create = useCreateProduct(done)
  const update = useUpdateProduct(done)
  const remove = useDeleteProduct(done)
  const saving = create.isPending || update.isPending

  const submit = form.handleSubmit((data) =>
    product ? update.mutate({ id: product.id, data: toRequest(data) }) : create.mutate({ data: toRequest(data) }),
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-svh overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-3xl font-bold uppercase text-brand">{product ? t('editDish') : t('newDish')}</DialogTitle>
          <DialogDescription>{t('inSection', { name: label(category.name) })}</DialogDescription>
        </DialogHeader>

        <form id="product" className="grid gap-6" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="grid content-start gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="product-name">{t('name')}</Label>
                <Input id="product-name" required {...form.register('name.es')} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="product-description">{t('description')}</Label>
                <Textarea id="product-description" {...form.register('description.es')} />
              </div>
            </div>
            {product && <PhotoField productId={product.id} icon={category.icon as SectionIcon} />}
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-2 font-heading text-xl font-bold uppercase">{t('prices')}</legend>
            {variants.fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <Input aria-label={t('priceName')} placeholder={t('priceName')} {...form.register(`variants.${index}.name.es`)} />
                <Input
                  aria-label={t('price')}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  className="w-28"
                  aria-invalid={!!form.formState.errors.variants?.[index]?.price}
                  {...form.register(`variants.${index}.price`, { valueAsNumber: true })}
                />
                <Button type="button" variant="ghost" size="icon" aria-label={t('removePrice')} disabled={variants.fields.length === 1} onClick={() => variants.remove(index)}>
                  <X aria-hidden />
                </Button>
              </div>
            ))}
            <Button type="button" variant="secondary" className="justify-self-start" onClick={() => variants.append({ id: null, name: blank, price: 0 })}>
              <Plus aria-hidden />
              {t('addPrice')}
            </Button>
          </fieldset>

          <fieldset className="grid gap-3">
            <legend className="mb-1 font-heading text-xl font-bold uppercase">{t('choices')}</legend>
            <p className="text-sm text-muted-foreground">{t('choicesHint')}</p>
            {groups.fields.map((field, index) => (
              <div key={field.id} className="grid gap-3 rounded-xl bg-card p-3">
                <div className="grid items-end gap-2 sm:grid-cols-[1fr_7rem_auto_auto]">
                  <div className="grid gap-1.5">
                    <Label htmlFor={`group-${index}`}>{t('choiceName')}</Label>
                    <Input id={`group-${index}`} required {...form.register(`option_groups.${index}.name.es`)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={`group-count-${index}`}>{t('choiceCount')}</Label>
                    <Input id={`group-count-${index}`} type="number" min={1} {...form.register(`option_groups.${index}.max_choices`, { valueAsNumber: true })} />
                  </div>
                  <Controller
                    control={form.control}
                    name={`option_groups.${index}.min_choices`}
                    render={({ field: min }) => (
                      <div className="flex items-center gap-2 pb-2">
                        <Switch id={`group-optional-${index}`} checked={min.value === 0} onCheckedChange={(optional) => min.onChange(optional ? 0 : 1)} />
                        <Label htmlFor={`group-optional-${index}`}>{t('optional')}</Label>
                      </div>
                    )}
                  />
                  <Button type="button" variant="ghost" size="icon" aria-label={t('removeChoice')} onClick={() => groups.remove(index)}>
                    <Trash2 aria-hidden />
                  </Button>
                </div>
                <ChoiceItems control={form.control} register={form.register} group={index} />
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              className="justify-self-start"
              onClick={() => groups.append({ id: null, name: blank, min_choices: 1, max_choices: 1, items: [{ id: null, name: blank, hidden: false }] })}
            >
              <Plus aria-hidden />
              {t('addChoice')}
            </Button>
          </fieldset>

          <fieldset className="grid gap-3">
            <legend className="mb-1 font-heading text-xl font-bold uppercase">{t('whereSold')}</legend>
            {(['dine_in_only', 'hidden'] as const).map((name) => (
              <Controller
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Switch id={name} checked={field.value} onCheckedChange={field.onChange} />
                    <Label htmlFor={name}>{name === 'hidden' ? t('hidden') : t('dineInOnly')}</Label>
                  </div>
                )}
              />
            ))}
          </fieldset>
        </form>

        <DialogFooter className="gap-2">
          {product && (
            <Button
              variant="destructive"
              className="sm:mr-auto"
              onClick={() => window.confirm(t('deleteDishConfirm', { name: label(product.name) })) && remove.mutate({ id: product.id })}
            >
              <Trash2 aria-hidden />
              {t('deleteDish')}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            {t('panel:cancel')}
          </Button>
          <Button type="submit" form="product" disabled={saving}>
            {t('panel:save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ChoiceItems({ control, register, group }: { control: Control<ProductForm>; register: UseFormRegister<ProductForm>; group: number }) {
  const { t } = useTranslation(['catalog', 'panel'])
  const items = useFieldArray({ control, name: `option_groups.${group}.items` })
  return (
    <div className="grid gap-2 pl-2">
      {items.fields.map((field, index) => (
        <div key={field.id} className="flex items-center gap-2">
          <Input aria-label={t('option')} placeholder={t('option')} required {...register(`option_groups.${group}.items.${index}.name.es`)} />
          <Controller
            control={control}
            name={`option_groups.${group}.items.${index}.hidden`}
            render={({ field: hidden }) => (
              <div className="flex shrink-0 items-center gap-2">
                <Switch id={`item-${group}-${index}`} size="sm" checked={hidden.value} onCheckedChange={hidden.onChange} />
                <Label htmlFor={`item-${group}-${index}`} className="text-sm">
                  {t('hiddenOption')}
                </Label>
              </div>
            )}
          />
          <Button type="button" variant="ghost" size="icon" aria-label={t('removeOption')} disabled={items.fields.length === 1} onClick={() => items.remove(index)}>
            <X aria-hidden />
          </Button>
        </div>
      ))}
      <Button type="button" variant="ghost" className="justify-self-start" onClick={() => items.append({ id: null, name: blank, hidden: false })}>
        <Plus aria-hidden />
        {t('addOption')}
      </Button>
    </div>
  )
}

function PhotoField({ productId, icon }: { productId: number; icon: SectionIcon }) {
  const { t } = useTranslation(['catalog', 'panel'])
  const catalog = useGetCatalog()
  const photo = catalog.data?.flatMap((section) => section.products).find((product) => product.id === productId)?.photo
  const saved = useSaved([getGetCatalogQueryKey(), getGetMenuQueryKey()])
  const replace = useReplacePhoto(saved)
  const remove = useRemovePhoto(saved)

  return (
    <div className="grid content-start justify-items-start gap-2">
      <Label>{t('photo')}</Label>
      {photo ? (
        <img src={photo} alt="" className="size-36 rounded-xl object-cover" />
      ) : (
        <span className="grid size-36 place-items-center rounded-xl bg-accent text-accent-foreground">
          <DynamicIcon name={icon} className="size-10" aria-hidden />
        </span>
      )}
      <div className="flex gap-2">
        <Button variant="secondary" disabled={replace.isPending} nativeButton={false} render={<label />}>
          <ImageUp aria-hidden />
          {photo ? t('changePhoto') : t('addPhoto')}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (file) replace.mutate({ id: productId, data: { file: await shrinkPhoto(file) } })
              event.target.value = ''
            }}
          />
        </Button>
        {photo && (
          <Button variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate({ id: productId })}>
            {t('removePhoto')}
          </Button>
        )}
      </div>
    </div>
  )
}
