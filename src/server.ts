import http from 'node:http'
import crypto from 'node:crypto'
import { config } from './config.js'
import { extractApiKey, validateApiKey, requireAuth } from './auth.js'
import { config as appConfig } from './config.js'
import { chargeCredits, PRICING } from './billing.js'
import { validateUrl } from './url-safety.js'
import {
  htmlToMarkdown,
  htmlToText,
  extractMetadata,
  extractLinks,
  extractHeadings,
  extractImages,
  extractJsonLd,
  extractTables,
  extractReadableContent,
  extractStructured,
  crawlPlan,
  fetchAndExtract,
} from './engine.js'
import type {
  HealthResponse,
  FetchInput,
  FetchResponse,
  FetchResult,
  ExtractInput,
  ExtractResponse,
  ExtractResult,
  MarkdownInput,
  MarkdownResponse,
  MarkdownResult,
  MetadataInput,
  MetadataResponse,
  LinksInput,
  LinksResponse,
  LinksResult,
  StructuredInput,
  StructuredResponse,
  StructuredResult,
  CrawlPlanInput,
  CrawlPlanResponse,
  CrawlPlanResult,
  UsageInfo,
  ErrorResponse,
} from './types.js'

const VERSION = '0.1.0'
const SERVICE = 'webdatalane'

function generateId(): string {
  return 'wdl_' + crypto.randomBytes(16).toString('hex')
}

function jsonResponse(res: http.ServerResponse, status: number, data: unknown, requestId?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (requestId) headers['x-request-id'] = requestId
  res.writeHead(status, headers)
  res.end(JSON.stringify(data))
}

function errorJson(code: string, message: string, details?: string): ErrorResponse {
  return { error: { code, message, ...(details ? { details } : {}) } }
}

function readBody(req: http.IncomingMessage, maxBytes = config.maxBodyBytes): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    req.on('data', (chunk: Buffer) => {
      total += chunk.length
      if (total > maxBytes) {
        const err = new Error('Request body too large')
        ;(err as Error & { code?: string }).code = 'PAYLOAD_TOO_LARGE'
        req.destroy(err)
        reject(err)
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

async function fetchUrl(targetUrl: string, timeoutMs = 15000, maxBytes = 1_000_000, userAgent = 'WebDataLane/0.1'): Promise<FetchResult> {
  validateUrl(targetUrl)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    })

    const contentType = response.headers.get('content-type') || 'text/plain'
    const arrayBuffer = await response.arrayBuffer()
    const bytes = arrayBuffer.byteLength
    const truncated = bytes > maxBytes
    const text = new TextDecoder('utf-8', { fatal: false }).decode(
      arrayBuffer.slice(0, Math.min(bytes, maxBytes))
    )

    return {
      url: targetUrl,
      status: response.status,
      contentType,
      finalUrl: response.url,
      html: text,
      text: htmlToText(text),
      bytes: truncated ? maxBytes : bytes,
    }
  } finally {
    clearTimeout(timeout)
  }
}

