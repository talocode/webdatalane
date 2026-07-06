# WebDataLane

**Turn webpages into clean markdown, metadata, links, and structured data through one API.**

WebDataLane is a [Talocode](https://docs.talocode.site) web extraction product. Submit a URL or raw HTML and receive clean markdown, metadata, links, headings, images, JSON-LD, tables, and structured data.

> **v0.1** — Deterministic extraction from HTML/URL fetch. Browser rendering / screenshots not yet available.

---

## Quick Start

```bash
pnpm install @talocode/webdatalane
```

### API Key

```bash
export TALOCODE_API_KEY=tc_...
```

### Start the Server

```bash
pnpm dev
```

Server listens on `http://0.0.0.0:3020`.

---

## Routes

| Method | Path | Description | Credits |
|--------|------|-------------|--------|
| `GET` | `/health` | Health check | — |
| `GET` | `/v1/webdatalane/health` | Health check | — |
| `POST` | `/v1/webdatalane/fetch` | Fetch a URL | 5 |
| `POST` | `/v1/webdatalane/extract` | Full extraction | 10 |
| `POST` | `/v1/webdatalane/markdown` | Convert to markdown | 10 |
| `POST` | `/v1/webdatalane/metadata` | Extract metadata | 5 |
| `POST` | `/v1/webdatalane/links` | Extract links | 5 |
| `POST` | `/v1/webdatalane/structured` | Structured extraction | 20 |
| `POST` | `/v1/webdatalane/crawl/plan` | Crawl planning | 15 |
| `POST` | `/v1/webdatalane/screenshot` | Screenshot | 50* |

\* Screenshot returns `BROWSER_RENDERING_NOT_AVAILABLE` in v0.1.

### POST /v1/webdatalane/markdown

```json
{
  "url": "https://example.com",
  "stripNavigation": true
}
```

Response:

```json
{
  "id": "wdl_req_...",
  "object": "webdatalane.markdown",
  "result": {
    "markdown": "# Example Domain\n\nThis domain is for use...",
    "title": "Example Domain",
    "sourceUrl": "https://example.com",
    "warnings": []
  },
  "usage": { "credits": 10, "action": "webdatalane.markdown" }
}
```

---

## SDK Usage

```ts
import { WebDataLaneClient } from '@talocode/webdatalane'

const client = new WebDataLaneClient({ apiKey: 'tc_...' })

const page = await client.markdown({
  url: 'https://example.com'
})

console.log(page.result.markdown)
```

### Methods

- `client.health()` — Health check
- `client.fetch(input)` — Fetch URL
- `client.extract(input)` — Full extraction
- `client.markdown(input)` — Markdown conversion
- `client.metadata(input)` — Metadata extraction
- `client.links(input)` — Link extraction
- `client.structured(input)` — Structured extraction
- `client.crawl.plan(input)` — Crawl planning

---

## CLI Usage

```bash
# Convert URL to markdown
webdatalane markdown --url https://example.com

# Convert HTML file to markdown
webdatalane markdown --file page.html

# Extract metadata from URL
webdatalane metadata --url https://example.com

# Extract links
webdatalane links --url https://example.com

# Extract structured data
webdatalane structured --file page.html --schema schema.json

# Plan crawl
webdatalane crawl-plan --url https://example.com --max-pages 10

# Show config
webdatalane config
```

---

## Local Usage

Set `WEBDATALANE_ALLOW_LOCAL_UNAUTH=true` (the default) and use the SDK or CLI without an API key. Billing is skipped in local mode.

```bash
WEBDATALANE_ALLOW_LOCAL_UNAUTH=true pnpm dev
```

### Local Helpers

```ts
import { htmlToMarkdown, extractLinks, extractMetadata } from '@talocode/webdatalane'

const md = htmlToMarkdown('<h1>Hello</h1>')
const links = extractLinks(html, 'https://example.com')
const meta = extractMetadata(html)
```

---

## URL Safety

WebDataLane blocks dangerous URLs by default:
- Private IP ranges (10.x, 172.16-31.x, 192.168.x)
- localhost, 127.0.0.1, 0.0.0.0, ::1
- Link-local addresses
- Cloud metadata endpoints (169.254.169.254)
- file://, ftp://, data:, javascript:, blob: schemes

---

## Limitations (v0.1)

- **Browser rendering/screenshots not available** — Returns `BROWSER_RENDERING_NOT_AVAILABLE`
- **No CAPTCHA, login, or paywall bypassing** — Only public HTML content
- **Deterministic engine** — Pattern-based HTML parsing
- **Single-page extraction** — No multi-page crawling (use crawl/plan for discovery)
- **No anti-bot evasion** — Standard HTTP fetch only

---

## License

MIT

## Support

Open-source Talocode products are built and maintained by Abdulmuiz Adeyemo.

Sponsor the work: https://github.com/sponsors/Abdulmuiz44
