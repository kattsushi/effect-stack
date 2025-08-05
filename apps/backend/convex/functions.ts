
import * as Effect from 'effect/Effect'
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

// Simple test function to verify confect functions work
export const testSimple = confectQuery({
  args: Schema.Struct({}),
  returns: Schema.String,
  handler: () => Effect.succeed('Hello from confect!'),
})

// Even simpler test without any complex schemas or dependencies
export const testVerySimple = confectQuery({
  args: Schema.Struct({}),
  returns: Schema.Number,
  handler: () => Effect.succeed(42),
})

// Export metadata for frontend access
export const CONFECT_FUNCTION_METADATA = {
  listTodos: {
    args: ListTodosArgs,
    returns: ListTodosResult,
    type: 'query' as const,
  },
  insertTodo: {
    args: InsertTodosArgs,
    returns: InsertTodosResult,
    type: 'mutation' as const,
  },
  toggleTodo: {
    args: ToggleTodosArgs,
    returns: Schema.Null,
    type: 'mutation' as const,
  },
  deleteTodo: {
    args: DeleteTodosArgs,
    returns: DeleteTodosResult,
    type: 'mutation' as const,
  },
  getRandom: {
    args: GetRandomArgs,
    returns: GetRandomResult,
    type: 'action' as const,
  },
  getFirst: {
    args: GetFirstArgs,
    returns: GetFirstResult,
    type: 'query' as const,
  },
  testVerySimple: {
    args: Schema.Struct({}),
    returns: Schema.Number,
    type: 'query' as const,
  },
  testMutation: {
    args: Schema.Struct({ value: Schema.Number }),
    returns: Schema.Number,
    type: 'mutation' as const,
  },
}

// Debug: Let's check if metadata is preserved
console.log('🔍 Backend - testVerySimple._confectMeta:', (testVerySimple as any)._confectMeta)
console.log('🔍 Backend - listTodos._confectMeta:', (listTodos as any)._confectMeta)

// Test mutation without complex schemas
export const testMutation = confectMutation({
  args: Schema.Struct({ value: Schema.Number }),
  returns: Schema.Number,
  handler: ({ value }) => Effect.succeed(value * 2),
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
