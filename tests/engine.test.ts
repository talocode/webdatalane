import { describe, it } from 'node:test'
import { strict as assert } from 'node:assert'
import {
  htmlToText,
  htmlToMarkdown,
  extractMetadata,
  extractLinks,
  extractHeadings,
  extractImages,
  extractJsonLd,
  extractTables,
  extractStructured,
  crawlPlan,
} from '../src/engine.js'

const SAMPLE_HTML = `<html>
<head>
  <title>Test Page</title>
  <meta name="description" content="A sample test page">
  <link rel="canonical" href="https://example.com/page">
  <meta property="og:title" content="OG Test">
  <meta name="twitter:card" content="summary">
  <script type="application/ld+json">{"@type":"WebPage","name":"Test"}</script>
</head>
<body>
  <h1>Main Heading</h1>
  <h2>Sub Heading</h2>
  <p>Some <strong>bold</strong> and <em>italic</em> text.</p>
  <a href="/about">About Us</a>
  <a href="https://external.com">External</a>
  <img src="/logo.png" alt="Logo">
  <table>
    <tr><th>Name</th><th>Price</th></tr>
    <tr><td>Item A</td><td>$10</td></tr>
  </table>
  <script>var x = 1;</script>
</body>
</html>`

describe('htmlToText', () => {
  it('strips HTML tags', () => {
    const text = htmlToText('<p>Hello</p>')
    assert.equal(text, 'Hello')
  })

  it('converts line breaks', () => {
    const text = htmlToText('<p>Line 1</p><p>Line 2</p>')
    assert.ok(text.includes('Line 1'))
    assert.ok(text.includes('Line 2'))
  })

  it('strips script and style content', () => {
    const text = htmlToText('<script>alert(1)</script><p>Hello</p><style>.cls{}</style>')
    assert.equal(text, 'Hello')
  })

  it('decodes HTML entities', () => {
    const text = htmlToText('<p>&amp; &lt; &gt; &quot; &#39;</p>')
    assert.equal(text, '& < > " \'')
  })

  it('returns empty string for empty input', () => {
    assert.equal(htmlToText(''), '')
  })
})

describe('htmlToMarkdown', () => {
  it('converts headings', () => {
    const md = htmlToMarkdown('<h1>Title</h1><h2>Sub</h2>')
    assert.ok(md.includes('# Title'))
    assert.ok(md.includes('## Sub'))
  })

  it('converts bold and italic', () => {
    const md = htmlToMarkdown('<strong>bold</strong> <em>italic</em>')
    assert.ok(md.includes('**bold**'))
    assert.ok(md.includes('*italic*'))
  })

  it('converts links with includeLinks option', () => {
    const md = htmlToMarkdown('<a href="https://x.com">X</a>', { includeLinks: true })
    assert.ok(md.includes('[X](https://x.com)'))
  })

  it('strips links when includeLinks is false', () => {
    const md = htmlToMarkdown('<a href="https://x.com">X</a>', { includeLinks: false })
    assert.ok(md.includes('X'))
    assert.ok(!md.includes('](https://'))
  })

  it('converts images', () => {
    const md = htmlToMarkdown('<img src="pic.png" alt="Photo">')
    assert.ok(md.includes('![Photo](pic.png)'))
  })

  it('converts code blocks', () => {
    const md = htmlToMarkdown('<pre><code>const x = 1;</code></pre>')
    assert.ok(md.includes('```'))
  })

  it('strips navigation when option set', () => {
    const md = htmlToMarkdown('<nav>Links</nav><p>Content</p>', { stripNavigation: true })
    assert.ok(!md.includes('Links'))
    assert.ok(md.includes('Content'))
  })

  it('handles empty input', () => {
    assert.equal(htmlToMarkdown(''), '')
  })

  it('converts tables to markdown', () => {
    const md = htmlToMarkdown('<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>')
    assert.ok(md.includes('| A'))
    assert.ok(md.includes('| 1'))
  })
})

