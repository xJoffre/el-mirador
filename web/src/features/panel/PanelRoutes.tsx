import { useEffect } from 'react'
import { Route, Routes } from 'react-router'
import { PanelLayout } from '@/features/panel/PanelLayout'
import { panelSections } from '@/features/panel/sections'

export function PanelRoutes() {
  useEffect(() => {
    const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    const site = manifest?.getAttribute('href')
    manifest?.setAttribute('href', '/panel.webmanifest')
    return () => {
      if (site) manifest?.setAttribute('href', site)
    }
  }, [])

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
