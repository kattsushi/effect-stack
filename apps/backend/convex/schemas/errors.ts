import { Schema } from 'effect'
export class ValidationTaggedError extends Schema.TaggedError<ValidationTaggedError>('ValidationTaggedError')(
  'ValidationTaggedError',
  {
    field: Schema.String,
    message: Schema.String,
  },
) {
  override get message(): string {
    return `Validation error on field ${this.field}: ${this.message}`
  }
}

export class PermissionTaggedError extends Schema.TaggedError<PermissionTaggedError>('PermissionTaggedError')(
  'PermissionTaggedError',
  {
    action: Schema.String,
    resource: Schema.String,
  },
) {
  override get message(): string {
    return `Permission denied for action ${this.action} on resource ${this.resource}`
  }
}

export class RateLimitTaggedError extends Schema.TaggedError<RateLimitTaggedError>('RateLimitTaggedError')(
  'RateLimitTaggedError',
  {
    retryAfter: Schema.Number,
  },
) {
  override get message(): string {
    return `Rate limit exceeded. Retry after ${this.retryAfter} seconds`
  }
}
