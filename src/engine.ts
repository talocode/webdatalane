import type {
  MarkdownOptions,
  LinkInfo,
  ImageInfo,
  HeadingInfo,
  TableInfo,
  MetadataInfo,
  CrawlPlanOptions,
  CrawlPlanResult,
  StructuredResult,
} from './types.js'
import { isInternalLink } from './url-safety.js'

export function htmlToText(html: string): string {
  if (!html) return ''

  let text = html
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
  text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/p>/gi, '\n\n')
  text = text.replace(/<\/h[1-6]>/gi, '\n\n')
  text = text.replace(/<\/li>/gi, '\n')
  text = text.replace(/<\/div>/gi, '\n')
  text = text.replace(/<\/tr>/gi, '\n')
  text = text.replace(/<\/td>/gi, ' | ')
  text = text.replace(/<\/th>/gi, ' | ')
  text = text.replace(/<[^>]+>/g, '')
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  text = text.replace(/\n{3,}/g, '\n\n')
  text = text.replace(/[ \t]+/g, ' ')
  text = text.replace(/^\s+|\s+$/gm, '')
  text = text.trim()

  return text
}

export function htmlToMarkdown(html: string, options?: MarkdownOptions): string {
  if (!html) return ''

  let md = html

  md = md.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  md = md.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')

  if (options?.stripNavigation) {
    md = md.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    md = md.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    md = md.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
  }

  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n')
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n')
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n')
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '#### $1\n\n')
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '##### $1\n\n')
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '###### $1\n\n')

  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
  md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
  md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')

  if (options?.includeLinks !== false) {
    md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
  } else {
    md = md.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1')
  }

  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)')

  md = md.replace(/<br\s*\/?>/gi, '\n')
  md = md.replace(/<hr\s*\/?>/gi, '\n---\n')
  md = md.replace(/<\/p>/gi, '\n\n')
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')

  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, '\n$1\n')
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, '\n$1\n')

  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '\n```\n$1\n```\n')

  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '> $1\n\n')

  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match: string) => {
    const rows = match.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
    if (rows.length === 0) return ''
    const lines: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i].match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []
      const rowData = cells.map((c: string) => {
        const inner = c.replace(/<t[dh][^>]*>/gi, '').replace(/<\/t[dh]>/gi, '').trim()
        return inner.replace(/\|/g, '\\|')
      })
      lines.push('| ' + rowData.join(' | ') + ' |')
      if (i === 0) {
        lines.push('| ' + rowData.map(() => '---').join(' | ') + ' |')
      }
    }

    return '\n' + lines.join('\n') + '\n\n'
  })

  md = md.replace(/<[^>]+>/g, '')

  md = md.replace(/&nbsp;/g, ' ')
  md = md.replace(/&amp;/g, '&')
  md = md.replace(/&lt;/g, '<')
  md = md.replace(/&gt;/g, '>')
  md = md.replace(/&quot;/g, '"')
  md = md.replace(/&#39;/g, "'")

  md = md.replace(/\n{4,}/g, '\n\n\n')
  md = md.replace(/[ \t]+/g, ' ')
  md = md.replace(/^\s+|\s+$/gm, '')
  md = md.trim()

  return md
}

export function extractMetadata(html: string, url?: string): MetadataInfo {
  const result: MetadataInfo = {
    openGraph: {},
    twitter: {},
    jsonLdCount: 0,
  }

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (titleMatch) result.title = titleMatch[1].trim()

  const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i) ||
    html.match(/<meta[^>]*content="([^"]*)"[^>]*name="description"[^>]*>/i)
  if (descMatch) result.description = descMatch[1]

  const canonicalMatch = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"[^>]*>/i)
  if (canonicalMatch) result.canonical = canonicalMatch[1]

  const langMatch = html.match(/<html[^>]*lang="([^"]*)"[^>]*>/i)
  if (langMatch) result.language = langMatch[1].split('-')[0]

  const ogMatches = html.matchAll(/<meta[^>]*property="og:([^"]*)"[^>]*content="([^"]*)"[^>]*>/gi)
  for (const m of ogMatches) {
    result.openGraph[m[1]] = m[2]
  }

  const ogAlt = html.matchAll(/<meta[^>]*content="([^"]*)"[^>]*property="og:([^"]*)"[^>]*>/gi)
  for (const m of ogAlt) {
    result.openGraph[m[2]] = m[1]
  }

  const twitterMatches = html.matchAll(/<meta[^>]*name="twitter:([^"]*)"[^>]*content="([^"]*)"[^>]*>/gi)
  for (const m of twitterMatches) {
    result.twitter[m[1]] = m[2]
  }

  const twitterAlt = html.matchAll(/<meta[^>]*content="([^"]*)"[^>]*name="twitter:([^"]*)"[^>]*>/gi)
  for (const m of twitterAlt) {
    result.twitter[m[2]] = m[1]
  }

  if (!result.title && url) {
    try {
      const parsed = new URL(url)
      result.title = parsed.hostname
    } catch { }
  }

  const jsonLdScripts = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
  if (jsonLdScripts) {
    result.jsonLdCount = jsonLdScripts.length
  }

  return result
}

