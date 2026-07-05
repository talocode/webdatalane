import { config } from './config.js'
import type {
  ClientConfig,
  FetchInput,
  ExtractInput,
  MarkdownInput,
  MetadataInput,
  LinksInput,
  StructuredInput,
  CrawlPlanInput,
  ScreenshotInput,
  FetchResponse,
  ExtractResponse,
  MarkdownResponse,
  MetadataResponse,
  LinksResponse,
  StructuredResponse,
  CrawlPlanResponse,
  HealthResponse,
  ErrorResponse,
} from './types.js'
import {
  WebDataLaneAuthError,
  WebDataLaneInsufficientCreditsError,
  WebDataLaneValidationError,
  WebDataLaneSafetyError,
  WebDataLaneUnsupportedError,
} from './errors.js'

export class WebDataLaneClient {
  private apiKey: string
  private baseUrl: string

  constructor(opts?: ClientConfig) {
    this.apiKey = opts?.apiKey || config.talocodeApiKey
    this.baseUrl = (opts?.baseUrl || config.talocodeBaseUrl).replace(/\/+$/, '')
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({})) as ErrorResponse
      const message = errorBody.error?.message || `HTTP ${response.status}`

      switch (response.status) {
        case 401:
          throw new WebDataLaneAuthError(message)
        case 402:
          throw new WebDataLaneInsufficientCreditsError(message)
        case 400:
          if (errorBody.error?.code === 'URL_BLOCKED') {
            throw new WebDataLaneSafetyError(message)
          }
          throw new WebDataLaneValidationError(message)
        case 501:
          throw new WebDataLaneUnsupportedError(message)
        default:
          throw new Error(message)
      }
    }

    return response.json() as Promise<T>
  }

  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>('GET', '/v1/webdatalane/health')
  }

  async fetch(input: FetchInput): Promise<FetchResponse> {
    return this.request<FetchResponse>('POST', '/v1/webdatalane/fetch', input)
  }

  async extract(input: ExtractInput): Promise<ExtractResponse> {
    return this.request<ExtractResponse>('POST', '/v1/webdatalane/extract', input)
  }

  async markdown(input: MarkdownInput): Promise<MarkdownResponse> {
    return this.request<MarkdownResponse>('POST', '/v1/webdatalane/markdown', input)
  }

  async metadata(input: MetadataInput): Promise<MetadataResponse> {
    return this.request<MetadataResponse>('POST', '/v1/webdatalane/metadata', input)
  }

  async links(input: LinksInput): Promise<LinksResponse> {
    return this.request<LinksResponse>('POST', '/v1/webdatalane/links', input)
  }

  async structured(input: StructuredInput): Promise<StructuredResponse> {
    return this.request<StructuredResponse>('POST', '/v1/webdatalane/structured', input)
  }

  get crawl() {
    return {
      plan: (input: CrawlPlanInput) =>
        this.request<CrawlPlanResponse>('POST', '/v1/webdatalane/crawl/plan', input),
    }
  }

  async screenshot(input: ScreenshotInput): Promise<never> {
    throw new WebDataLaneUnsupportedError(
      'Screenshot capture requires browser rendering support, which is not included in WebDataLane v0.1.'
    )
  }
}

export function createWebDataLaneClient(opts?: ClientConfig): WebDataLaneClient {
  return new WebDataLaneClient(opts)
}
