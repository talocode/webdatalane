export class WebDataLaneError extends Error {
  code: string
  status: number

  constructor(message: string, code: string, status = 500) {
    super(message)
    this.name = 'WebDataLaneError'
    this.code = code
    this.status = status
  }
}

export class WebDataLaneAuthError extends WebDataLaneError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401)
    this.name = 'WebDataLaneAuthError'
  }
}

export class WebDataLaneInsufficientCreditsError extends WebDataLaneError {
  constructor(message = 'Insufficient credits') {
    super(message, 'INSUFFICIENT_CREDITS', 402)
    this.name = 'WebDataLaneInsufficientCreditsError'
  }
}

export class WebDataLaneValidationError extends WebDataLaneError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400)
    this.name = 'WebDataLaneValidationError'
  }
}

export class WebDataLaneRateLimitError extends WebDataLaneError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 'RATE_LIMITED', 429)
    this.name = 'WebDataLaneRateLimitError'
  }
}

export class WebDataLaneSafetyError extends WebDataLaneError {
  constructor(message: string) {
    super(message, 'URL_BLOCKED', 400)
    this.name = 'WebDataLaneSafetyError'
  }
}

export class BlockedError extends WebDataLaneSafetyError {
  constructor(message: string) {
    super(message)
    this.name = 'BlockedError'
  }
}

export class WebDataLaneUnsupportedError extends WebDataLaneError {
  constructor(message: string) {
    super(message, 'UNSUPPORTED', 501)
    this.name = 'WebDataLaneUnsupportedError'
  }
}
