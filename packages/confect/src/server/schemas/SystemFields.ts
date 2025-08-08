import type { Expand, IdField, SystemFields as NonIdSystemFields } from 'convex/server'
import { Schema } from 'effect'
import { GenericId } from './GenericId'

/**
 * Produces a schema for Convex system fields.
 */
export const SystemFields = <TableName extends string>(tableName: TableName) =>
  Schema.Struct({
    _id: GenericId(tableName),
    _creationTime: Schema.Number,
  })

/**
 * Extend a table schema with Convex system fields.
 */
export const extendWithSystemFields = <TableName extends string, TableSchema extends Schema.Schema.AnyNoContext>(
  tableName: TableName,
  schema: TableSchema,
): ExtendWithSystemFields<TableName, TableSchema> => Schema.extend(SystemFields(tableName), schema)

/**
 * Helper to create system fields for a table
 */
export const systemFields = <TableName extends string>(tableName: TableName) => ({
  _id: GenericId(tableName),
  _creationTime: Schema.Number,
} as const)

/**
 * Macro to help create TaggedClass with system fields.
 * Usage:
 * const baseFields = { text: Schema.String, completed: Schema.optional(Schema.Boolean) }
 * export class Todo extends Schema.TaggedClass<Todo>()('Todo', baseFields) {}
 * export class TodoWithSystemFields extends Schema.TaggedClass<TodoWithSystemFields>()('Todo', { ...baseFields, ...systemFields('todos') }) {}
 */
export const withSystemFieldsMacro = <TableName extends string>(tableName: TableName) =>
  systemFields(tableName)

/**
 * Extend a table schema with Convex system fields at the type level.
 */
export type ExtendWithSystemFields<
  TableName extends string,
  TableSchema extends Schema.Schema.AnyNoContext,
> = Schema.extend<ReturnType<typeof SystemFields<TableName>>, TableSchema>

export type WithSystemFields<TableName extends string, Document> = Expand<
  Readonly<IdField<TableName>> & Readonly<NonIdSystemFields> & Document
>
