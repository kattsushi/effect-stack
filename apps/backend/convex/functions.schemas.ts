import { systemFields } from '@monorepo/confect/server'
import * as Schema from 'effect/Schema'

// Base schema for confect table definition (Struct that can be extended)
export const Todo = Schema.Struct({
  tag: Schema.Literal('Todo'),
  text: Schema.String.pipe(Schema.maxLength(100)),
  completed: Schema.optional(Schema.Boolean),
})
// Todo namespace with all related schemas and helpers
export namespace TodoSchema {
  // Schema class for todos with system fields
  export class WithSystemFields extends Schema.Class<WithSystemFields>('Todo')({
    ...systemFields('todos'),
    ...Todo.fields,
  }) {}

  // Helper schemas
  export const Array = Schema.Array(WithSystemFields)
  export const Option = Schema.Option(WithSystemFields)

  export const InsertArgs = Schema.Struct({
    text: Schema.String.pipe(Schema.maxLength(100)),
  })

  export const FindByIdArgs = Schema.Struct({
    id: systemFields('todos')._id,
  })

  // Fields for easy access
  export const fields = {
    ...systemFields('todos'),
    ...Todo.fields,
  }
}
