import * as Schema from 'effect/Schema'

export class ExampleTaggedError extends Schema.TaggedError<ExampleTaggedError>('ExampleTaggedError')(
  'ExampleTaggedError',
  {},
) {
  override get message(): string {
    return 'Not Found'
  }
}
