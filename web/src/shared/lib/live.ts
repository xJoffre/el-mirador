import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

const TOPICS = { menu: '/api/menu', schedule: '/api/schedule', orders: '/api/orders' }
const RECONNECT_MS = 5_000

export const SAFETY_REFRESH = { query: { refetchInterval: 30_000 } }

export function useLiveUpdates() {
  const queries = useQueryClient()
  const [connected, setConnected] = useState(true)

  useEffect(() => {
    let events: EventSource
    let retry: ReturnType<typeof setTimeout>
    const refresh = (prefix: string) => () =>
      queries.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith(prefix) })
    const connect = () => {
      events = new EventSource('/api/events')
      for (const [topic, prefix] of Object.entries(TOPICS)) events.addEventListener(topic, refresh(prefix))
      events.addEventListener('open', () => {
        setConnected(true)
        refresh('/api/')()
      })
      events.addEventListener('error', () => {
        setConnected(false)
        if (events.readyState === EventSource.CLOSED) retry = setTimeout(connect, RECONNECT_MS)
      })
    }
    connect()
    return () => {
      clearTimeout(retry)
      events.close()
    }
  }, [queries])

  return connected
}
