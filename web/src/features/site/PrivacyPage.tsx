import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useGetSchedule } from '@/shared/api/client'
import { buttonVariants } from '@/shared/ui/button'

const SECTIONS = ['data', 'purpose', 'sharing', 'retention', 'rights', 'device'] as const

export function PrivacyPage() {
  const { t } = useTranslation(['privacy', 'common', 'site'])
  const profile = useGetSchedule().data?.profile

  return (
    <main className="min-h-svh bg-ground p-4">
      <article className="mx-auto grid max-w-prose gap-4 rounded-3xl bg-background p-6">
        <h1 className="font-heading text-4xl font-bold uppercase text-brand">{t('title')}</h1>
        <p>{t('intro', { name: profile?.name ?? t('common:brand') })}</p>
        {SECTIONS.map((key) => (
          <section key={key} className="grid gap-1">
            <h2 className="font-heading text-2xl font-bold uppercase">{t(`sections.${key}.title`)}</h2>
            <p>{t(`sections.${key}.text`)}</p>
          </section>
        ))}
        {profile?.whatsapp && (
          <p>
            {`${t('contact')} `}
            <a className="text-accent-foreground underline" href={`https://wa.me/${profile.whatsapp}`} target="_blank" rel="noreferrer">
              +{profile.whatsapp}
            </a>
          </p>
        )}
        <Link className={buttonVariants({ className: 'justify-self-start' })} to="/">
          {t('site:backToMenu')}
        </Link>
      </article>
    </main>
  )
}
