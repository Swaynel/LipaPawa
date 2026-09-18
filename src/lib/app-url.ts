function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

export function getAppUrl(request: Request) {
  const requestUrl = new URL(request.url)
  const configuredUrl = process.env.APP_URL?.trim()

  if (configuredUrl) {
    try {
      const parsedConfiguredUrl = new URL(configuredUrl)

      // A local APP_URL is useful for development, but must not send a
      // deployed or LAN checkout back to the user's own localhost.
      const configuredIsLocal = isLocalHostname(parsedConfiguredUrl.hostname)
      const requestIsLocal = isLocalHostname(requestUrl.hostname)
      const sameLocalOrigin =
        requestIsLocal && parsedConfiguredUrl.port === requestUrl.port

      if (!configuredIsLocal || sameLocalOrigin) {
        return parsedConfiguredUrl.origin
      }
    } catch {
      // Fall back to the request origin when APP_URL is malformed.
    }
  }

  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  if (forwardedHost) {
    const protocol = forwardedProto?.split(',')[0]?.trim() || requestUrl.protocol.replace(':', '')
    return `${protocol}://${forwardedHost.split(',')[0]?.trim()}`
  }

  return requestUrl.origin
}
