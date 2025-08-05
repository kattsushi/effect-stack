import { Effect } from 'effect'
import * as Schema from 'effect/Schema'
import { ConfectDatabaseReader, ConfectDatabaseWriter, confectAction, confectMutation, confectQuery } from './confect'
import {
  DeleteTodosArgs,
  DeleteTodosResult,
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

export const insertTodo = confectMutation({
  args: InsertTodosArgs,
  returns: InsertTodosResult,
  handler: ({ text }) =>
    Effect.gen(function* () {
      const writer = yield* ConfectDatabaseWriter

      return yield* writer.insert('todos', { text })
    }),
})

export const listTodos = confectQuery({
  args: ListTodosArgs,
  returns: ListTodosResult,
  handler: () =>
    Effect.gen(function* () {
      const reader = yield* ConfectDatabaseReader

      return yield* reader.table('todos').index('by_creation_time', 'desc').collect()
    }),
})

export const deleteTodo = confectMutation({
  args: DeleteTodosArgs,
  returns: DeleteTodosResult,
  handler: ({ todoId }) =>
    Effect.gen(function* () {
      const writer = yield* ConfectDatabaseWriter

      yield* writer.delete('todos', todoId)

      return null
    }),
})

export const toggleTodo = confectMutation({
  args: ToggleTodosArgs,
  returns: Schema.Null,
  handler: ({ todoId, completed }) =>
    Effect.gen(function* () {
      const writer = yield* ConfectDatabaseWriter

      yield* writer.patch('todos', todoId, { completed })

      return null
    }),
})

export const getRandom = confectAction({
  args: GetRandomArgs,
  returns: GetRandomResult,
  handler: () => Effect.succeed(Math.random()),
})

export const getFirst = confectQuery({
  args: GetFirstArgs,
  returns: GetFirstResult,
  handler: () =>
    Effect.gen(function* () {
      const reader = yield* ConfectDatabaseReader

      return yield* reader.table('todos').index('by_creation_time').first()
    }),
})
