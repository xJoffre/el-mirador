import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSaved } from '@/features/panel/useSaved'
import { getGetScheduleQueryKey, StatusStatus, useChangeToday, useGetSchedule, useKeepTodayAsUsual, useSetStatus, type Hours, type Schedule } from '@/shared/api/client'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

const STATUSES = Object.values(StatusStatus)
const HOURS: (keyof Hours)[] = ['opens_at', 'closes_at', 'lunch_starts_at', 'lunch_ends_at']
const minutes = (time: string | null) => time?.slice(0, 5) ?? ''

export function TodayPage() {
  const schedule = useGetSchedule()
  if (!schedule.data) return null
  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <StatusForm schedule={schedule.data} />
      <TodayForm key={JSON.stringify(schedule.data.today)} schedule={schedule.data} />
    </div>
  )
}

function StatusForm({ schedule }: { schedule: Schedule }) {
  const { t } = useTranslation(['today', 'panel'])
  const save = useSetStatus(useSaved([getGetScheduleQueryKey()]))
  const [status, setStatus] = useState<StatusStatus>(schedule.status.status)
  const [wait, setWait] = useState(schedule.status.wait_minutes?.toString() ?? '')
  const [reason, setReason] = useState('')
  const [until, setUntil] = useState('')
  const current = schedule.status

  return (
    <form
      className="grid content-start gap-4 rounded-xl bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate({
          data: {
            status,
            wait_minutes: status === 'delayed' && wait ? Number(wait) : null,
            reason: reason.trim() || null,
            until_at: until ? new Date(`${schedule.date}T${until}`).toISOString() : null,
          },
        })
      }}
    >
      <h2 className="font-heading text-2xl font-bold uppercase">{t('status')}</h2>
      <p className={cn('rounded-lg p-3 font-semibold', current.status === 'open' ? 'bg-background' : 'bg-primary text-primary-foreground')} role="status">
        {[
          t('now', { status: t(`statuses.${current.status}`) }),
          current.wait_minutes && t('wait', { count: current.wait_minutes }),
          current.until_at && t('untilTime', { until: new Date(current.until_at) }),
          current.reason,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('status')}>
        {STATUSES.map((option) => (
          <Button key={option} type="button" role="radio" aria-checked={status === option} variant={status === option ? 'default' : 'secondary'} onClick={() => setStatus(option)}>
            {t(`statuses.${option}`)}
          </Button>
        ))}
      </div>
      {status === 'delayed' && (
        <div className="grid gap-1.5">
          <Label htmlFor="wait">{t('waitMinutes')}</Label>
          <Input id="wait" type="number" min={1} inputMode="numeric" value={wait} onChange={(event) => setWait(event.target.value)} />
        </div>
      )}
      {status !== 'open' && (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor="reason">{t('reason')}</Label>
            <Input id="reason" value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="until">{t('until')}</Label>
            <Input id="until" type="time" value={until} onChange={(event) => setUntil(event.target.value)} />
            <p className="text-xs text-muted-foreground">{t('untilHint')}</p>
          </div>
        </>
      )}
      <Button type="submit" disabled={save.isPending} className="justify-self-start">
        {t('apply')}
      </Button>
    </form>
  )
}

function TodayForm({ schedule }: { schedule: Schedule }) {
  const { t } = useTranslation(['today', 'panel'])
  const saved = useSaved([getGetScheduleQueryKey()])
  const change = useChangeToday(saved)
  const usual = useKeepTodayAsUsual(saved)
  const [hours, setHours] = useState(schedule.today)
  const labels = { opens_at: t('opens'), closes_at: t('closes'), lunch_starts_at: t('lunchFrom'), lunch_ends_at: t('lunchTo') }

  return (
    <form
      className="grid content-start gap-4 rounded-xl bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault()
        change.mutate({ data: hours })
      }}
    >
      <div>
        <h2 className="font-heading text-2xl font-bold uppercase">{t('hoursToday')}</h2>
        <p className="text-sm text-muted-foreground">{t('hoursTodayHint')}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {HOURS.map((key) => (
          <div key={key} className="grid gap-1.5">
            <Label htmlFor={key}>{labels[key]}</Label>
            <Input id={key} type="time" value={minutes(hours[key])} onChange={(event) => setHours({ ...hours, [key]: event.target.value || null })} />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={change.isPending}>
          {t('saveToday')}
        </Button>
        <Button type="button" variant="secondary" disabled={usual.isPending} onClick={() => usual.mutate()}>
          {t('keepUsual')}
        </Button>
      </div>
    </form>
  )
}
