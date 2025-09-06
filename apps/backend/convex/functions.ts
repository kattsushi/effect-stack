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
import { TodoSchema } from './functions.schemas'

export class NotFoundError extends Schema.TaggedError<NotFoundError>('NotFoundError')('NotFoundError', {}) {
  get message(): string {
    return 'Not Found'
  }
}

export const insertTodo = confectMutation({
  args: TodoSchema.InsertArgs,
  returns: Schema.String, // Return the ID as string
  errors: NotFoundError,
  handler: ({ text }) =>
    Effect.gen(function* () {
      const writer = yield* ConfectDatabaseWriter

      // Use Math.random() instead of Effect's Random service since it's not provided in confect layers
      const random = Math.random() * 0.5 + 0.5 // Generate random number between 0.5 and 1
      if (random > 0.7) {
        return yield* Effect.fail(new NotFoundError())
      }

      return yield* writer
        .insert('todos', { text, tag: 'Todo' as const })
        .pipe(Effect.catchTag('DocumentEncodeError', () => Effect.fail(new NotFoundError())))
    }),
})

export const listTodos = confectQuery({
  args: Schema.Struct({}),
  returns: TodoSchema.Array,
  errors: NotFoundError,
  handler: () =>
    Effect.gen(function* () {
      const reader = yield* ConfectDatabaseReader

      const random = Math.random() * 0.5 + 0.5 // Generate random number between 0.5 and 1

      if (random > 0.7) {
        return yield* Effect.fail(new NotFoundError())
      }

      return yield* reader
        .table('todos')
        .index('by_creation_time', 'desc')
        .collect()
        .pipe(
          Effect.catchTag(
            'DocumentDecodeError',
            () => Effect.succeed([]), // Return empty array on decode error
          ),
        )
    }),
})

export const deleteTodo = confectMutation({
  args: TodoSchema.FindByIdArgs,
  returns: Schema.Void,
  errors: NotFoundError,
  handler: ({ id }) =>
    Effect.gen(function* () {
      const reader = yield* ConfectDatabaseReader
      const writer = yield* ConfectDatabaseWriter

      // Check if todo exists before deleting
      yield* reader
        .table('todos')
        .get(id)
        .pipe(
          Effect.catchTags({
            GetByIdFailure: () => Effect.fail(new NotFoundError()),
            DocumentDecodeError: () => Effect.fail(new NotFoundError()),
          }),
        )

      yield* writer.delete('todos', id)
    }),
})

// Internal mutation to handle the database operations
export const toggleTodoMutation = confectInternalMutation({
  args: TodoSchema.FindByIdArgs,
  returns: Schema.Void,
  errors: NotFoundError,
  handler: ({ id }) =>
    Effect.gen(function* () {
      const reader = yield* ConfectDatabaseReader
      const writer = yield* ConfectDatabaseWriter

      // Get current todo to check its completed status
      const todo = yield* reader
        .table('todos')
        .get(id)
        .pipe(
          Effect.catchTags({
            GetByIdFailure: () => Effect.fail(new NotFoundError()),
            DocumentDecodeError: () => Effect.fail(new NotFoundError()),
          }),
        )

      // Toggle the completed status
      const newCompletedStatus = !todo.completed

      yield* writer.patch('todos', id, { completed: newCompletedStatus }).pipe(
        Effect.catchTags({
          GetByIdFailure: () => Effect.fail(new NotFoundError()),
          DocumentEncodeError: () => Effect.fail(new NotFoundError()),
          DocumentDecodeError: () => Effect.fail(new NotFoundError()),
        }),
      )
    }),
})

export const toggleTodo = confectAction({
  args: TodoSchema.FindByIdArgs,
  returns: Schema.Void,
  errors: NotFoundError,
  handler: ({ id }): Effect.Effect<void, NotFoundError, ConfectMutationRunner> =>
    Effect.gen(function* () {
      const mutationRunner = yield* ConfectMutationRunner

      // Use mutation runner to call the internal mutation
      yield* mutationRunner(internal.functions.toggleTodoMutation, { id })
    }),
})

export const getFirst = confectQuery({
  args: Schema.Struct({}),
  returns: TodoSchema.Option,
  errors: NotFoundError,
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
            () => Effect.fail(new NotFoundError()), // ✅ Error permitido
          ),
        )
    }),
})
