import { useQueryClient } from '@tanstack/react-query'
import { getGetCatalogQueryKey, getGetMenuQueryKey } from '@/shared/api/client'

export const SECTION_ICONS = [
  'egg-fried',
  'beef',
  'chef-hat',
  'drumstick',
  'salad',
  'cup-soda',
  'beer',
  'wine',
  'coffee',
  'soup',
  'shrimp',
  'fish',
  'sandwich',
  'dessert',
  'pizza',
  'utensils',
] as const

export type SectionIcon = (typeof SECTION_ICONS)[number]

const UPLOAD_SIZE = 1200

export function useRefreshCatalog() {
  const queries = useQueryClient()
  return () =>
    Promise.all([
      queries.invalidateQueries({ queryKey: getGetCatalogQueryKey() }),
      queries.invalidateQueries({ queryKey: getGetMenuQueryKey() }),
    ])
}

export function moved(ids: number[], index: number, step: -1 | 1) {
  const order = [...ids]
  ;[order[index], order[index + step]] = [order[index + step], order[index]]
  return order
}

export async function shrinkPhoto(file: File) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, UPLOAD_SIZE / Math.max(bitmap.width, bitmap.height))
  const canvas = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale))
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 })
}
