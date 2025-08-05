import { Schema } from 'effect'
import { Id } from './confect'
import { confectSchema } from './schema'

export const ListTodosArgs = Schema.Struct({})
export const ListTodosResult = Schema.Array(confectSchema.tableSchemas.todos.withSystemFields)

export const InsertTodosArgs = Schema.Struct({
  text: Schema.String,
})
export const InsertTodosResult = Id('todos')

export const DeleteTodosArgs = Schema.Struct({
  todoId: Id('todos'),
})
export const DeleteTodosResult = Schema.Null

export const ToggleTodosArgs = Schema.Struct({
  todoId: Id('todos'),
  completed: Schema.Boolean,
})

export const GetRandomArgs = Schema.Struct({})
export const GetRandomResult = Schema.Number

export const GetFirstArgs = Schema.Struct({})
export const GetFirstResult = Schema.Option(confectSchema.tableSchemas.todos.withSystemFields)
