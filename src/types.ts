export interface HealthResponse {
  ok: boolean
  service: string
  version: string
  timestamp: string
}

export interface FetchInput {
  url: string
  timeoutMs?: number
  userAgent?: string
  maxBytes?: number
}

export interface FetchResult {
  url: string
  status: number
  contentType: string
  finalUrl: string
  html: string
  text: string
  bytes: number
}

export interface FetchResponse {
  id: string
  object: string
  result: FetchResult
  usage: UsageInfo
}

export interface ExtractInput {
  url?: string
  html?: string
  include?: string[]
  timeoutMs?: number
}

export interface ExtractResult {
  url?: string
  title?: string
  description?: string
  markdown?: string
  text?: string
  headings: HeadingInfo[]
  links: LinkInfo[]
  images: ImageInfo[]
  jsonLd: unknown[]
  tables: TableInfo[]
  metadata: MetadataInfo
  warnings: string[]
}

export interface ExtractResponse {
  id: string
  object: string
  result: ExtractResult
  usage: UsageInfo
}

export interface MarkdownInput {
  url?: string
  html?: string
  stripNavigation?: boolean
  includeLinks?: boolean
}

export interface MarkdownResult {
  markdown: string
  title?: string
  sourceUrl?: string
  warnings: string[]
}

export interface MarkdownResponse {
  id: string
  object: string
  result: MarkdownResult
  usage: UsageInfo
}

export interface MetadataInput {
  url?: string
  html?: string
}

export interface MetadataInfo {
  title?: string
  description?: string
  canonical?: string
  language?: string
  openGraph: Record<string, string>
  twitter: Record<string, string>
  jsonLdCount: number
}

export interface MetadataResponse {
  id: string
  object: string
  result: MetadataInfo
  usage: UsageInfo
}

export interface LinksInput {
  url?: string
  html?: string
  internalOnly?: boolean
}

export interface LinkInfo {
  url: string
  text: string
  internal: boolean
}

export interface LinksResult {
  links: LinkInfo[]
  count: number
}

export interface LinksResponse {
  id: string
  object: string
  result: LinksResult
  usage: UsageInfo
}

export interface StructuredInput {
  url?: string
  html?: string
  schema: Record<string, string>
  hints?: Record<string, string[]>
}

export interface StructuredResult {
  data: Record<string, string>
  confidence: number
  warnings: string[]
}

export interface StructuredResponse {
  id: string
  object: string
  result: StructuredResult
  usage: UsageInfo
}

export interface CrawlPlanInput {
  url?: string
  html?: string
  maxPages?: number
  sameDomainOnly?: boolean
  includePatterns?: string[]
  excludePatterns?: string[]
}

export interface CrawlPlanResult {
  seedUrl: string
  urls: LinkInfo[]
  skipped: LinkInfo[]
  estimatedCredits: number
}

export interface CrawlPlanResponse {
  id: string
  object: string
  result: CrawlPlanResult
  usage: UsageInfo
}

export interface ScreenshotInput {
  url: string
  width?: number
  height?: number
  fullPage?: boolean
}

export interface UsageInfo {
  credits: number
  action: string
}

export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: string
  }
}

export interface BillingResult {
  success: boolean
  error?: string
  remainingCredits?: number
}

export interface MarkdownOptions {
  stripNavigation?: boolean
  includeLinks?: boolean
}

export interface CrawlPlanOptions {
  maxPages?: number
  sameDomainOnly?: boolean
  includePatterns?: string[]
  excludePatterns?: string[]
}

export interface StructuredExtractionOptions {
  schema: Record<string, string>
  hints?: Record<string, string[]>
}

export interface ImageInfo {
  src: string
  alt: string
  width?: number
  height?: number
}

export interface HeadingInfo {
  level: number
  text: string
}

export interface TableInfo {
  headers: string[]
  rows: string[][]
}

export interface ClientConfig {
  apiKey?: string
  baseUrl?: string
}
