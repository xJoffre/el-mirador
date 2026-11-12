import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { Schedule } from '@/shared/api/client'
import { clock, weekdayName } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'

const WEEK = [1, 2, 3, 4, 5, 6, 7]

export function StoreInfoDialog({ schedule, onClose }: { schedule: Schedule; onClose: () => void }) {
  const { t } = useTranslation(['site', 'privacy'])
  const { profile, week } = schedule
  const todayIndex = (new Date(`${schedule.date}T12:00`).getDay() + 6) % 7 + 1

  const fact = (title: string, text: string | null) =>
    text && (
      <div className="grid gap-1">
        <dt className="font-heading text-lg font-bold uppercase">{title}</dt>
        <dd className="whitespace-pre-line text-muted-foreground">{text}</dd>
      </div>
    )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-svh overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-3xl font-bold uppercase text-brand">{profile.name}</DialogTitle>
        </DialogHeader>
        <dl className="grid gap-4">
          {fact(t('address'), profile.address)}
          {profile.whatsapp && (
            <div className="grid gap-1">
              <dt className="font-heading text-lg font-bold uppercase">{t('whatsapp')}</dt>
              <dd>
                <a className="text-accent-foreground underline" href={`https://wa.me/${profile.whatsapp}`} target="_blank" rel="noreferrer">
                  +{profile.whatsapp}
                </a>
              </dd>
            </div>
          )}
          <div className="grid gap-1">
            <dt className="font-heading text-lg font-bold uppercase">{t('hours')}</dt>
            <dd>
              <ul className="grid gap-1">
                {WEEK.map((day) => {
                  const hours = day === todayIndex ? schedule.today : week[String(day)]
                  return (
                    <li key={day} className={cn('flex justify-between gap-4 text-sm', day === todayIndex && 'font-semibold')}>
                      <span className="capitalize">{day === todayIndex ? t('today') : weekdayName(day)}</span>
                      <span className="text-right text-muted-foreground">
                        {hours?.opens_at ? `${clock(hours.opens_at)} – ${clock(hours.closes_at)}` : t('closedDay')}
                        {hours?.lunch_starts_at && (
                          <span className="block text-xs">{t('lunch', { from: clock(hours.lunch_starts_at), to: clock(hours.lunch_ends_at) })}</span>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </dd>
          </div>
          {fact(t('transfers'), profile.bank_account)}
          {fact(t('delivery'), profile.delivery_note)}
        </dl>
        <p className="text-xs text-muted-foreground">
          {`${t('photoCredit')} `}
          <Link className="underline" to="/privacidad">
            {t('privacy:title')}
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  )
}
