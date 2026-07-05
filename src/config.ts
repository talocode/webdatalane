export const config = {
  port: parseInt(process.env.PORT || '3020', 10),
  talocodeBaseUrl: process.env.TALOCODE_BASE_URL || 'https://api.talocode.site',
  talocodeApiKey: process.env.TALOCODE_API_KEY || '',
  allowLocalUnauth: process.env.WEBDATALANE_ALLOW_LOCAL_UNAUTH !== 'false',
  version: '0.1.0',
  service: 'webdatalane',
  defaultTimeoutMs: 15000,
  maxBodyBytes: 2 * 1024 * 1024,
} as const
