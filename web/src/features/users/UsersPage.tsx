import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useSaved } from '@/features/panel/useSaved'
import { getGetUsersQueryKey, SessionRole, useCreateUser, useGetSession, useGetUsers, useUpdateUser, type NewUser, type User, type UserChange } from '@/shared/api/client'
import { CreateUserBody, UpdateUserBody } from '@/shared/api/schemas'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Switch } from '@/shared/ui/switch'

const ROLES = Object.values(SessionRole)

function RoleSelect({ value, onChange, disabled }: { value: SessionRole; onChange: (role: SessionRole) => void; disabled?: boolean }) {
  const { t } = useTranslation(['panel', 'users'])
  return (
    <Select value={value} onValueChange={(role) => onChange(role as SessionRole)} disabled={disabled}>
      <SelectTrigger aria-label={t('users:role')}>
        <SelectValue>{t(`roles.${value}`)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((role) => (
          <SelectItem key={role} value={role}>
            {t(`roles.${role}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function UsersPage() {
  const { t } = useTranslation(['users', 'panel'])
  const users = useGetUsers()
  const session = useGetSession()

  return (
    <div className="grid max-w-4xl gap-6">
      <div>
        <h2 className="font-heading text-2xl font-bold uppercase">{t('title')}</h2>
        <p className="text-muted-foreground">{t('hint')}</p>
      </div>
      <ul className="grid gap-3">
        {users.data?.map((user) => (
          <UserRow key={user.id} user={user} isSelf={user.id === session.data?.id} />
        ))}
      </ul>
      <NewUserForm />
      <p className="text-sm text-muted-foreground">{t('roles')}</p>
    </div>
  )
}

function UserRow({ user, isSelf }: { user: User; isSelf: boolean }) {
  const { t } = useTranslation(['users', 'panel'])
  const form = useForm<UserChange>({
    resolver: zodResolver(UpdateUserBody),
    defaultValues: { name: user.name, role: user.role, active: user.active, pin: null },
  })
  const update = useUpdateUser(useSaved([getGetUsersQueryKey()], () => form.setValue('pin', null)))

  return (
    <li className="rounded-xl bg-card p-3">
      <form
        className="grid items-end gap-3 sm:grid-cols-[1fr_10rem_auto_10rem_auto]"
        onSubmit={form.handleSubmit((data) => update.mutate({ id: user.id, data }))}
      >
        <div className="grid gap-1.5">
          <Label htmlFor={`name-${user.id}`}>{isSelf ? t('you', { name: user.name }) : t('name')}</Label>
          <Input id={`name-${user.id}`} {...form.register('name')} />
          {user.locked_until && <Badge variant="destructive">{t('lockedUntil', { until: new Date(user.locked_until!) })}</Badge>}
        </div>
        <Controller control={form.control} name="role" render={({ field }) => <RoleSelect value={field.value} onChange={field.onChange} disabled={isSelf} />} />
        <Controller
          control={form.control}
          name="active"
          render={({ field }) => (
            <div className="flex items-center gap-2 pb-2">
              <Switch id={`active-${user.id}`} checked={field.value} onCheckedChange={field.onChange} disabled={isSelf} />
              <Label htmlFor={`active-${user.id}`}>{t('active')}</Label>
            </div>
          )}
        />
        <div className="grid gap-1.5">
          <Label htmlFor={`pin-${user.id}`}>{t('newPin')}</Label>
          <Input
            id={`pin-${user.id}`}
            inputMode="numeric"
            autoComplete="off"
            placeholder={t('newPinHint')}
            aria-invalid={!!form.formState.errors.pin}
            {...form.register('pin', { setValueAs: (value: string) => (value === '' ? null : value) })}
          />
        </div>
        <Button type="submit" disabled={update.isPending}>
          {t('panel:save')}
        </Button>
      </form>
    </li>
  )
}

function NewUserForm() {
  const { t } = useTranslation(['users', 'panel'])
  const form = useForm<NewUser>({ resolver: zodResolver(CreateUserBody), defaultValues: { name: '', role: SessionRole.floor, pin: '' } })
  const create = useCreateUser(useSaved([getGetUsersQueryKey()], () => form.reset()))

  return (
    <form
      className="grid items-end gap-3 rounded-xl border-2 border-dashed p-3 sm:grid-cols-[1fr_10rem_10rem_auto]"
      onSubmit={form.handleSubmit((data) => create.mutate({ data }))}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="new-name">{t('name')}</Label>
        <Input id="new-name" aria-invalid={!!form.formState.errors.name} {...form.register('name')} />
      </div>
      <Controller control={form.control} name="role" render={({ field }) => <RoleSelect value={field.value} onChange={field.onChange} />} />
      <div className="grid gap-1.5">
        <Label htmlFor="new-pin">{t('pin')}</Label>
        <Input id="new-pin" inputMode="numeric" autoComplete="off" aria-invalid={!!form.formState.errors.pin} {...form.register('pin')} />
      </div>
      <Button type="submit" disabled={create.isPending}>
        {t('add')}
      </Button>
    </form>
  )
}
