import { Minus, Plus } from 'lucide-react'
import { DynamicIcon } from 'lucide-react/dynamic'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { SectionIcon } from '@/features/catalog/catalog'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'

type Props = {
  name: string
  description?: string
  details?: ReactNode
  price: string
  photo?: string | null
  icon: string
  unavailable?: string
  quantity?: number
  onAdd?: () => void
  onRemove?: () => void
}

export function DishCard({ name, description, details, price, photo, icon, unavailable, quantity = 0, onAdd, onRemove }: Props) {
  const { t } = useTranslation('site')
  return (
    <article className={cn('flex gap-3 rounded-xl bg-card p-3', unavailable && 'opacity-70')}>
      <div className="grid min-w-0 flex-1 content-start gap-1">
        <h3 className="font-medium">{name}</h3>
        {description && <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>}
        {details}
        {unavailable && <p className="text-sm font-medium text-accent-foreground">{unavailable}</p>}
        <p className="mt-auto pt-2 font-semibold">{price}</p>
      </div>
      <div className="relative size-28 shrink-0">
        {photo ? (
          <img src={photo} alt="" loading="lazy" className="size-full rounded-lg object-cover" />
        ) : (
          <span className="grid size-full place-items-center rounded-lg bg-secondary text-accent-foreground">
            <DynamicIcon name={icon as SectionIcon} className="size-8" aria-hidden />
          </span>
        )}
        {!unavailable && onAdd && (
          <div className="absolute right-0 bottom-0 flex items-center rounded-tl-lg rounded-br-lg bg-primary text-primary-foreground">
            {quantity > 0 && onRemove && (
              <>
                <Button size="icon" className="rounded-none" aria-label={t('less', { name })} onClick={onRemove}>
                  <Minus aria-hidden />
                </Button>
                <span className="min-w-6 text-center font-semibold" aria-live="polite">
                  {quantity}
                </span>
              </>
            )}
            <Button size="icon" className="rounded-none rounded-br-lg" aria-label={quantity > 0 ? t('more', { name }) : t('add', { name })} onClick={onAdd}>
              <Plus aria-hidden />
            </Button>
          </div>
        )}
      </div>
    </article>
  )
}
