import { useQueryClient } from '@tanstack/react-query'
import { Delete } from 'lucide-react'
import { useEffect, useEffectEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { getGetSessionQueryKey, useGetMembers, useSignIn, type Member } from '@/shared/api/client'
import { SignInBody } from '@/shared/api/schemas'
import { errorText } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
const PIN_LENGTH = SignInBody.shape.pin.maxLength ?? 0

export function SignInPage() {
  const { t } = useTranslation('auth')
  const members = useGetMembers()
  const [member, setMember] = useState<Member>()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const signIn = useSignIn({ mutation: { onError: (failure) => setError(errorText(failure)) } })
  const queries = useQueryClient()
  const navigate = useNavigate()

  const press = (digit: string) => {
    if (!member || signIn.isPending) return
    const typed = (pin + digit).slice(0, PIN_LENGTH)
    setError('')
    setPin(typed)
    if (typed.length < PIN_LENGTH) return
    signIn.mutate(
      { data: { staff_id: member.id, pin: typed } },
      {
        onSuccess: (session) => {
          queries.setQueryData(getGetSessionQueryKey(), session)
          navigate('/panel', { replace: true })
        },
        onSettled: () => setPin(''),
      },
    )
  }

  const erase = () => setPin((value) => value.slice(0, -1))

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (DIGITS.includes(event.key)) press(event.key)
    if (event.key === 'Backspace') erase()
  })

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey(event)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  return (
    <main className="grid min-h-svh place-items-center bg-ground p-4">
      <section className="grid w-full max-w-sm gap-6 rounded-3xl bg-background p-6 text-center">
        <h1 className="font-heading text-5xl font-bold uppercase text-brand">{t('title')}</h1>
        {!member ? (
          <>
            <p className="text-muted-foreground">{members.data?.length === 0 ? t('noTeam') : t('whoAreYou')}</p>
            <div className="grid grid-cols-2 gap-2">
              {members.data?.map((person) => (
                <Button key={person.id} variant="secondary" size="lg" className="h-14 text-base" onClick={() => setMember(person)}>
                  {person.name}
                </Button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">{t('typePin', { name: member.name })}</p>
            <div className="flex justify-center gap-3" aria-live="polite">
              {Array.from({ length: PIN_LENGTH }, (_, index) => (
                <span key={index} className={cn('size-4 rounded-full', index < pin.length ? 'bg-primary' : 'bg-border')} />
              ))}
            </div>
            <p className="min-h-6 text-sm text-destructive" role="alert">
              {error}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DIGITS.slice(0, 9).map((digit) => (
                <Button key={digit} variant="secondary" className="h-16 font-heading text-3xl" disabled={signIn.isPending} onClick={() => press(digit)}>
                  {digit}
                </Button>
              ))}
              <Button variant="ghost" className="h-16" onClick={() => setMember(undefined)}>
                {t('notMe')}
              </Button>
              <Button variant="secondary" className="h-16 font-heading text-3xl" disabled={signIn.isPending} onClick={() => press('0')}>
                0
              </Button>
              <Button variant="ghost" className="h-16" aria-label={t('erase')} onClick={erase}>
                <Delete className="size-6" aria-hidden />
              </Button>
            </div>
          </>
        )}
      </section>
    </main>
  )
}
