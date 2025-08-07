import { defineConfectSchema, defineConfectTable } from '@monorepo/confect/server'
import { Todo } from './functions.schemas'

export const confectSchema = defineConfectSchema({
  todos: defineConfectTable(Todo),
})

export default confectSchema.convexSchemaDefinition
