import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { toast } from 'sonner'
import { Home } from '@/features/site/Home'
import { errorText } from '@/shared/lib/format'
import { Toaster } from '@/shared/ui/sonner'

const queries = new QueryClient({
  mutationCache: new MutationCache({ onError: (error) => toast.error(errorText(error)) }),
  defaultOptions: { queries: { retry: false } },
})

const Nothing = () => null

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/ingreso', HydrateFallback: Nothing, lazy: async () => ({ Component: (await import('@/features/auth/SignInPage')).SignInPage }) },
  { path: '/panel/*', HydrateFallback: Nothing, lazy: async () => ({ Component: (await import('@/features/panel/PanelRoutes')).PanelRoutes }) },
])

export function App() {
  return (
    <QueryClientProvider client={queries}>
      <RouterProvider router={router} />
      <Toaster position="top-center" />
    </QueryClientProvider>
  )
}
