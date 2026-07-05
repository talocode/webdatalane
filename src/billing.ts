import crypto from 'node:crypto'
import { config } from './config.js'
import type { BillingResult } from './types.js'

export const PRICING: Record<string, number> = {
  'webdatalane.fetch': 5,
  'webdatalane.extract': 10,
  'webdatalane.markdown': 10,
  'webdatalane.metadata': 5,
  'webdatalane.links': 5,
  'webdatalane.structured': 20,
  'webdatalane.crawl.plan': 15,
  'webdatalane.screenshot': 50,
}

export async function chargeCredits(
  action: string,
  credits: number,
  metadata?: Record<string, unknown>,
): Promise<BillingResult> {
  const apiKey = config.talocodeApiKey
  if (!apiKey) {
    return { success: false, error: 'TALOCODE_API_KEY not configured' }
  }

  const idempotencyKey = crypto.randomUUID()

  try {
    const response = await fetch(`${config.talocodeBaseUrl}/api/v1/cloud/usage/charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        product: 'webdatalane',
        action,
        credits,
        metadata: {
          product: 'webdatalane',
          action,
          credits,
          route: metadata?.route,
          mode: metadata?.mode,
          inputType: metadata?.inputType,
          inputSize: metadata?.inputSize,
          urlHost: metadata?.urlHost,
          ...metadata,
        },
      }),
    })

    if (response.status === 401) {
      return { success: false, error: 'Invalid or expired TALOCODE_API_KEY' }
    }

    if (response.status === 402) {
      const body = await response.json().catch(() => ({}))
      return { success: false, error: body.error || 'Insufficient credits' }
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      return { success: false, error: body.error || `Billing service error: ${response.status}` }
    }

    const body = await response.json()
    return { success: true, remainingCredits: body.remainingCredits }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown billing error'
    return { success: false, error: message }
  }
}
