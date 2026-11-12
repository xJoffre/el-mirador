import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useSaved } from '@/features/panel/useSaved'
import { getGetScheduleQueryKey, useGetSchedule, useSaveProfile, useSaveWeek, type Hours, type StoreProfile } from '@/shared/api/client'
import { SaveProfileBody } from '@/shared/api/schemas'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Switch } from '@/shared/ui/switch'
import { Textarea } from '@/shared/ui/textarea'

const WEEKDAYS = ['1', '2', '3', '4', '5', '6', '7'] as const
const CLOSED: Hours = { opens_at: null, closes_at: null, lunch_starts_at: null, lunch_ends_at: null }
const emptyIsNull = { setValueAs: (value: string) => (value === '' ? null : value) }
const minutes = (time: string | null) => time?.slice(0, 5) ?? ''

export function StorePage() {
  const schedule = useGetSchedule()
  if (!schedule.data) return null
  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <ProfileForm profile={schedule.data.profile} />
      <WeekForm week={schedule.data.week} />
    </div>
  )
}

function ProfileForm({ profile }: { profile: StoreProfile }) {
  const { t } = useTranslation(['store', 'panel'])
  const save = useSaveProfile(useSaved([getGetScheduleQueryKey()]))
  const form = useForm<StoreProfile>({ resolver: zodResolver(SaveProfileBody), defaultValues: profile })
  const field = (name: keyof StoreProfile, text: string, hint?: string) => (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{text}</Label>
      {name === 'delivery_note' ? (
        <Textarea id={name} {...form.register(name, emptyIsNull)} />
      ) : (
        <Input id={name} inputMode={name === 'whatsapp' ? 'numeric' : undefined} {...form.register(name, emptyIsNull)} aria-invalid={!!form.formState.errors[name]} />
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )

  return (
    <form className="grid content-start gap-4 rounded-xl bg-card p-4" onSubmit={form.handleSubmit((data) => save.mutate({ data }))}>
      <div>
        <h2 className="font-heading text-2xl font-bold uppercase">{t('details')}</h2>
        <p className="text-sm text-muted-foreground">{t('detailsHint')}</p>
      </div>
      {field('name', t('name'))}
      {field('whatsapp', t('whatsapp'), t('whatsappHint'))}
      {field('address', t('address'))}
      {field('bank_account', t('bankAccount'))}
      {field('delivery_note', t('deliveryNote'))}
      <Button type="submit" disabled={save.isPending} className="justify-self-start">
        {t('panel:save')}
      </Button>
    </form>
  )
}

function WeekForm({ week }: { week: Record<string, Hours> }) {
  const { t } = useTranslation(['store', 'panel'])
  const save = useSaveWeek(useSaved([getGetScheduleQueryKey()]))
  const [days, setDays] = useState(() => Object.fromEntries(WEEKDAYS.map((day) => [day, week[day] ?? CLOSED])))
  const change = (day: string, hours: Partial<Hours>) => setDays((current) => ({ ...current, [day]: { ...current[day], ...hours } }))
  const firstOpen = () => Object.values(days).find((hours) => hours.opens_at) ?? CLOSED
  const time = (day: string, key: keyof Hours, text: string) => (
    <Input
      type="time"
      aria-label={`${t(`weekdays.${day as '1'}`)} ${text}`}
      value={minutes(days[day][key])}
      disabled={!days[day].opens_at && key !== 'opens_at'}
      onChange={(event) => change(day, { [key]: event.target.value || null })}
    />
  )

  return (
    <form
      className="grid content-start gap-4 rounded-xl bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate({ data: Object.fromEntries(Object.entries(days).filter(([, hours]) => hours.opens_at)) })
      }}
    >
      <div>
        <h2 className="font-heading text-2xl font-bold uppercase">{t('week')}</h2>
        <p className="text-sm text-muted-foreground">{t('weekHint')}</p>
      </div>
      <div className="grid gap-3">
        {WEEKDAYS.map((day) => (
          <fieldset key={day} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[8rem_auto_1fr_1fr_1fr_1fr]">
            <legend className="sr-only">{t(`weekdays.${day}`)}</legend>
            <span className="font-medium">{t(`weekdays.${day}`)}</span>
            <Switch
              checked={!!days[day].opens_at}
              aria-label={t('open')}
              onCheckedChange={(open) => change(day, open ? firstOpen() : CLOSED)}
            />
            {days[day].opens_at || days[day].closes_at ? (
              <>
                {time(day, 'opens_at', t('from'))}
                {time(day, 'closes_at', t('to'))}
                {time(day, 'lunch_starts_at', t('lunchFrom'))}
                {time(day, 'lunch_ends_at', t('lunchTo'))}
              </>
            ) : (
              <span className="col-span-2 text-muted-foreground sm:col-span-4">{t('closed')}</span>
            )}
          </fieldset>
        ))}
      </div>
      <Button type="submit" disabled={save.isPending} className="justify-self-start">
        {t('panel:save')}
      </Button>
    </form>
  )
}
