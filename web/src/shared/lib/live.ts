import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

const TOPICS = { menu: '/api/menu', schedule: '/api/schedule' }

export function LiveUpdates() {
  const queries = useQueryClient()

  useEffect(() => {
    const events = new EventSource('/api/events')
    const refresh = (prefix: string) => () =>
      queries.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith(prefix) })
    for (const [topic, prefix] of Object.entries(TOPICS)) events.addEventListener(topic, refresh(prefix))
    events.addEventListener('open', refresh('/api/'))
    return () => events.close()
  }, [queries])

  return null
}
