import { useTranslation } from 'react-i18next'
import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Notice } from '@/features/site/Notice'
import { Button, buttonVariants } from '@/shared/ui/button'

export function RouteError() {
  const { t } = useTranslation(['common', 'site'])
  const error = useRouteError()
  const missing = isRouteErrorResponse(error) && error.status === 404

  return (
    <Notice>
      <p>{missing ? t('notFound') : t('crashed')}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {!missing && (
          <Button variant="secondary" onClick={() => window.location.reload()}>
            {t('reload')}
          </Button>
        )}
        <a className={buttonVariants()} href="/">
          {t('site:backToMenu')}
        </a>
      </div>
    </Notice>
  )
}