function buildUsage(action: string): UsageInfo {
  return { credits: PRICING[action] || 0, action }
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const requestId = generateId()

  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    const method = req.method || 'GET'
    const path = url.pathname

    if (method === 'GET' && (path === '/health' || path === '/v1/webdatalane/health')) {
      const response: HealthResponse = {
        ok: true,
        service: SERVICE,
        version: VERSION,
        timestamp: new Date().toISOString(),
      }
      return jsonResponse(res, 200, response, requestId)
    }

    if (method !== 'POST') {
      return jsonResponse(res, 405, errorJson('METHOD_NOT_ALLOWED', 'Method not allowed'), requestId)
    }

    const bodyStr = await readBody(req)
    let body: Record<string, unknown>
    try {
      body = JSON.parse(bodyStr)
    } catch {
      return jsonResponse(res, 400, errorJson('INVALID_JSON', 'Invalid JSON body'), requestId)
    }

    let apiKey: string | null = null
    if (!appConfig.allowLocalUnauth) {
      apiKey = requireAuth(req)
    } else {
      apiKey = extractApiKey(req)
      if (apiKey && !validateApiKey(apiKey)) apiKey = null
    }

    const isHosted = !!apiKey && appConfig.allowLocalUnauth !== true

    switch (path) {
      case '/v1/webdatalane/fetch': {
        const input = body as unknown as FetchInput
        if (!input.url) {
          return jsonResponse(res, 400, errorJson('VALIDATION_ERROR', 'url is required'), requestId)
        }

        if (isHosted) {
          const billing = await chargeCredits('webdatalane.fetch', PRICING['webdatalane.fetch'], {
            route: path, urlHost: new URL(input.url).hostname,
          })
          if (!billing.success) {
            return jsonResponse(res, 402, errorJson('INSUFFICIENT_CREDITS', billing.error || 'Insufficient credits'), requestId)
          }
        }

        try {
          const result = await fetchUrl(input.url, input.timeoutMs, input.maxBytes, input.userAgent)
          const response: FetchResponse = {
            id: generateId(),
            object: 'webdatalane.fetch',
            result,
            usage: buildUsage('webdatalane.fetch'),
          }
          return jsonResponse(res, 200, response, requestId)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Fetch failed'
          return jsonResponse(res, 400, errorJson('FETCH_FAILED', message), requestId)
        }
      }

      case '/v1/webdatalane/extract': {
        const input = body as unknown as ExtractInput
        let html = input.html || ''
        let text = ''

        if (input.url && !html) {
          try {
            const fetched = await fetchUrl(input.url, input.timeoutMs || 15000)
            html = fetched.html
            text = fetched.text
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Fetch failed'
            return jsonResponse(res, 400, errorJson('FETCH_FAILED', message), requestId)
          }
        }

        if (isHosted) {
          const billing = await chargeCredits('webdatalane.extract', PRICING['webdatalane.extract'], {
            route: path, inputType: input.url ? 'url' : 'html', inputSize: html.length, urlHost: input.url ? new URL(input.url).hostname : undefined,
          })
          if (!billing.success) {
            return jsonResponse(res, 402, errorJson('INSUFFICIENT_CREDITS', billing.error || 'Insufficient credits'), requestId)
          }
        }

        if (!html && !text) {
          text = htmlToText(html)
        }

        const { extracted, metadata, warnings } = fetchAndExtract({ html, url: input.url, include: input.include })

        const result: ExtractResult = {
          url: input.url,
          title: metadata.title,
          description: metadata.description,
          markdown: htmlToMarkdown(html),
          text: htmlToText(html),
          headings: extracted.headings,
          links: extracted.links,
          images: extracted.images,
          jsonLd: extracted.jsonLd,
          tables: extracted.tables,
          metadata,
          warnings: [...warnings, ...extracted.warnings],
        }

        const response: ExtractResponse = {
          id: generateId(),
          object: 'webdatalane.extraction',
          result,
          usage: buildUsage('webdatalane.extract'),
        }
        return jsonResponse(res, 200, response, requestId)
      }

      case '/v1/webdatalane/markdown': {
        const input = body as unknown as MarkdownInput
        let html = input.html || ''

        if (input.url && !html) {
          try {
            const fetched = await fetchUrl(input.url)
            html = fetched.html
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Fetch failed'
            return jsonResponse(res, 400, errorJson('FETCH_FAILED', message), requestId)
          }
        }

        if (isHosted) {
          const billing = await chargeCredits('webdatalane.markdown', PRICING['webdatalane.markdown'], {
            route: path, inputType: input.url ? 'url' : 'html', inputSize: html.length, urlHost: input.url ? new URL(input.url).hostname : undefined,
          })
          if (!billing.success) {
            return jsonResponse(res, 402, errorJson('INSUFFICIENT_CREDITS', billing.error || 'Insufficient credits'), requestId)
          }
        }

        const metadata = extractMetadata(html, input.url)
        const markdown = htmlToMarkdown(html, { stripNavigation: input.stripNavigation, includeLinks: input.includeLinks })
        const warnings: string[] = []

        if (!html) warnings.push('No HTML content provided')

        const result: MarkdownResult = {
          markdown,
          title: metadata.title,
          sourceUrl: input.url,
          warnings,
        }
        const response: MarkdownResponse = {
          id: generateId(),
          object: 'webdatalane.markdown',
          result,
          usage: buildUsage('webdatalane.markdown'),
        }
        return jsonResponse(res, 200, response, requestId)
      }

      case '/v1/webdatalane/metadata': {
        const input = body as unknown as MetadataInput
        let html = input.html || ''

        if (input.url && !html) {
          try {
            const fetched = await fetchUrl(input.url)
            html = fetched.html
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Fetch failed'
            return jsonResponse(res, 400, errorJson('FETCH_FAILED', message), requestId)
          }
        }

        if (isHosted) {
          const billing = await chargeCredits('webdatalane.metadata', PRICING['webdatalane.metadata'], {
            route: path, inputType: input.url ? 'url' : 'html', inputSize: html.length, urlHost: input.url ? new URL(input.url).hostname : undefined,
          })
          if (!billing.success) {
            return jsonResponse(res, 402, errorJson('INSUFFICIENT_CREDITS', billing.error || 'Insufficient credits'), requestId)
          }
        }

        const result = extractMetadata(html, input.url)
        const response: MetadataResponse = {
          id: generateId(),
          object: 'webdatalane.metadata',
          result,
          usage: buildUsage('webdatalane.metadata'),
        }
        return jsonResponse(res, 200, response, requestId)
      }

      case '/v1/webdatalane/links': {
        const input = body as unknown as LinksInput
        let html = input.html || ''

        if (input.url && !html) {
          try {
            const fetched = await fetchUrl(input.url)
            html = fetched.html
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Fetch failed'
            return jsonResponse(res, 400, errorJson('FETCH_FAILED', message), requestId)
          }
        }

        if (isHosted) {
          const billing = await chargeCredits('webdatalane.links', PRICING['webdatalane.links'], {
            route: path, inputType: input.url ? 'url' : 'html', inputSize: html.length, urlHost: input.url ? new URL(input.url).hostname : undefined,
          })
          if (!billing.success) {
            return jsonResponse(res, 402, errorJson('INSUFFICIENT_CREDITS', billing.error || 'Insufficient credits'), requestId)
          }
        }

        let allLinks = extractLinks(html, input.url)
        if (input.internalOnly) {
          allLinks = allLinks.filter(l => l.internal)
        }

        const result: LinksResult = { links: allLinks, count: allLinks.length }
        const response: LinksResponse = {
          id: generateId(),
          object: 'webdatalane.links',
          result,
          usage: buildUsage('webdatalane.links'),
        }
        return jsonResponse(res, 200, response, requestId)
      }

      case '/v1/webdatalane/structured': {
        const input = body as unknown as StructuredInput
        let html = input.html || ''

        if (input.url && !html) {
          try {
            const fetched = await fetchUrl(input.url)
            html = fetched.html
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Fetch failed'
            return jsonResponse(res, 400, errorJson('FETCH_FAILED', message), requestId)
          }
        }

        if (!input.schema || typeof input.schema !== 'object' || Object.keys(input.schema).length === 0) {
          return jsonResponse(res, 400, errorJson('VALIDATION_ERROR', 'schema is required with at least one field'), requestId)
        }

        if (isHosted) {
          const billing = await chargeCredits('webdatalane.structured', PRICING['webdatalane.structured'], {
            route: path, inputType: input.url ? 'url' : 'html', inputSize: html.length, urlHost: input.url ? new URL(input.url).hostname : undefined,
          })
          if (!billing.success) {
            return jsonResponse(res, 402, errorJson('INSUFFICIENT_CREDITS', billing.error || 'Insufficient credits'), requestId)
          }
        }

        const result = extractStructured(html, input.schema as Record<string, string>, input.hints)
        const response: StructuredResponse = {
          id: generateId(),
          object: 'webdatalane.structured',
          result,
          usage: buildUsage('webdatalane.structured'),
        }
        return jsonResponse(res, 200, response, requestId)
      }

      case '/v1/webdatalane/crawl/plan': {
        const input = body as unknown as CrawlPlanInput
        let html = input.html || ''

        if (input.url && !html) {
          try {
            const fetched = await fetchUrl(input.url)
            html = fetched.html
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Fetch failed'
            return jsonResponse(res, 400, errorJson('FETCH_FAILED', message), requestId)
          }
        }

        if (isHosted) {
          const billing = await chargeCredits('webdatalane.crawl.plan', PRICING['webdatalane.crawl.plan'], {
            route: path, inputType: input.url ? 'url' : 'html', inputSize: html.length, urlHost: input.url ? new URL(input.url).hostname : undefined,
          })
          if (!billing.success) {
            return jsonResponse(res, 402, errorJson('INSUFFICIENT_CREDITS', billing.error || 'Insufficient credits'), requestId)
          }
        }

        if (!input.url) {
          return jsonResponse(res, 400, errorJson('VALIDATION_ERROR', 'url is required for crawl plan'), requestId)
        }

        const result = crawlPlan(html, input.url, {
          maxPages: input.maxPages,
          sameDomainOnly: input.sameDomainOnly,
          includePatterns: input.includePatterns,
          excludePatterns: input.excludePatterns,
        })
        const response: CrawlPlanResponse = {
          id: generateId(),
          object: 'webdatalane.crawl.plan',
          result,
          usage: buildUsage('webdatalane.crawl.plan'),
        }
        return jsonResponse(res, 200, response, requestId)
      }

      case '/v1/webdatalane/screenshot': {
        return jsonResponse(res, 501, errorJson(
          'BROWSER_RENDERING_NOT_AVAILABLE',
          'Screenshot capture requires browser rendering support, which is not included in WebDataLane v0.1.'
        ), requestId)
      }

      default:
        return jsonResponse(res, 404, errorJson('NOT_FOUND', 'Not found'), requestId)
    }
  } catch (err: unknown) {
    const error = err as { status?: number; body?: string; message?: string; code?: string }
    if (error.status && error.body) {
      res.writeHead(error.status, { 'Content-Type': 'application/json', 'x-request-id': requestId })
      res.end(error.body)
      return
    }
    const message = error.message || 'Internal server error'
    const code = error.code || 'INTERNAL_ERROR'
    return jsonResponse(res, 500, errorJson(code, message), requestId)
  }
}

const server = http.createServer(handleRequest)

server.listen(config.port, '0.0.0.0', () => {
  console.log(`WebDataLane server v${VERSION} listening on 0.0.0.0:${config.port}`)
})

function shutdown() {
  console.log('WebDataLane shutting down...')
  server.close(() => process.exit(0))
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

export { server }
