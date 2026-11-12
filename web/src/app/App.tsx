import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { toast } from 'sonner'
import { SitePage } from '@/features/site/SitePage'
import { TrackingPage } from '@/features/site/TrackingPage'
import { getGetSessionQueryKey } from '@/shared/api/client'
import { errorText } from '@/shared/lib/format'
import { LiveUpdates } from '@/shared/lib/live'
import { ApiError } from '@/shared/lib/request'
import { Toaster } from '@/shared/ui/sonner'

const sessionEnded = (error: unknown) =>
  error instanceof ApiError && error.status === 401 && queries.invalidateQueries({ queryKey: getGetSessionQueryKey() })

const queries: QueryClient = new QueryClient({
  queryCache: new QueryCache({ onError: sessionEnded }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      sessionEnded(error)
      if (!mutation.options.onError) toast.error(errorText(error))
    },
  }),
  defaultOptions: { queries: { retry: false } },
})

const Nothing = () => null

const router = createBrowserRouter([
  { path: '/', element: <SitePage /> },
  { path: '/pedido/:token', element: <TrackingPage /> },
  { path: '/ingreso', HydrateFallback: Nothing, lazy: async () => ({ Component: (await import('@/features/auth/SignInPage')).SignInPage }) },
  { path: '/panel/*', HydrateFallback: Nothing, lazy: async () => ({ Component: (await import('@/features/panel/PanelRoutes')).PanelRoutes }) },
])

export function App() {
  return (
    <QueryClientProvider client={queries}>
      <LiveUpdates />
      <RouterProvider router={router} />
      <Toaster position="top-center" />
    </QueryClientProvider>
  )
}
