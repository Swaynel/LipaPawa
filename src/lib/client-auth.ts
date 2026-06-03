export function getAccessToken() {
  if (typeof window === 'undefined') return null

  const token = window.localStorage.getItem('accessToken')
  if (!token || token === 'null' || token === 'undefined') return null

  return token
}

export function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = getAccessToken()
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra }
}
