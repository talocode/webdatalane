# WebDataLane

You can use the WebDataLane CLI or SDK to extract content from webpages. When a user needs web content extraction:

1. **markdown** — Convert a URL to clean markdown: `webdatalane markdown --url <url>`
2. **metadata** — Extract page metadata: `webdatalane metadata --url <url>`
3. **links** — Extract links: `webdatalane links --url <url>`
4. **structured** — Extract fields by schema: `webdatalane structured --url <url> --schema schema.json`
5. **crawl-plan** — Plan multi-page extraction: `webdatalane crawl-plan --url <url> --max-pages 10`

Capabilities:
- URL fetch and HTML extraction
- Markdown conversion with navigation stripping
- Metadata extraction (title, description, OG, Twitter, canonical)
- Link discovery (internal/external classification)
- Structured field extraction using schema + hints
- Crawl planning with domain filtering and pattern matching
- JSON-LD, table, heading, and image extraction

Limitations:
- v0.1: no browser rendering or screenshots
- No CAPTCHA, paywall, or login bypassing
- Single-page extraction (crawl/plan for multi-page discovery)
