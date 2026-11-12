import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { toast } from 'sonner'
import { RouteError } from '@/app/RouteError'
import { PrivacyPage } from '@/features/site/PrivacyPage'
import { SitePage } from '@/features/site/SitePage'
import { TrackingPage } from '@/features/site/TrackingPage'
import { getGetSessionQueryKey } from '@/shared/api/client'
import i18n from '@/shared/i18n'
import { errorText } from '@/shared/lib/format'
import { useLiveUpdates } from '@/shared/lib/live'
import { ApiError } from '@/shared/lib/request'
import { Toaster } from '@/shared/ui/sonner'

const sessionKey = getGetSessionQueryKey()

const sessionEnded = (error: unknown) => error instanceof ApiError && error.status === 401 && queries.invalidateQueries({ queryKey: sessionKey })

const serverFailed = (error: unknown) => error instanceof ApiError && error.status >= 500

const queries: QueryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.queryKey[0] !== sessionKey[0]) sessionEnded(error)
      if (serverFailed(error)) toast.error(i18n.t('common:serverError'), { id: 'server-error' })
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      sessionEnded(error)
      if (!mutation.options.onError) toast.error(errorText(error))
    },
  }),
  defaultOptions: { queries: { retry: (count, error) => count < 3 && (!(error instanceof ApiError) || error.status >= 502) } },
})

const Nothing = () => null

const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <SitePage /> },
      { path: '/pedido/:token', element: <TrackingPage /> },
      { path: '/privacidad', element: <PrivacyPage /> },
      { path: '/ingreso', HydrateFallback: Nothing, lazy: async () => ({ Component: (await import('@/features/auth/SignInPage')).SignInPage }) },
      { path: '/panel/*', HydrateFallback: Nothing, lazy: async () => ({ Component: (await import('@/features/panel/PanelRoutes')).PanelRoutes }) },
    ],
  },
])

function ConnectionNotice() {
  const { t } = useTranslation('common')
  const connected = useLiveUpdates()
  if (connected) return null
  return (
    <p role="alert" className="fixed inset-x-0 top-0 z-50 bg-foreground p-2 text-center text-sm text-background">
      {t('offline')}
    </p>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queries}>
      <ConnectionNotice />
      <RouterProvider router={router} />
      <Toaster position="top-center" />
    </QueryClientProvider>
  )
}
