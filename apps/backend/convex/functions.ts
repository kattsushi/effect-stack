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
import { TodoWithSystemFields } from './functions.schemas'

export class NotFoundError extends Schema.TaggedError<NotFoundError>('NotFoundError')('NotFoundError', {}) {
  override get message(): string {
    return 'Not Found'
  }
}

export const insertTodo = confectMutation({
  args: TodoWithSystemFields.InsertArgs,
  returns: TodoWithSystemFields.fields._id,
  errors: NotFoundError,
  handler: ({ text }) =>
    Effect.gen(function* () {
      const writer = yield* ConfectDatabaseWriter

      return yield* writer
        .insert('todos', { text, _tag: 'Todo' as const })
        .pipe(Effect.catchTag('DocumentEncodeError', () => Effect.fail(new NotFoundError())))
    }),
})

export const listTodos = confectQuery({
  args: Schema.Struct({}),
  returns: TodoWithSystemFields.Array,
  errors: NotFoundError,
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
            () => Effect.fail(new NotFoundError()), // ✅ Error permited
          ),
        )

      if (todos.length === 0) {
        return yield* Effect.fail(new NotFoundError()) // ✅ Error permited (rate limit)
      }

      return todos
    }),
})

export const deleteTodo = confectMutation({
  args: TodoWithSystemFields.FindByIdArgs,
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
  args: TodoWithSystemFields.FindByIdArgs,
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
  args: TodoWithSystemFields.FindByIdArgs,
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
  returns: TodoWithSystemFields.Option,
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
