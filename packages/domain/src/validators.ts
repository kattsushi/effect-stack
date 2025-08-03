import type { IsEmailOptions } from 'validator/lib/isEmail.js'
import isEmail from 'validator/lib/isEmail.ts'

/**
 * Validate emails according to RFC 5322
 */
export const isValidEmail = isEmail as unknown as (str: string, options?: IsEmailOptions) => boolean
