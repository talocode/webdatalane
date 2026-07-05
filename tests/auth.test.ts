import { describe, it, mock } from 'node:test'
import { strict as assert } from 'node:assert'
import { extractApiKey, redactApiKey, validateApiKey, requireAuth } from '../src/auth.js'
import type { IncomingMessage } from 'node:http'

function mockRequest(headers: Record<string, string>): IncomingMessage {
  return { headers } as unknown as IncomingMessage
}

describe('extractApiKey', () => {
  it('extracts from Authorization Bearer header', () => {
    const key = extractApiKey(mockRequest({ authorization: 'Bearer tc_12345' }))
    assert.equal(key, 'tc_12345')
  })

  it('extracts from X-Api-Key header', () => {
    const key = extractApiKey(mockRequest({ 'x-api-key': 'tc_67890' }))
    assert.equal(key, 'tc_67890')
  })

  it('returns null when no auth header present', () => {
    const key = extractApiKey(mockRequest({}))
    assert.equal(key, null)
  })

  it('returns null for non-Bearer Authorization', () => {
    const key = extractApiKey(mockRequest({ authorization: 'Basic abc' }))
    assert.equal(key, null)
  })
})

describe('redactApiKey', () => {
  it('redacts long keys', () => {
    const redacted = redactApiKey('tc_abcdef123456')
    assert.equal(redacted, 'tc_a...3456')
  })

  it('redacts short keys', () => {
    const redacted = redactApiKey('1234')
    assert.equal(redacted, '****')
  })
})

describe('validateApiKey', () => {
  it('accepts non-empty string', () => {
    assert.equal(validateApiKey('tc_key'), true)
  })

  it('rejects empty string', () => {
    assert.equal(validateApiKey(''), false)
  })

  it('rejects nullish', () => {
    assert.equal(validateApiKey(null as unknown as string), false)
  })
})

describe('requireAuth', () => {
  it('returns key on valid auth', () => {
    const key = requireAuth(mockRequest({ authorization: 'Bearer valid_key' }))
    assert.equal(key, 'valid_key')
  })

  it('throws on missing auth', () => {
    assert.throws(() => requireAuth(mockRequest({})), /API key/)
  })

  it('throws on empty key', () => {
    assert.throws(() => requireAuth(mockRequest({ authorization: 'Bearer ' })), /API key/)
  })
})
