import { UtensilsCrossed } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function Home() {
  const { t } = useTranslation()
  return (
    <main className="grid min-h-svh place-items-center bg-ground p-4">
      <section className="grid justify-items-center gap-4 rounded-3xl bg-background p-8 text-center">
        <UtensilsCrossed className="size-8 text-primary" aria-hidden />
        <h1 className="font-heading text-6xl font-bold uppercase">{t('brand')}</h1>
        <p className="text-muted-foreground">{t('comingSoon')}</p>
      </section>
    </main>
  )
}
