import { systemFields } from '@monorepo/confect/server'
import * as Schema from 'effect/Schema'
export class Todo extends Schema.TaggedClass<Todo>()('Todo', {
  text: Schema.String.pipe(Schema.maxLength(100)),
  completed: Schema.optional(Schema.Boolean),
}) {}

export class TodoWithSystemFields extends Schema.TaggedClass<TodoWithSystemFields>()('Todo', {
  ...systemFields('todos'),
  ...Todo.fields,
}) {
  static Array = Schema.Array(TodoWithSystemFields)
  static Option = Schema.Option(TodoWithSystemFields)
  static ListArgs = Schema.Struct({
    text: TodoWithSystemFields.fields.text,
  })
  static InsertArgs = Schema.Struct({
    text: TodoWithSystemFields.fields.text,
  })

  static FindByIdArgs = Schema.Struct({
    id: TodoWithSystemFields.fields._id,
  })
}
