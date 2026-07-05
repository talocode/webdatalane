import { readFileSync } from 'node:fs'
import { htmlToMarkdown, htmlToText, extractMetadata, extractLinks, extractStructured, crawlPlan, extractHeadings, extractImages, extractJsonLd, extractTables } from './engine.js'
import { validateUrl } from './url-safety.js'
import { WebDataLaneSafetyError } from './errors.js'

function usage() {
  console.error('Usage:')
  console.error('  webdatalane fetch --url <url>')
  console.error('  webdatalane markdown --url <url>')
  console.error('  webdatalane markdown --file <file.html>')
  console.error('  webdatalane metadata --file <file.html>')
  console.error('  webdatalane metadata --url <url>')
  console.error('  webdatalane links --file <file.html> --base-url <url>')
  console.error('  webdatalane links --url <url>')
  console.error('  webdatalane structured --file <file.html> --schema <schema.json>')
  console.error('  webdatalane headings --file <file.html>')
  console.error('  webdatalane images --file <file.html> --base-url <url>')
  console.error('  webdatalane jsonld --file <file.html>')
  console.error('  webdatalane tables --file <file.html>')
  console.error('  webdatalane text --file <file.html>')
  console.error('  webdatalane text --url <url>')
  console.error('  webdatalane crawl-plan --file <file.html> --url <url> --max-pages <n>')
  console.error('  webdatalane crawl-plan --url <url> --max-pages <n>')
  console.error('  webdatalane whoami')
  console.error('  webdatalane config')
  console.error('  webdatalane --help')
  process.exit(1)
}

function parseArgs(): Record<string, string> {
  const args = process.argv.slice(2)
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') usage()

  const parsed: Record<string, string> = {}
  let command = ''
  for (let i = 0; i < args.length; i++) {
    if (!command && !args[i].startsWith('--')) {
      command = args[i]
      continue
    }
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2)
      const next = args[i + 1]
      if (next && !next.startsWith('--')) {
        parsed[key] = next
        i++
      } else {
        parsed[key] = 'true'
      }
    }
  }
  parsed['command'] = command
  return parsed
}

function readFile(path: string): string {
  try {
    return readFileSync(path, 'utf-8')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Error reading file: ${message}`)
    process.exit(1)
  }
}

function loadSchema(path: string): Record<string, string> {
  try {
    const content = readFileSync(path, 'utf-8')
    return JSON.parse(content) as Record<string, string>
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Error loading schema: ${message}`)
    process.exit(1)
  }
}