export function extractLinks(html: string, baseUrl?: string): LinkInfo[] {
  const links: LinkInfo[] = []
  const seen = new Set<string>()

  const anchorMatches = html.matchAll(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)
  for (const m of anchorMatches) {
    let href = m[1].trim()
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue

    try {
      const resolved = baseUrl ? new URL(href, baseUrl).href : new URL(href).href
      const normalized = resolved.replace(/\/$/, '')
      if (seen.has(normalized)) continue
      seen.add(normalized)

      const innerText = m[2].replace(/<[^>]+>/g, '').trim()
      const internal = baseUrl ? isInternalLink(href, baseUrl) : true

      links.push({
        url: normalized,
        text: innerText || normalized,
        internal,
      })
    } catch {
      continue
    }
  }

  return links
}

export function extractHeadings(html: string): HeadingInfo[] {
  const headings: HeadingInfo[] = []
  for (let level = 1; level <= 6; level++) {
    const regex = new RegExp('<h' + level + '[^>]*>([^]*?)<\\/h' + level + '>', 'gi')
    const matches = html.matchAll(regex)
    for (const m of matches) {
      const text = m[1].replace(/<[^>]+>/g, '').trim()
      if (text) {
        headings.push({ level, text })
      }
    }
  }
  return headings
}

export function extractImages(html: string, baseUrl?: string): ImageInfo[] {
  const images: ImageInfo[] = []
  const seen = new Set<string>()

  const imgMatches = html.matchAll(/<img[^>]*src="([^"]*)"[^>]*>/gi)
  for (const m of imgMatches) {
    let src = m[1].trim()
    if (!src) continue
    if (src.startsWith('data:')) continue

    try {
      const resolved = baseUrl ? new URL(src, baseUrl).href : new URL(src).href
      if (seen.has(resolved)) continue
      seen.add(resolved)

      const altMatch = m[0].match(/alt="([^"]*)"/i)
      const alt = altMatch ? altMatch[1] : ''

      images.push({ src: resolved, alt })
    } catch {
      continue
    }
  }

  return images
}

export function extractJsonLd(html: string): unknown[] {
  const results: unknown[] = []

  const scriptMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
  for (const m of scriptMatches) {
    try {
      const parsed = JSON.parse(m[1].trim())
      if (Array.isArray(parsed)) {
        results.push(...parsed)
      } else {
        results.push(parsed)
      }
    } catch {
      continue
    }
  }

  return results
}

export function extractTables(html: string): TableInfo[] {
  const tables: TableInfo[] = []

  const tableMatches = html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)
  for (const tm of tableMatches) {
    const rows = tm[1].match(/<tr[^>]*>[\s\S]*?<\/tr>/gi)
    if (!rows || rows.length === 0) continue

    const headers: string[] = []
    const dataRows: string[][] = []
    let headerParsed = false

    for (const row of rows) {
      const thCells = row.match(/<th[^>]*>([\s\S]*?)<\/th>/gi)
      if (thCells && !headerParsed) {
        headerParsed = true
        for (const th of thCells) {
          const text = th.replace(/<th[^>]*>/gi, '').replace(/<\/th>/gi, '').replace(/<[^>]+>/g, '').trim()
          headers.push(text)
        }
        continue
      }

      const tdCells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi)
      if (tdCells) {
        const rowData: string[] = []
        for (const td of tdCells) {
          const text = td.replace(/<td[^>]*>/gi, '').replace(/<\/td>/gi, '').replace(/<[^>]+>/g, '').trim()
          rowData.push(text)
        }
        dataRows.push(rowData)
      }
    }

    tables.push({ headers, rows: dataRows })
  }

  return tables
}

