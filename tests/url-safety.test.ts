import { describe, it } from 'node:test'
import { strict as assert } from 'node:assert'
import { validateUrl, isInternalLink } from '../src/url-safety.js'

describe('validateUrl', () => {
  it('allows valid https URLs', () => {
    const url = validateUrl('https://example.com')
    assert.equal(url.hostname, 'example.com')
  })

  it('allows valid http URLs', () => {
    const url = validateUrl('http://example.com')
    assert.equal(url.hostname, 'example.com')
  })

  describe('blocks localhost', () => {
    it('blocks localhost', () => {
      assert.throws(() => validateUrl('http://localhost'), /Blocked/)
    })

    it('blocks 127.0.0.1', () => {
      assert.throws(() => validateUrl('http://127.0.0.1'), /Blocked/)
    })

    it('blocks 0.0.0.0', () => {
      assert.throws(() => validateUrl('http://0.0.0.0'), /Blocked/)
    })

    it('blocks ::1', () => {
      assert.throws(() => validateUrl('http://[::1]'), /Blocked/)
    })
  })

  describe('blocks private IP ranges', () => {
    it('blocks 10.x.x.x', () => {
      assert.throws(() => validateUrl('http://10.0.0.1'), /Blocked/)
    })

    it('blocks 172.16.x.x', () => {
      assert.throws(() => validateUrl('http://172.16.0.1'), /Blocked/)
    })

    it('blocks 192.168.x.x', () => {
      assert.throws(() => validateUrl('http://192.168.1.1'), /Blocked/)
    })
  })

  describe('blocks dangerous schemes', () => {
    it('blocks file://', () => {
      assert.throws(() => validateUrl('file:///etc/passwd'), /Blocked/)
    })

    it('blocks ftp://', () => {
      assert.throws(() => validateUrl('ftp://example.com'), /Blocked/)
    })

    it('blocks data:', () => {
      assert.throws(() => validateUrl('data:text/html,<script>'), /Blocked/)
    })

    it('blocks javascript:', () => {
      assert.throws(() => validateUrl('javascript:void(0)'), /Blocked/)
    })

    it('blocks blob:', () => {
      assert.throws(() => validateUrl('blob:uuid'), /Blocked/)
    })
  })

  it('blocks link-local addresses', () => {
    assert.throws(() => validateUrl('http://fe80::1'), /Blocked/)
  })

  it('blocks metadata IP 169.254.169.254', () => {
    assert.throws(() => validateUrl('http://169.254.169.254'), /Blocked/)
  })

  it('blocks .internal hosts', () => {
    assert.throws(() => validateUrl('http://host.internal'), /Blocked/)
  })

  it('throws on invalid URL format', () => {
    assert.throws(() => validateUrl('not a url'), /Invalid URL/)
  })

  it('blocks http-only when allowHttpOnly is true', () => {
    assert.throws(() => validateUrl('ftp://example.com', true), /Blocked/)
  })
})

describe('isInternalLink', () => {
  it('returns true for same hostname', () => {
    assert.equal(isInternalLink('/about', 'https://example.com'), true)
  })

  it('returns true for same hostname absolute', () => {
    assert.equal(isInternalLink('https://example.com/page', 'https://example.com'), true)
  })

  it('returns false for different hostname', () => {
    assert.equal(isInternalLink('https://other.com', 'https://example.com'), false)
  })

  it('returns false for invalid base URL', () => {
    assert.equal(isInternalLink('https://example.com', ''), false)
  })
})
