# WebDataLane v0.1 — Web Extraction API

**Turn webpages into clean markdown, metadata, links, and structured data through one API.**

## @talocode Announcement

We're shipping WebDataLane v0.1 — a web extraction API that turns any URL or HTML into clean, structured data. Markdown, metadata, links, headings, images, JSON-LD, tables, and custom field extraction — all through one API.

## Story

Ever tried to feed a webpage to an LLM and got a mess of navigation, ads, and inline scripts? WebDataLane strips away the noise and gives you clean content your AI can actually work with.

## Technical Release Notes

**API Routes:**
- POST /v1/webdatalane/fetch — Fetch URL (5 credits)
- POST /v1/webdatalane/extract — Full extraction (10 credits)
- POST /v1/webdatalane/markdown — Markdown conversion (10 credits)
- POST /v1/webdatalane/metadata — Metadata extraction (5 credits)
- POST /v1/webdatalane/links — Link discovery (5 credits)
- POST /v1/webdatalane/structured — Structured extraction (20 credits)
- POST /v1/webdatalane/crawl/plan — Crawl planning (15 credits)

**CLI:** `webdatalane markdown --url <url>`, `webdatalane metadata --url <url>`, etc.

**SDK:** `WebDataLaneClient` with `markdown()`, `metadata()`, `links()`, `structured()`, `crawl.plan()` methods.

**Local helpers:** Work without any API key — pure TypeScript functions for HTML processing.

**URL safety:** SSRF protection blocks private IPs, localhost, metadata endpoints, and dangerous schemes.

**Limitations (v0.1):**
- No browser rendering or screenshot support
- No CAPTCHA/paywall/login bypassing
- Deterministic pattern-based parsing

## Install

```bash
npm install @talocode/webdatalane
```

## Quick Example

```ts
import { WebDataLaneClient } from '@talocode/webdatalane'

const client = new WebDataLaneClient({ apiKey: 'tc_...' })

const page = await client.markdown({
  url: 'https://example.com'
})

console.log(page.result.markdown)
```
