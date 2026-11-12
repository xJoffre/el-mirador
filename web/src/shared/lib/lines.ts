import { useTranslation } from 'react-i18next'
import type { LineView } from '@/shared/api/client'
import { useLabel } from '@/shared/lib/format'

export function useLineText() {
  const { t } = useTranslation('site')
  const label = useLabel()
  return (line: LineView) => {
    if (line.kind === 'product') {
      return {
        name: [label(line.product), label(line.variant)].filter(Boolean).join(' · '),
        details: line.options.map((option) => label(option)).join(', '),
      }
    }
    if (line.kind === 'lunch_full') return { name: t('lunchFull'), details: [label(line.main), label(line.soup)].join(', ') }
    if (line.kind === 'lunch_soup') return { name: label(line.soup), details: t('soupAlone') }
    return { name: label(line.main), details: t('mainAlone') }
  }
}
