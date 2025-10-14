/**
 * Security utilities for input validation and sanitization
 */

export interface ValidationResult {
  isValid: boolean
  sanitized: string
  error?: string
}

/**
 * Validate and sanitize text input
 */
export function validateAndSanitizeText(
  input: string,
  maxLength: number,
  fieldName: string = 'Input'
): ValidationResult {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      sanitized: '',
      error: `${fieldName} is required`
    }
  }

  if (input.length > maxLength) {
    return {
      isValid: false,
      sanitized: '',
      error: `${fieldName} must be ${maxLength} characters or less`
    }
  }

  // Remove potential XSS vectors while preserving legitimate content
  const sanitized = input
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // Remove iframes
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .trim()

  return {
    isValid: true,
    sanitized,
    error: undefined
  }
}

/**
 * Validate Ethereum address format
 */
export function validateEthereumAddress(address: string): ValidationResult {
  if (!address || typeof address !== 'string') {
    return {
      isValid: false,
      sanitized: '',
      error: 'Wallet address is required'
    }
  }

  // Check basic format
  if (!address.startsWith('0x') || address.length !== 42) {
    return {
      isValid: false,
      sanitized: '',
      error: 'Invalid Ethereum address format'
    }
  }

  // Check for valid hex characters
  const validHex = /^0x[a-fA-F0-9]{40}$/.test(address)
  if (!validHex) {
    return {
      isValid: false,
      sanitized: '',
      error: 'Invalid Ethereum address characters'
    }
  }

  return {
    isValid: true,
    sanitized: address.toLowerCase(),
    error: undefined
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      sanitized: '',
      error: 'Email is required'
    }
  }

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      sanitized: '',
      error: 'Invalid email format'
    }
  }

  if (email.length > 254) { // Max email length per RFC
    return {
      isValid: false,
      sanitized: '',
      error: 'Email address too long'
    }
  }

  return {
    isValid: true,
    sanitized: email.toLowerCase().trim(),
    error: undefined
  }
}

/**
 * Sanitize filename to prevent directory traversal
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'untitled'
  }

  return filename
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[\/\\]/g, '') // Remove path separators
    .replace(/[<>:"|?*\x00-\x1f]/g, '') // Remove invalid filename characters
    .replace(/^\.+/, '') // Remove leading dots
    .trim()
    .substring(0, 255) // Limit filename length
    || 'untitled' // Fallback if everything is removed
}

/**
 * Sanitize file path to prevent directory traversal
 */
export function sanitizePath(userPath: string): string {
  if (!userPath || typeof userPath !== 'string') {
    return ''
  }

  // Remove any attempt at directory traversal
  return userPath
    .replace(/\.\./g, '')
    .replace(/[\/\\]+/g, '/') // Normalize path separators
    .replace(/^\/+/, '') // Remove leading slashes
    .toLowerCase()
}

/**
 * Validate IPFS hash format
 */
export function validateIPFSHash(hash: string): ValidationResult {
  if (!hash || typeof hash !== 'string') {
    return {
      isValid: false,
      sanitized: '',
      error: 'IPFS hash is required'
    }
  }

  // IPFS CIDv0 starts with Qm and is 46 characters
  // IPFS CIDv1 can start with different prefixes
  const isValidFormat = /^Qm[a-zA-Z0-9]{44}$/.test(hash) || // CIDv0
                        /^[a-z0-9]{59}$/.test(hash) || // CIDv1
                        hash.startsWith('QmMock') // Allow mock hashes for testing

  if (!isValidFormat) {
    return {
      isValid: false,
      sanitized: '',
      error: 'Invalid IPFS hash format'
    }
  }

  return {
    isValid: true,
    sanitized: hash.trim(),
    error: undefined
  }
}

/**
 * Validate URL format
 */
export function validateURL(url: string): ValidationResult {
  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      sanitized: '',
      error: 'URL is required'
    }
  }

  try {
    const urlObj = new URL(url)
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        isValid: false,
        sanitized: '',
        error: 'Only HTTP and HTTPS URLs are allowed'
      }
    }

    return {
      isValid: true,
      sanitized: url.trim(),
      error: undefined
    }
  } catch {
    return {
      isValid: false,
      sanitized: '',
      error: 'Invalid URL format'
    }
  }
}

/**
 * Validate numeric input within range
 */
export function validateNumber(
  value: any,
  min: number,
  max: number,
  fieldName: string = 'Value'
): { isValid: boolean; value: number; error?: string } {
  const num = Number(value)

  if (isNaN(num)) {
    return {
      isValid: false,
      value: 0,
      error: `${fieldName} must be a valid number`
    }
  }

  if (num < min || num > max) {
    return {
      isValid: false,
      value: 0,
      error: `${fieldName} must be between ${min} and ${max}`
    }
  }

  return {
    isValid: true,
    value: num,
    error: undefined
  }
}

/**
 * Rate limiting map (in-memory for simple implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

/**
 * Simple rate limiting implementation
 * Returns true if request should be allowed, false if rate limit exceeded
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; resetTime?: number } {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean up
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetTime < now) {
        rateLimitMap.delete(key)
      }
    }
  }

  if (!record || record.resetTime < now) {
    // First request or window expired
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    })
    return { allowed: true }
  }

  if (record.count >= maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      resetTime: record.resetTime
    }
  }

  // Increment count
  record.count++
  return { allowed: true }
}

/**
 * Sanitize error messages to prevent information disclosure
 */
export function sanitizeError(error: any): string {
  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production') {
    return 'An error occurred. Please try again later.'
  }

  // In development, provide more details
  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown error occurred'
}

/**
 * Validate boolean input
 */
export function validateBoolean(value: any): boolean {
  return value === true || value === 'true' || value === 1 || value === '1'
}



