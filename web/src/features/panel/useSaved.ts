import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export function useSaved(keys: QueryKey[], after?: () => void) {
  const { t } = useTranslation('panel')
  const queries = useQueryClient()
  return {
    mutation: {
      onSuccess: () => {
        toast.success(t('saved'))
        after?.()
        return Promise.all(keys.map((queryKey) => queries.invalidateQueries({ queryKey })))
      },
    },
  }
}
