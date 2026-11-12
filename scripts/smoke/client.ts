export function client(base: string) {
  const cookies = new Map<string, string>()
  return async (method: string, path: string, body?: unknown) => {
    const form = body instanceof FormData
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; '),
        'x-xsrf-token': cookies.get('XSRF-TOKEN') ?? '',
        ...(body !== undefined && !form ? { 'content-type': 'application/json' } : {}),
      },
      body: form ? body : body === undefined ? undefined : JSON.stringify(body),
    })
    for (const cookie of response.headers.getSetCookie()) {
      const [name, value] = cookie.split(';')[0].split('=')
      if (/max-age=0/i.test(cookie)) cookies.delete(name)
      else cookies.set(name, value)
    }
    const text = await response.text()
    return { status: response.status, body: text && response.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text }
  }
}

export type Client = ReturnType<typeof client>

export async function signIn(call: Client, name: string, pin: string) {
  const members: { id: number; name: string }[] = (await call('GET', '/api/staff/members')).body
  return call('POST', '/api/staff/session', { staff_id: members.find((member) => member.name === name)!.id, pin })
}