export function extractReadableContent(html: string): string {
  let content = html

  content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  content = content.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
  content = content.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
  content = content.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
  content = content.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, ' ')
  content = content.replace(/<form[^>]*>[\s\S]*?<\/form>/gi, ' ')
  content = content.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')

  const mainMatch = content.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
  if (mainMatch) content = mainMatch[1]

  const articleMatch = content.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
  if (articleMatch) content = articleMatch[1]

  content = content.replace(/<h[1-6][^>]*>/gi, '\n\n')
  content = content.replace(/<\/h[1-6]>/gi, '\n')
  content = content.replace(/<p[^>]*>/gi, '\n\n')
  content = content.replace(/<\/p>/gi, '')
  content = content.replace(/<br\s*\/?>/gi, '\n')
  content = content.replace(/<li[^>]*>/gi, '\n- ')
  content = content.replace(/<\/li>/gi, '')
  content = content.replace(/<[^>]+>/g, '')
  content = content.replace(/&nbsp;/g, ' ')
  content = content.replace(/&amp;/g, '&')
  content = content.replace(/&lt;/g, '<')
  content = content.replace(/&gt;/g, '>')
  content = content.replace(/&quot;/g, '"')
  content = content.replace(/&#39;/g, "'")
  content = content.replace(/\n{4,}/g, '\n\n\n')
  content = content.replace(/[ \t]+/g, ' ')
  content = content.replace(/^\s+|\s+$/gm, '')
  content = content.trim()

  return content
}

export function extractStructured(
  html: string,
  schema: Record<string, string>,
  hints?: Record<string, string[]>,
): StructuredResult {
  const data: Record<string, string> = {}
  const warnings: string[] = []
  const text = htmlToText(html)
  let totalFields = 0
  let foundFields = 0

  for (const [field, type] of Object.entries(schema)) {
    totalFields++
    const fieldHints = hints?.[field] || [field]
    let value: string | undefined

    for (const hint of fieldHints) {
      if (hint.startsWith('og:')) {
        const ogProp = hint.slice(3)
        const ogMatch = html.match(
          new RegExp(`<meta[^>]*property="og:${escapeRegex(ogProp)}"[^>]*content="([^"]*)"[^>]*>`, 'i')
        ) || html.match(
          new RegExp(`<meta[^>]*content="([^"]*)"[^>]*property="og:${escapeRegex(ogProp)}"[^>]*>`, 'i')
        )
        if (ogMatch) {
          value = ogMatch[1]
          break
        }
      }

      if (hint.startsWith('meta:')) {
        const metaName = hint.slice(5)
        const metaMatch = html.match(
          new RegExp(`<meta[^>]*name="${escapeRegex(metaName)}"[^>]*content="([^"]*)"[^>]*>`, 'i')
        ) || html.match(
          new RegExp(`<meta[^>]*content="([^"]*)"[^>]*name="${escapeRegex(metaName)}"[^>]*>`, 'i')
        )
        if (metaMatch) {
          value = metaMatch[1]
          break
        }
      }

      if (hint.startsWith('#')) {
        const id = hint.slice(1)
        const idMatch = html.match(
          new RegExp('<[^>]*id="' + escapeRegex(id) + '"[^>]*>([^]*?)<\\/[^>]+>', 'i')
        ) || html.match(
          new RegExp('<[^>]*id="' + escapeRegex(id) + '"[^>]*>', 'i')
        )
        if (idMatch) {
          value = htmlToText(idMatch[1] || idMatch[0]).substring(0, 500)
          break
        }
      }

      if (hint.startsWith('.')) {
        const cls = hint.slice(1)
        const clsMatch = html.match(
          new RegExp('<[^>]*class="[^"]*' + escapeRegex(cls) + '[^"]*"[^>]*>([^]*?)<\\/[^>]+>', 'i')
        )
        if (clsMatch) {
          value = htmlToText(clsMatch[1]).substring(0, 500)
          break
        }
      }

      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(hint)) {
        const headingMatch = html.match(
          new RegExp('<' + hint + '[^>]*>([^]*?)<\\/' + hint + '>', 'i')
        )
        if (headingMatch) {
          value = headingMatch[1].replace(/<[^>]+>/g, '').trim()
          break
        }
      }

      if (hint === 'title') {
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
        if (titleMatch) {
          value = titleMatch[1].trim()
          break
        }
      }

      const hintEscaped = escapeRegex(hint)
      const lineMatch = text.match(new RegExp(`[^\\n]*${hintEscaped}[^\\n]*`, 'i'))
      if (lineMatch) {
        const line = lineMatch[0]
        const afterColon = line.split(/:\s*/)
        if (afterColon.length > 1) {
          value = afterColon.slice(1).join(': ').trim()
          break
        }
        value = line.trim().substring(0, 200)
        break
      }
    }

    if (value) {
      if (type === 'number' || type === 'float') {
        const numMatch = value.match(/[\d,]+\.?\d*/)
        if (numMatch) {
          data[field] = numMatch[0].replace(/,/g, '')
        } else {
          data[field] = value
        }
      } else {
        data[field] = value
      }
      foundFields++
    } else {
      data[field] = ''
      warnings.push(`Could not extract field: ${field}`)
    }
  }

  const confidence = totalFields > 0 ? foundFields / totalFields : 0

  return {
    data,
    confidence: Math.round(confidence * 100) / 100,
    warnings,
  }
}

