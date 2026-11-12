import { useQueryClient } from '@tanstack/react-query'
import { Bike, ShoppingBag, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getGetKitchenQueryKey, useFinishRound, useGetKitchen, useStartRound } from '@/shared/api/client'
import { useLineText } from '@/shared/lib/lines'
import { SAFETY_REFRESH } from '@/shared/lib/live'
import { minutesSince, useNow } from '@/shared/lib/now'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'

const BEEP = { frequency: 880, seconds: 0.18, gap: 0.25, times: 2 }

function beep(audio: AudioContext) {
  for (let index = 0; index < BEEP.times; index++) {
    const start = audio.currentTime + index * BEEP.gap
    const tone = audio.createOscillator()
    tone.frequency.value = BEEP.frequency
    tone.connect(audio.destination)
    tone.start(start)
    tone.stop(start + BEEP.seconds)
  }
}

export function KitchenPage() {
  const { t } = useTranslation(['kitchen', 'orders'])
  const tickets = useGetKitchen(SAFETY_REFRESH)
  const lineText = useLineText()
  const now = useNow()
  const queries = useQueryClient()
  const refresh = { mutation: { onSuccess: () => queries.invalidateQueries({ queryKey: getGetKitchenQueryKey() }) } }
  const start = useStartRound(refresh)
  const finish = useFinishRound(refresh)
  const [audio, setAudio] = useState<AudioContext>()
  const seen = useRef<Set<number>>(undefined)

  useEffect(() => {
    let lock: WakeLockSentinel | undefined
    let leaving = false
    const keepAwake = async () => {
      if (document.visibilityState !== 'visible') return
      lock = await navigator.wakeLock?.request('screen').catch(() => undefined)
      if (leaving) lock?.release()
    }
    keepAwake()
    document.addEventListener('visibilitychange', keepAwake)
    return () => {
      leaving = true
      document.removeEventListener('visibilitychange', keepAwake)
      lock?.release()
    }
  }, [])

  useEffect(() => {
    if (!tickets.data) return
    const ids = tickets.data.map((ticket) => ticket.round_id)
    if (seen.current && audio && ids.some((id) => !seen.current!.has(id))) beep(audio)
    seen.current = new Set(ids)
  }, [tickets.data, audio])

  return (
    <div className="dark grid gap-4 rounded-2xl bg-background p-4 text-foreground">
      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground">{tickets.data?.length === 0 ? t('empty') : ''}</p>
        <Button variant={audio ? 'secondary' : 'default'} disabled={!!audio} onClick={() => setAudio(new AudioContext())}>
          <Volume2 aria-hidden />
          {audio ? t('soundOn') : t('enableSound')}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tickets.data?.map((ticket) => (
          <article key={ticket.round_id} className={cn('grid content-start gap-3 rounded-xl p-4', ticket.started_at ? 'bg-card ring-2 ring-primary' : 'bg-card')}>
            <header className="flex items-center gap-2">
              <span className="font-heading text-4xl font-bold">#{ticket.order_id}</span>
              {ticket.delivery_address ? <Bike aria-label={t('orders:delivery')} /> : <ShoppingBag aria-label={t('orders:pickup')} />}
              <span className="ml-auto text-sm text-muted-foreground">{t('orders:minutesAgo', { count: minutesSince(ticket.created_at, now) })}</span>
            </header>
            <p className="text-sm text-muted-foreground">{ticket.customer_name}</p>
            <ul className="grid gap-2 text-lg">
              {ticket.lines.map((line) => {
                const { name, details } = lineText(line)
                return (
                  <li key={line.id}>
                    <span className="font-semibold">{`${line.quantity} × ${name}`}</span>
                    {details && <span className="block text-base text-muted-foreground">{details}</span>}
                    {line.note && <span className="block text-base italic">{t('note', { note: line.note })}</span>}
                  </li>
                )
              })}
            </ul>
            {ticket.note && <p className="italic">{t('note', { note: ticket.note })}</p>}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="lg" className="h-12 text-base" disabled={!!ticket.started_at || start.isPending} onClick={() => start.mutate({ id: ticket.round_id })}>
                {ticket.started_at ? t('started') : t('start')}
              </Button>
              <Button size="lg" className="h-12 text-base" disabled={finish.isPending} onClick={() => finish.mutate({ id: ticket.round_id })}>
                {t('ready')}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
