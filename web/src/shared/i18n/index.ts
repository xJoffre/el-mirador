import i18n, { type Resource, type ResourceLanguage } from 'i18next'
import { initReactI18next } from 'react-i18next'
import type auth from './es/auth.json'
import type cash from './es/cash.json'
import type catalog from './es/catalog.json'
import type common from './es/common.json'
import type errors from './es/errors.json'
import type kitchen from './es/kitchen.json'
import type lunch from './es/lunch.json'
import type orders from './es/orders.json'
import type panel from './es/panel.json'
import type site from './es/site.json'
import type soldOut from './es/soldOut.json'
import type store from './es/store.json'
import type today from './es/today.json'
import type users from './es/users.json'

export const baseLanguage = 'es'

const files = import.meta.glob<{ default: ResourceLanguage[string] }>('./*/*.json', { eager: true })

const resources: Resource = {}
for (const [path, file] of Object.entries(files)) {
  const [, language, namespace] = path.match(/^\.\/(.+)\/(.+)\.json$/)!
  resources[language] = { ...resources[language], [namespace]: file.default }
}

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      auth: typeof auth
      cash: typeof cash
      catalog: typeof catalog
      common: typeof common
      errors: typeof errors
      kitchen: typeof kitchen
      lunch: typeof lunch
      orders: typeof orders
      panel: typeof panel
      site: typeof site
      soldOut: typeof soldOut
      store: typeof store
      today: typeof today
      users: typeof users
    }
  }
}

i18n.on('languageChanged', () => {
  document.documentElement.lang = i18n.resolvedLanguage ?? baseLanguage
})

await i18n.use(initReactI18next).init({
  resources,
  lng: navigator.language,
  fallbackLng: baseLanguage,
  supportedLngs: Object.keys(resources),
  load: 'languageOnly',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
})

export default i18n
