import { Route, Routes } from 'react-router'
import { PanelLayout } from '@/features/panel/PanelLayout'
import { panelSections } from '@/features/panel/sections'

export function PanelRoutes() {
  return (
    <Routes>
      <Route element={<PanelLayout />}>
        {panelSections.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}
        <Route path="*" element={null} />
      </Route>
    </Routes>
  )
}
