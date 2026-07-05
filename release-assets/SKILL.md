# WebDataLane

Turn webpages into clean markdown, metadata, links, and structured data through one API.

## When to use WebDataLane

- Convert a webpage to clean markdown for LLM consumption
- Extract page metadata (title, description, OpenGraph, Twitter card)
- Discover all links on a page (internal vs external classification)
- Extract structured fields using schema + hints
- Plan a crawl from a seed URL
- Extract headings, images, JSON-LD, and tables from HTML

## How to extract markdown

Provide a URL. WebDataLane fetches it and returns clean markdown with optional navigation stripping.

## How to extract metadata

Provide a URL or raw HTML. WebDataLane extracts title, description, canonical URL, OpenGraph properties, Twitter card properties, and JSON-LD count.

## How to extract links

Provide a URL or raw HTML. WebDataLane returns all links classified as internal or external relative to a base URL.

## How to generate crawl plans

Provide a seed URL. WebDataLane discovers links, filters by domain and patterns, and returns an ordered crawl plan with estimated credit cost.

## What NOT to use it for

- CAPTCHA bypassing
- Login wall / paywall scraping
- Anti-bot evasion
- Sneaky or unauthorized data collection

## Limitations

- No browser rendering / screenshots in v0.1
- No CAPTCHA/paywall/login bypassing
- Deterministic pattern-based HTML parsing (not ML)
- Single-page extraction (use crawl/plan for discovery)
- Standard HTTP fetch only — no stealth/headless mode