export function crawlPlan(html: string, url: string, options?: CrawlPlanOptions): CrawlPlanResult {
  const allLinks = extractLinks(html, url)
  const maxPages = options?.maxPages || 10
  const sameDomainOnly = options?.sameDomainOnly !== false
  const includePatterns = options?.includePatterns || []
  const excludePatterns = options?.excludePatterns || []

  const urls: LinkInfo[] = []
  const skipped: LinkInfo[] = []

  for (const link of allLinks) {
    if (sameDomainOnly && !link.internal) {
      skipped.push(link)
      continue
    }

    if (includePatterns.length > 0) {
      const matchesInclude = includePatterns.some(p => new RegExp(p).test(link.url))
      if (!matchesInclude) {
        skipped.push(link)
        continue
      }
    }

    if (excludePatterns.length > 0) {
      const matchesExclude = excludePatterns.some(p => new RegExp(p).test(link.url))
      if (matchesExclude) {
        skipped.push(link)
        continue
      }
    }

    urls.push(link)

    if (urls.length >= maxPages) break
  }

  const estimatedCredits = urls.length * 10

  return {
    seedUrl: url,
    urls,
    skipped,
    estimatedCredits,
  }
}

export function fetchAndExtract(input: { url?: string; html?: string; include?: string[]; timeoutMs?: number }): {
  extracted: Omit<import('./types.js').ExtractResult, 'url' | 'title' | 'description' | 'metadata'>
  warnings: string[]
  title?: string
  description?: string
  metadata: MetadataInfo
} {
  const html = input.html || ''
  const include = input.include || ['metadata', 'links', 'markdown', 'headings']
  const warnings: string[] = []

  const result: ReturnType<typeof fetchAndExtract> = {
    extracted: {
      headings: [],
      links: [],
      images: [],
      jsonLd: [],
      tables: [],
      warnings: [],
    },
    warnings,
    metadata: { openGraph: {}, twitter: {}, jsonLdCount: 0 },
  }

  if (!html) {
    warnings.push('No HTML content provided')
    return result
  }

  const metadata = extractMetadata(html, input.url)
  result.metadata = metadata

  if (include.includes('links')) {
    result.extracted.links = extractLinks(html, input.url)
  }
  if (include.includes('headings')) {
    result.extracted.headings = extractHeadings(html)
  }
  if (include.includes('images')) {
    result.extracted.images = extractImages(html, input.url)
  }
  if (include.includes('jsonLd')) {
    result.extracted.jsonLd = extractJsonLd(html)
  }
  if (include.includes('tables')) {
    result.extracted.tables = extractTables(html)
  }

  return result
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
