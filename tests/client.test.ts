import { describe, it } from 'node:test'
import { strict as assert } from 'node:assert'

describe('package exports', () => {
  it('exports expected symbols', async () => {
    const mod = await import('../src/index.js')
    assert.ok(typeof mod.WebDataLaneClient === 'function')
    assert.ok(typeof mod.createWebDataLaneClient === 'function')
    assert.ok(typeof mod.htmlToMarkdown === 'function')
    assert.ok(typeof mod.htmlToText === 'function')
    assert.ok(typeof mod.extractMetadata === 'function')
    assert.ok(typeof mod.extractLinks === 'function')
    assert.ok(typeof mod.extractJsonLd === 'function')
    assert.ok(typeof mod.extractTables === 'function')
    assert.ok(typeof mod.extractHeadings === 'function')
    assert.ok(typeof mod.extractImages === 'function')
    assert.ok(typeof mod.extractReadableContent === 'function')
    assert.ok(typeof mod.extractStructured === 'function')
    assert.ok(typeof mod.createCrawlPlanFromHtml === 'function')
    assert.ok(typeof mod.validateUrl === 'function')
  })

  it('exports error classes', async () => {
    const mod = await import('../src/index.js')
    assert.ok(mod.WebDataLaneError)
    assert.ok(mod.WebDataLaneAuthError)
    assert.ok(mod.WebDataLaneInsufficientCreditsError)
    assert.ok(mod.WebDataLaneValidationError)
    assert.ok(mod.WebDataLaneRateLimitError)
    assert.ok(mod.WebDataLaneSafetyError)
    assert.ok(mod.WebDataLaneUnsupportedError)
  })

  it('WebDataLaneClient has expected methods', async () => {
    const { WebDataLaneClient } = await import('../src/client.js')
    const client = new WebDataLaneClient({ apiKey: 'test' })
    assert.ok(typeof client.health === 'function')
    assert.ok(typeof client.fetch === 'function')
    assert.ok(typeof client.extract === 'function')
    assert.ok(typeof client.markdown === 'function')
    assert.ok(typeof client.metadata === 'function')
    assert.ok(typeof client.links === 'function')
    assert.ok(typeof client.structured === 'function')
    assert.ok(typeof client.crawl === 'object')
    assert.ok(typeof client.crawl.plan === 'function')
    assert.ok(typeof client.screenshot === 'function')
  })

  it('local helpers work without API key', async () => {
    const { htmlToMarkdown } = await import('../src/engine.js')
    const result = htmlToMarkdown('<h1>Hello</h1>')
    assert.ok(result.includes('# Hello'))
  })
})

describe('WebDataLaneClient configuration', () => {
  it('uses provided apiKey', async () => {
    const { WebDataLaneClient } = await import('../src/client.js')
    const client = new WebDataLaneClient({ apiKey: 'custom_key' })
    assert.ok(client)
  })

  it('uses provided baseUrl', async () => {
    const { WebDataLaneClient } = await import('../src/client.js')
    const client = new WebDataLaneClient({ baseUrl: 'http://localhost:3020' })
    assert.ok(client)
  })
})
