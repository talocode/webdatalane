import { describe, it, before, after } from 'node:test'
import { strict as assert } from 'node:assert'
import http from 'node:http'

const PORT = 3188
const BASE = `http://0.0.0.0:${PORT}`

let server: http.Server

function post(path: string, body: unknown, headers?: Record<string, string>): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }, (res) => {
      let data = ''
      res.on('data', (chunk: string) => data += chunk)
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 500, data: JSON.parse(data) })
        } catch {
          resolve({ status: res.statusCode || 500, data: data })
        }
      })
    })
    req.on('error', reject)
    req.write(JSON.stringify(body))
    req.end()
  })
}

function get(path: string): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${path}`, (res) => {
      let data = ''
      res.on('data', (chunk: string) => data += chunk)
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 500, data: JSON.parse(data) })
        } catch {
          resolve({ status: res.statusCode || 500, data: data })
        }
      })
    }).on('error', reject)
  })
}

before(async () => {
  process.env.PORT = String(PORT)
  process.env.WEBDATALANE_ALLOW_LOCAL_UNAUTH = 'true'
  process.env.TALOCODE_API_KEY = ''
  const mod = await import('../src/server.js')
  server = mod.server
  await new Promise<void>(resolve => {
    server.once('listening', resolve)
    // Server already started from module import
    setTimeout(resolve, 500)
  })
})

after(() => {
  if (server) server.close()
})

describe('GET /health', () => {
  it('returns ok status', async () => {
    const { status, data } = await get('/health')
    assert.equal(status, 200)
    assert.equal((data as Record<string, unknown>).ok, true)
  })
})

describe('GET /v1/webdatalane/health', () => {
  it('returns service info', async () => {
    const { status, data } = await get('/v1/webdatalane/health')
    assert.equal(status, 200)
    assert.equal((data as Record<string, unknown>).service, 'webdatalane')
  })
})

describe('POST /v1/webdatalane/links', () => {
  it('extracts links from HTML', async () => {
    const { status, data } = await post('/v1/webdatalane/links', {
      html: '<a href="https://example.com/page">Page</a>',
    })
    assert.equal(status, 200)
    const d = data as Record<string, unknown>
    const result = d.result as Record<string, unknown>
    assert.ok(Array.isArray(result.links))
    assert.equal((result.links as unknown[]).length, 1)
  })
})

describe('POST /v1/webdatalane/markdown', () => {
  it('converts HTML to markdown', async () => {
    const { status, data } = await post('/v1/webdatalane/markdown', {
      html: '<h1>Title</h1><p>Content</p>',
    })
    assert.equal(status, 200)
    const d = data as Record<string, unknown>
    const result = d.result as Record<string, unknown>
    assert.ok((result.markdown as string).includes('# Title'))
  })
})

describe('POST /v1/webdatalane/metadata', () => {
  it('extracts metadata from HTML', async () => {
    const { status, data } = await post('/v1/webdatalane/metadata', {
      html: '<title>My Page</title>',
    })
    assert.equal(status, 200)
    const d = data as Record<string, unknown>
    const result = d.result as Record<string, unknown>
    assert.equal(result.title, 'My Page')
  })
})

describe('POST /v1/webdatalane/extract', () => {
  it('extracts with include options', async () => {
    const { status, data } = await post('/v1/webdatalane/extract', {
      html: '<h1>Heading</h1><a href="/about">About</a>',
      include: ['headings', 'links'],
    })
    assert.equal(status, 200)
    const d = data as Record<string, unknown>
    const result = d.result as Record<string, unknown>
    assert.ok(Array.isArray(result.headings))
    assert.ok(Array.isArray(result.links))
  })
})

describe('POST /v1/webdatalane/structured', () => {
  it('extracts structured data', async () => {
    const { status, data } = await post('/v1/webdatalane/structured', {
      html: '<h1>Product X</h1>',
      schema: { title: 'string' },
      hints: { title: ['h1'] },
    })
    assert.equal(status, 200)
    const d = data as Record<string, unknown>
    const result = d.result as Record<string, unknown>
    const fields = result.data as Record<string, string>
    assert.equal(fields.title, 'Product X')
  })
})

describe('POST /v1/webdatalane/crawl/plan', () => {
  it('creates crawl plan from HTML', async () => {
    const { status, data } = await post('/v1/webdatalane/crawl/plan', {
      url: 'https://example.com',
      html: '<a href="/page1">P1</a><a href="/page2">P2</a>',
    })
    assert.equal(status, 200)
    const d = data as Record<string, unknown>
    const result = d.result as Record<string, unknown>
    assert.equal(result.seedUrl, 'https://example.com')
    assert.ok(Array.isArray(result.urls))
  })
})

describe('POST /v1/webdatalane/screenshot', () => {
  it('returns unsupported error', async () => {
    const { status, data } = await post('/v1/webdatalane/screenshot', { url: 'https://example.com' })
    assert.equal(status, 501)
    const d = data as Record<string, unknown>
    const err = d.error as Record<string, string>
    assert.equal(err.code, 'BROWSER_RENDERING_NOT_AVAILABLE')
  })
})

describe('POST /v1/webdatalane/fetch', () => {
  it('returns error for missing url', async () => {
    const { status, data } = await post('/v1/webdatalane/fetch', {})
    assert.equal(status, 400)
    const d = data as Record<string, unknown>
    const err = d.error as Record<string, string>
    assert.ok(err.message)
  })
})

describe('API auth', () => {
  it('accepts request without auth in local mode', async () => {
    const { status } = await post('/v1/webdatalane/markdown', { html: '<p>test</p>' })
    assert.equal(status, 200)
  })
})

describe('POST /v1/webdatalane - invalid JSON', () => {
  it('returns 400 for malformed body', async () => {
    const { status } = await new Promise<{ status: number; data: unknown }>((resolve) => {
      const req = http.request(`${BASE}/v1/webdatalane/markdown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, (res) => {
        let data = ''
        res.on('data', (chunk: string) => data += chunk)
        res.on('end', () => resolve({ status: res.statusCode || 500, data }))
      })
      req.write('not-json')
      req.end()
    })
    assert.equal(status, 400)
  })
})

describe('GET wrong path', () => {
  it('returns 405 for GET on POST routes', async () => {
    const { status } = await get('/v1/webdatalane/markdown')
    assert.equal(status, 405)
  })
})

describe('POST unknown path', () => {
  it('returns 404', async () => {
    const { status } = await post('/v1/webdatalane/unknown', {})
    assert.equal(status, 404)
  })
})