async function fetchPage(url: string): Promise<string> {
  try {
    validateUrl(url)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`URL blocked: ${message}`)
    process.exit(1)
  }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'WebDataLane/0.1' },
    })
    return await response.text()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Fetch error: ${message}`)
    process.exit(1)
  }
}

function printJson(data: unknown) {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n')
}

async function main() {
  try {
    const args = parseArgs()
    const command = args['command']

    if (!command) {
      usage()
      return
    }

    switch (command) {
      case 'fetch': {
        const url = args['url']
        if (!url) { console.error('Error: --url is required'); process.exit(1) }
        validateUrl(url)
        const response = await fetch(url, { headers: { 'User-Agent': 'WebDataLane/0.1' } })
        const html = await response.text()
        printJson({ url, status: response.status, bytes: html.length, text: htmlToText(html).substring(0, 1000) })
        break
      }

      case 'markdown': {
        const url = args['url']
        const file = args['file']
        const stripNav = args['strip-navigation'] === 'true'
        const includeLinks = args['include-links'] !== 'false'

        let html: string
        let sourceUrl: string | undefined

        if (url) {
          html = await fetchPage(url)
          sourceUrl = url
        } else if (file) {
          html = readFile(file)
        } else {
          console.error('Error: --url or --file is required')
          process.exit(1)
        }

        const md = htmlToMarkdown(html, { stripNavigation: stripNav, includeLinks })
        process.stdout.write(md + '\n')
        break
      }

      case 'metadata': {
        const url = args['url']
        const file = args['file']

        let html: string
        if (url) {
          html = await fetchPage(url)
        } else if (file) {
          html = readFile(file)
        } else {
          console.error('Error: --url or --file is required')
          process.exit(1)
        }

        const result = extractMetadata(html, url)
        printJson(result)
        break
      }

      case 'links': {
        const url = args['url']
        const file = args['file']
        const baseUrl = args['base-url'] || args['url']

        let html: string
        if (url) {
          html = await fetchPage(url)
        } else if (file) {
          html = readFile(file)
        } else {
          console.error('Error: --url or --file is required')
          process.exit(1)
        }

        if (!baseUrl && file) {
          console.error('Error: --base-url is required when using --file')
          process.exit(1)
        }

        const result = extractLinks(html, baseUrl)
        printJson({ count: result.length, links: result })
        break
      }

      case 'structured': {
        const url = args['url']
        const file = args['file']
        const schemaPath = args['schema']

        if (!schemaPath) {
          console.error('Error: --schema is required')
          process.exit(1)
        }

        let html: string
        if (url) {
          html = await fetchPage(url)
        } else if (file) {
          html = readFile(file)
        } else {
          console.error('Error: --url or --file is required')
          process.exit(1)
        }

        const schema = loadSchema(schemaPath)
        const result = extractStructured(html, schema)
        printJson(result)
        break
      }

      case 'headings': {
        const file = args['file']
        const url = args['url']
        let html: string
        if (file) html = readFile(file)
        else if (url) html = await fetchPage(url)
        else { console.error('Error: --url or --file is required'); process.exit(1) }
        printJson(extractHeadings(html))
        break
      }

      case 'images': {
        const file = args['file']
        const url = args['url']
        const baseUrl = args['base-url'] || url
        let html: string
        if (file) html = readFile(file)
        else if (url) html = await fetchPage(url)
        else { console.error('Error: --url or --file is required'); process.exit(1) }
        printJson(extractImages(html, baseUrl))
        break
      }

      case 'jsonld': {
        const file = args['file']
        const url = args['url']
        let html: string
        if (file) html = readFile(file)
        else if (url) html = await fetchPage(url)
        else { console.error('Error: --url or --file is required'); process.exit(1) }
        printJson(extractJsonLd(html))
        break
      }

      case 'tables': {
        const file = args['file']
        const url = args['url']
        let html: string
        if (file) html = readFile(file)
        else if (url) html = await fetchPage(url)
        else { console.error('Error: --url or --file is required'); process.exit(1) }
        printJson(extractTables(html))
        break
      }

      case 'text': {
        const file = args['file']
        const url = args['url']
        let html: string
        if (file) html = readFile(file)
        else if (url) html = await fetchPage(url)
        else { console.error('Error: --url or --file is required'); process.exit(1) }
        process.stdout.write(htmlToText(html) + '\n')
        break
      }

      case 'crawl-plan': {
        const url = args['url']
        const file = args['file']
        const maxPages = parseInt(args['max-pages'] || '10', 10)
        const sameDomain = args['same-domain'] !== 'false'

        let html: string
        let seedUrl: string

        if (url) {
          html = await fetchPage(url)
          seedUrl = url
        } else if (file) {
          html = readFile(file)
          seedUrl = args['url'] || ''
          if (!seedUrl) {
            console.error('Error: --url is required when using --file')
            process.exit(1)
          }
        } else {
          console.error('Error: --url or --file is required')
          process.exit(1)
        }

        const result = crawlPlan(html, seedUrl, { maxPages, sameDomainOnly: sameDomain })
        printJson(result)
        break
      }

      case 'whoami': {
        const apiKey = process.env.TALOCODE_API_KEY
        if (apiKey) {
          const redacted = apiKey.length > 8
            ? apiKey.slice(0, 4) + '...' + apiKey.slice(-4)
            : '****'
          console.log(`API Key: ${redacted}`)
          console.log('Status: configured')
        } else {
          console.log('API Key: not configured')
          console.log('Status: local mode (TALOCODE_API_KEY not set)')
        }
        break
      }

      case 'config': {
        console.log(`WEBDATALANE_ALLOW_LOCAL_UNAUTH=${process.env.WEBDATALANE_ALLOW_LOCAL_UNAUTH || 'true'}`)
        console.log(`TALOCODE_BASE_URL=${process.env.TALOCODE_BASE_URL || 'https://api.talocode.site'}`)
        console.log(`PORT=${process.env.PORT || '3020'}`)
        break
      }

      default:
        usage()
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Error: ${message}`)
    process.exit(1)
  }
}

main()