describe('extractMetadata', () => {
  it('extracts title from <title>', () => {
    const meta = extractMetadata(SAMPLE_HTML)
    assert.equal(meta.title, 'Test Page')
  })

  it('extracts description from meta tag', () => {
    const meta = extractMetadata(SAMPLE_HTML)
    assert.equal(meta.description, 'A sample test page')
  })

  it('extracts canonical URL', () => {
    const meta = extractMetadata(SAMPLE_HTML)
    assert.equal(meta.canonical, 'https://example.com/page')
  })

  it('extracts OpenGraph properties', () => {
    const meta = extractMetadata(SAMPLE_HTML)
    assert.equal(meta.openGraph.title, 'OG Test')
  })

  it('extracts Twitter card properties', () => {
    const meta = extractMetadata(SAMPLE_HTML)
    assert.equal(meta.twitter.card, 'summary')
  })

  it('counts JSON-LD scripts', () => {
    const meta = extractMetadata(SAMPLE_HTML)
    assert.equal(meta.jsonLdCount, 1)
  })

  it('extracts language from html tag', () => {
    const meta = extractMetadata('<html lang="fr-FR"><title>Bonjour</title></html>')
    assert.equal(meta.language, 'fr')
  })

  it('falls back to hostname for title', () => {
    const meta = extractMetadata('<html></html>', 'https://example.com')
    assert.equal(meta.title, 'example.com')
  })
})

describe('extractLinks', () => {
  it('extracts anchor hrefs', () => {
    const links = extractLinks(SAMPLE_HTML, 'https://example.com')
    assert.ok(links.length >= 2)
  })

  it('classifies internal links', () => {
    const links = extractLinks(SAMPLE_HTML, 'https://example.com')
    const about = links.find(l => l.url.includes('/about'))
    assert.ok(about)
    assert.equal(about!.internal, true)
  })

  it('classifies external links', () => {
    const links = extractLinks(SAMPLE_HTML, 'https://example.com')
    const ext = links.find(l => l.url.includes('external.com'))
    assert.ok(ext)
    assert.equal(ext!.internal, false)
  })

  it('skips fragment-only links', () => {
    const links = extractLinks('<a href="#section">Section</a>', 'https://example.com')
    assert.equal(links.length, 0)
  })

  it('skips javascript: links', () => {
    const links = extractLinks('<a href="javascript:void(0)">Click</a>')
    assert.equal(links.length, 0)
  })

  it('deduplicates same URLs', () => {
    const html = '<a href="/a">A</a><a href="/a">A again</a>'
    const links = extractLinks(html, 'https://example.com')
    assert.equal(links.length, 1)
  })
})

describe('extractHeadings', () => {
  it('extracts all heading levels', () => {
    const headings = extractHeadings(SAMPLE_HTML)
    assert.equal(headings.length, 2)
    assert.equal(headings[0].level, 1)
    assert.equal(headings[0].text, 'Main Heading')
    assert.equal(headings[1].level, 2)
  })

  it('handles no headings', () => {
    const headings = extractHeadings('<p>No headings</p>')
    assert.equal(headings.length, 0)
  })
})

describe('extractImages', () => {
  it('extracts image src and alt', () => {
    const images = extractImages(SAMPLE_HTML, 'https://example.com')
    assert.ok(images.length >= 1)
    assert.ok(images[0].src.includes('logo.png'))
    assert.equal(images[0].alt, 'Logo')
  })

  it('resolves relative URLs', () => {
    const images = extractImages('<img src="/img.png" alt="X">', 'https://site.com')
    assert.ok(images[0].src.includes('site.com'))
  })

  it('skips data URIs', () => {
    const images = extractImages('<img src="data:image/png;base64,abc" alt="X">')
    assert.equal(images.length, 0)
  })
})

