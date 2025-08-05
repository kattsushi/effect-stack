import { defineConfectSchema, defineConfectTable } from '@monorepo/confect/server'
import { Schema } from 'effect'

export const confectSchema = defineConfectSchema({
  todos: defineConfectTable(
    Schema.Struct({
      text: Schema.String.pipe(Schema.maxLength(100)),
      completed: Schema.optional(Schema.Boolean),
    }),
  ),
})

export default confectSchema.convexSchemaDefinition
