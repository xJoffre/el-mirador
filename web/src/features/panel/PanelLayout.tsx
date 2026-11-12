import { useQueryClient } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { panelSections } from '@/features/panel/sections'
import { useGetSession, useSignOut } from '@/shared/api/client'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'

export function PanelLayout() {
  const { t } = useTranslation(['panel', 'common', 'auth'])
  const session = useGetSession()
  const signOut = useSignOut()
  const queries = useQueryClient()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  if (session.isPending) return <p className="p-6 text-muted-foreground">{t('loading')}</p>
  if (session.isError) return <Navigate to="/ingreso" replace />

  const { name, role } = session.data
  const sections = panelSections.filter((section) => section.roles.includes(role))
  const current = sections.find((section) => pathname.endsWith(`/${section.path}`))
  if (!current) return <Navigate to={`/panel/${sections[0].path}`} replace />

  const leave = () =>
    signOut.mutate(undefined, {
      onSettled: () => {
        queries.clear()
        navigate('/ingreso', { replace: true })
      },
    })

  return (
    <div className="min-h-svh bg-ground text-background md:flex">
      <aside className="flex items-center gap-2 overflow-x-auto p-3 md:sticky md:top-0 md:h-svh md:w-56 md:flex-col md:items-stretch md:gap-1 md:p-4">
        <p className="hidden font-heading text-3xl font-bold uppercase text-brand md:mb-4 md:block">{t('common:brand')}</p>
        {sections.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={`/panel/${path}`}
            className={({ isActive }) =>
              cn(
                'flex shrink-0 items-center gap-3 rounded-md px-3 py-2 font-heading text-lg font-bold uppercase',
                isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-background/10',
              )
            }
          >
            <Icon className="size-5" aria-hidden />
            {t(`sections.${label}`)}
          </NavLink>
        ))}
        <div className="ml-auto flex shrink-0 items-center gap-2 md:mt-auto md:ml-0 md:flex-col md:items-stretch">
          <p className="hidden text-sm opacity-80 md:block">{t('greeting', { name })}</p>
          <Button variant="secondary" onClick={leave}>
            <LogOut aria-hidden />
            {t('auth:signOut')}
          </Button>
        </div>
      </aside>
      <main className="min-h-svh flex-1 bg-background p-4 text-foreground md:p-8">
        <h1 className="mb-6 font-heading text-4xl font-bold uppercase text-brand">{t(`sections.${current.label}`)}</h1>
        <Outlet />
      </main>
    </div>
  )
}
