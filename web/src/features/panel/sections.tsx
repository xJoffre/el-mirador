import { BookOpen, CircleSlash, CookingPot, Store, Sun, Users, type LucideIcon } from 'lucide-react'
import type { ReactElement } from 'react'
import { CatalogPage } from '@/features/catalog/CatalogPage'
import { LunchPage } from '@/features/lunch/LunchPage'
import { SoldOutPage } from '@/features/soldOut/SoldOutPage'
import { StorePage } from '@/features/store/StorePage'
import { TodayPage } from '@/features/today/TodayPage'
import { UsersPage } from '@/features/users/UsersPage'
import { SessionRole } from '@/shared/api/client'

export type PanelSection = {
  path: string
  label: 'today' | 'lunch' | 'catalog' | 'store' | 'users' | 'soldOut'
  icon: LucideIcon
  roles: SessionRole[]
  element: ReactElement
}

const everyone = Object.values(SessionRole)

export const panelSections: PanelSection[] = [
  { path: 'hoy', label: 'today', icon: Sun, roles: [SessionRole.admin], element: <TodayPage /> },
  { path: 'almuerzo', label: 'lunch', icon: CookingPot, roles: [SessionRole.admin], element: <LunchPage /> },
  { path: 'carta', label: 'catalog', icon: BookOpen, roles: [SessionRole.admin], element: <CatalogPage /> },
  { path: 'local', label: 'store', icon: Store, roles: [SessionRole.admin], element: <StorePage /> },
  { path: 'usuarios', label: 'users', icon: Users, roles: [SessionRole.admin], element: <UsersPage /> },
  { path: 'agotados', label: 'soldOut', icon: CircleSlash, roles: everyone, element: <SoldOutPage /> },
]
