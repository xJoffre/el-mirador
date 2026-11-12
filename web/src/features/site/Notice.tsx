import type { ReactNode } from 'react'

export function Notice({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-svh place-items-center bg-ground p-4">
      <section className="grid justify-items-center gap-4 rounded-3xl bg-background p-8 text-center">{children}</section>
    </main>
  )
}