describe('extractJsonLd', () => {
  it('extracts JSON-LD from scripts', () => {
    const result = extractJsonLd(SAMPLE_HTML)
    assert.equal(result.length, 1)
    assert.equal((result[0] as Record<string, string>).name, 'Test')
  })

  it('handles array JSON-LD', () => {
    const html = '<script type="application/ld+json">[{"a":1},{"b":2}]</script>'
    const result = extractJsonLd(html)
    assert.equal(result.length, 2)
  })

  it('ignores invalid JSON-LD', () => {
    const html = '<script type="application/ld+json">{invalid}</script>'
    const result = extractJsonLd(html)
    assert.equal(result.length, 0)
  })
})

describe('extractTables', () => {
  it('extracts table headers and rows', () => {
    const tables = extractTables(SAMPLE_HTML)
    assert.equal(tables.length, 1)
    assert.deepEqual(tables[0].headers, ['Name', 'Price'])
    assert.equal(tables[0].rows.length, 1)
  })

  it('handles no tables', () => {
    const tables = extractTables('<p>No table</p>')
    assert.equal(tables.length, 0)
  })
})

describe('extractStructured', () => {
  it('extracts fields from HTML', () => {
    const result = extractStructured(
      '<h1>Product Title</h1><p>Price: $29.99</p>',
      { title: 'string', price: 'string' },
      { title: ['h1'], price: ['Price'] },
    )
    assert.equal(result.data.title, 'Product Title')
    assert.ok(result.data.price)
    assert.ok(result.confidence >= 0)
  })

  it('uses og: hints for OpenGraph', () => {
    const result = extractStructured(
      '<meta property="og:title" content="OG Title"><title>Fallback</title>',
      { title: 'string' },
      { title: ['og:title'] },
    )
    assert.equal(result.data.title, 'OG Title')
  })

  it('uses title hint for <title>', () => {
    const result = extractStructured(
      '<title>Page Title</title>',
      { title: 'string' },
      { title: ['title'] },
    )
    assert.equal(result.data.title, 'Page Title')
  })

  it('reports warnings for missing fields', () => {
    const result = extractStructured('<p>No data</p>', { missing: 'string' })
    assert.ok(result.warnings.length > 0)
    assert.equal(result.data.missing, '')
  })
})

describe('crawlPlan', () => {
  const html = `<html>
    <a href="/page1">Page 1</a>
    <a href="/page2">Page 2</a>
    <a href="https://external.com">External</a>
  </html>`

  it('plans crawl from links', () => {
    const plan = crawlPlan(html, 'https://example.com', { maxPages: 5 })
    assert.equal(plan.seedUrl, 'https://example.com')
    assert.ok(plan.urls.length >= 2)
  })

  it('filters external links by default', () => {
    const plan = crawlPlan(html, 'https://example.com')
    const externals = plan.urls.filter(l => !l.internal)
    assert.equal(externals.length, 0)
  })

  it('includes external when sameDomainOnly is false', () => {
    const plan = crawlPlan(html, 'https://example.com', { sameDomainOnly: false })
    const externals = plan.urls.filter(l => !l.internal)
    assert.ok(externals.length > 0)
  })

  it('applies include patterns', () => {
    const plan = crawlPlan(html, 'https://example.com', {
      includePatterns: ['page1'],
    })
    assert.ok(plan.urls.every(l => l.url.includes('page1')))
  })

  it('applies exclude patterns', () => {
    const plan = crawlPlan(html, 'https://example.com', {
      excludePatterns: ['page2'],
    })
    assert.ok(plan.urls.every(l => !l.url.includes('page2')))
  })

  it('respects maxPages limit', () => {
    const plan = crawlPlan(html, 'https://example.com', { maxPages: 1 })
    assert.ok(plan.urls.length <= 1)
  })

  it('estimates credits', () => {
    const plan = crawlPlan(html, 'https://example.com', { maxPages: 3 })
    assert.equal(plan.estimatedCredits, plan.urls.length * 10)
  })
})
