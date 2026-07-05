import { BlockedError } from './errors.js'

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
])

const PRIVATE_RANGES = [
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/,
  /^198\.(1[89]|9[0-9])\.\d{1,3}\.\d{1,3}$/,
]

const LINK_LOCAL = /^fe[89ab][0-9a-f]{2}:/

const BLOCKED_SCHEMES = ['file:', 'ftp:', 'data:', 'javascript:', 'blob:', 'about:']

export interface SafetyCheck {
  safe: boolean
  reason?: string
}

export function validateUrl(raw: string, allowHttpOnly = true): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new BlockedError('Invalid URL format')
  }

  if (BLOCKED_SCHEMES.includes(url.protocol)) {
    throw new BlockedError(`Blocked URL scheme: ${url.protocol}`)
  }

  if (allowHttpOnly && url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BlockedError(`Only http and https protocols allowed, got: ${url.protocol}`)
  }

  const hostname = url.hostname.toLowerCase()

  if (BLOCKED_HOSTS.has(hostname)) {
    throw new BlockedError(`Blocked host: ${hostname}`)
  }

  if (LINK_LOCAL.test(hostname)) {
    throw new BlockedError('Link-local addresses are blocked')
  }

  if (
    hostname === 'metadata.google.internal' ||
    hostname === '169.254.169.254' ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local')
  ) {
    throw new BlockedError('Internal metadata hosts are blocked')
  }

  for (const range of PRIVATE_RANGES) {
    if (range.test(hostname)) {
      throw new BlockedError('Private IP ranges are blocked')
    }
  }

  return url
}

export function isInternalLink(href: string, baseUrl: string): boolean {
  try {
    const base = new URL(baseUrl)
    const link = new URL(href, baseUrl)
    return link.hostname === base.hostname
  } catch {
    return false
  }
}
