export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: Record<string, unknown>

  constructor(status: number, code: string, details: Record<string, unknown>) {
    super(code)
    this.status = status
    this.code = code
    this.details = details
  }
}

const csrfToken = () =>
  document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
    ?.slice('XSRF-TOKEN='.length) ?? ''

export async function request<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { ...options.headers, 'X-XSRF-TOKEN': csrfToken() },
  })
  const text = await response.text()
  const body = text ? JSON.parse(text) : undefined
  if (!response.ok) {
    const code = body?.code ?? (response.status === 400 ? 'shared.invalid' : 'shared.unexpected')
    throw new ApiError(response.status, code, body ?? {})
  }
  return body as T
}
