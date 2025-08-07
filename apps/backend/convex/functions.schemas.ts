import { extendWithSystemFields } from '@monorepo/confect/server'
import * as Schema from 'effect/Schema'
import { Id } from './confect'
import { confectSchema } from './schema'

export class Todo extends Schema.Class<Todo>('Todo')({
  text: Schema.String.pipe(Schema.maxLength(100)),
  completed: Schema.optional(Schema.Boolean),
}) {}

export const TodoWithSystemFields = extendWithSystemFields('todos', Todo)

export const ListTodosArgs = Schema.Struct({})
export const ListTodosResult = Schema.Array(TodoWithSystemFields)

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
})

export const GetRandomArgs = Schema.Struct({})
export const GetRandomResult = Schema.Number

export const GetFirstArgs = Schema.Struct({})
export const GetFirstResult = Schema.Option(confectSchema.tableSchemas.todos.withSystemFields)
