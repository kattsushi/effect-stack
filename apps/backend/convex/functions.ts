import { ExampleTaggedError } from '@monorepo/shared'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'
import { internal } from './_generated/api'
import {
  ConfectDatabaseReader,
  ConfectDatabaseWriter,
  ConfectMutationRunner,
  confectAction,
  confectInternalMutation,
  confectMutation,
  confectQuery,
} from './confect'
import {
  DeleteTodosArgs,
  GetFirstArgs,
  GetFirstResult,
  GetRandomArgs,
  GetRandomResult,
  InsertTodosArgs,
  InsertTodosResult,
  ListTodosArgs,
  ListTodosResult,
  ToggleTodosArgs,
} from './functions.schemas'

export class NotFoundTaggedError extends Schema.TaggedError<NotFoundTaggedError>('NotFoundTaggedError')(
  'NotFoundTaggedError',
  {},
) {
  override get message(): string {
    return 'Not Found'
  }
}

export const insertTodo = confectMutation({
  args: InsertTodosArgs,
  returns: InsertTodosResult,
  errors: ExampleTaggedError,
  handler: ({ text }) =>
    Effect.gen(function* () {
      const writer = yield* ConfectDatabaseWriter

      return yield* writer
        .insert('todos', { text })
        .pipe(Effect.catchTag('DocumentEncodeError', () => Effect.fail(new ExampleTaggedError())))
    }),
})

export const listTodos = confectQuery({
  args: ListTodosArgs,
  returns: ListTodosResult,
  errors: Schema.Union(NotFoundTaggedError, ExampleTaggedError),
  handler: () =>
    Effect.gen(function* () {
      const reader = yield* ConfectDatabaseReader

      const todos = yield* reader
        .table('todos')
        .index('by_creation_time', 'desc')
        .collect()
        .pipe(
          Effect.catchTag(
            'DocumentDecodeError',
            () => Effect.fail(new NotFoundTaggedError()), // ✅ Error permited
          ),
        )

      if (todos.length > 100) {
        return yield* Effect.fail(new ExampleTaggedError()) // ✅ Error permited (rate limit)
      }

      return todos
    }),
})

export const deleteTodo = confectMutation({
  args: DeleteTodosArgs,
  returns: Schema.Void,
  errors: NotFoundTaggedError,
  handler: ({ todoId }) =>
    Effect.gen(function* () {
      const reader = yield* ConfectDatabaseReader
      const writer = yield* ConfectDatabaseWriter

      // Check if todo exists before deleting
      yield* reader
        .table('todos')
        .get(todoId)
        .pipe(
          Effect.catchTags({
            GetByIdFailure: () => Effect.fail(new NotFoundTaggedError()),
            DocumentDecodeError: () => Effect.fail(new NotFoundTaggedError()),
          }),
        )

      yield* writer.delete('todos', todoId)
    }),
})

// Internal mutation to handle the database operations
export const toggleTodoMutation = confectInternalMutation({
  args: ToggleTodosArgs,
  returns: Schema.Void,
  errors: NotFoundTaggedError,
  handler: ({ todoId }) =>
    Effect.gen(function* () {
      const reader = yield* ConfectDatabaseReader
      const writer = yield* ConfectDatabaseWriter

      // Get current todo to check its completed status
      const todo = yield* reader
        .table('todos')
        .get(todoId)
        .pipe(
          Effect.catchTags({
            GetByIdFailure: () => Effect.fail(new NotFoundTaggedError()),
            DocumentDecodeError: () => Effect.fail(new NotFoundTaggedError()),
          }),
        )

      // Toggle the completed status
      const newCompletedStatus = !todo.completed

      yield* writer.patch('todos', todoId, { completed: newCompletedStatus }).pipe(
        Effect.catchTags({
          GetByIdFailure: () => Effect.fail(new NotFoundTaggedError()),
          DocumentEncodeError: () => Effect.fail(new NotFoundTaggedError()),
          DocumentDecodeError: () => Effect.fail(new NotFoundTaggedError()),
        }),
      )
    }),
})

export const toggleTodo = confectAction({
  args: ToggleTodosArgs,
  returns: Schema.Void,
  errors: NotFoundTaggedError,
  handler: ({ todoId }): Effect.Effect<void, NotFoundTaggedError, ConfectMutationRunner> =>
    Effect.gen(function* () {
      const mutationRunner = yield* ConfectMutationRunner

      // Use mutation runner to call the internal mutation
      yield* mutationRunner(internal.functions.toggleTodoMutation, { todoId })
    }),
})

export const getRandom = confectAction({
  args: GetRandomArgs,
  returns: GetRandomResult,
  errors: ExampleTaggedError,
  handler: () =>
    Effect.gen(function* () {
      const randomValue = Math.random()

      // Simulate an error condition for demonstration
      if (randomValue < 0.1) {
        return yield* Effect.fail(new ExampleTaggedError())
      }

      return randomValue
    }),
})

export const testSimple = confectQuery({
  args: Schema.Struct({}),
  returns: Schema.String,
  handler: () => Effect.succeed('Hello from confect!'),
})

export const testVerySimple = confectQuery({
  args: Schema.Struct({}),
  returns: Schema.Number,
  handler: () => Effect.succeed(42),
})

export const testMutation = confectMutation({
  args: Schema.Struct({ value: Schema.Number }),
  returns: Schema.Number,
  handler: ({ value }) => Effect.succeed(value * 2),
})

export const getFirst = confectQuery({
  args: GetFirstArgs,
  returns: GetFirstResult,
  errors: NotFoundTaggedError,
  handler: () =>
    Effect.gen(function* () {
      const reader = yield* ConfectDatabaseReader

      return yield* reader
        .table('todos')
        .index('by_creation_time')
        .first()
        .pipe(
          Effect.catchTag(
            'DocumentDecodeError',
            () => Effect.fail(new NotFoundTaggedError()), // ✅ Error permitido
          ),
        )
    }),
})

import { PermissionTaggedError, RateLimitTaggedError, ValidationTaggedError } from './schemas/errors'

export const testExternalErrors = confectQuery({
  args: Schema.Struct({ action: Schema.String }),
  returns: Schema.String,
  errors: Schema.Union(ValidationTaggedError, PermissionTaggedError, RateLimitTaggedError),
  handler: ({ action }) =>
    Effect.gen(function* () {
      // Ejemplo de uso de errores externos
      if (action === 'invalid') {
        return yield* Effect.fail(new ValidationTaggedError({ field: 'action', message: 'Invalid action' }))
      }

      if (action === 'forbidden') {
        return yield* Effect.fail(new PermissionTaggedError({ action, resource: 'todos' }))
      }

      if (action === 'spam') {
        return yield* Effect.fail(new RateLimitTaggedError({ retryAfter: 60 }))
      }

      return `Action ${action} executed successfully`
    }),
})
