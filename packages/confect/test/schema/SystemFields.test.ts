import type { Expand } from 'convex/server'
import { Schema } from 'effect'
import { describe, expect, expectTypeOf, test } from 'vitest'
import { GenericId } from '../../src/server/schemas/GenericId'
import { extendWithSystemFields, systemFields, withSystemFieldsMacro } from '../../src/server/schemas/SystemFields'

describe(extendWithSystemFields, () => {
  test('extends a struct with system fields', () => {
    const NoteSchema = Schema.Struct({
      content: Schema.String,
    })

    const ExtendedNoteSchema = extendWithSystemFields('notes', NoteSchema)

    const Expected = Schema.Struct({
      content: Schema.String,
      _id: GenericId('notes'),
      _creationTime: Schema.Number,
    })

    type Expected = typeof Expected

    const Actual = ExtendedNoteSchema
    type Actual = typeof Actual

    const extendedNote = {
      content: 'Hello, world!',
      _id: 'abc123' as GenericId<'notes'>,
      _creationTime: 1_234_567_890,
    }

    expect(() => Schema.decodeUnknownSync(Actual)(extendedNote)).not.toThrow()
    expect(() => Schema.decodeUnknownSync(Expected)(extendedNote)).not.toThrow()

    expectTypeOf<Expand<Actual['Encoded']>>().toEqualTypeOf<Expected['Encoded']>()
    expectTypeOf<Expand<Actual['Type']>>().toEqualTypeOf<Expected['Type']>()
  })

  test('extends a union of structs with system fields', () => {
    const NoteSchema = Schema.Struct({
      content: Schema.String,
    })

    const ImageSchema = Schema.Struct({
      url: Schema.String,
    })

    const ItemSchema = Schema.Union(NoteSchema, ImageSchema)

    const ExtendedItemSchema = extendWithSystemFields('items', ItemSchema)

    const Expected = Schema.Union(
      Schema.Struct({
        content: Schema.String,
        _id: GenericId('items'),
        _creationTime: Schema.Number,
      }),
      Schema.Struct({
        url: Schema.String,
        _id: GenericId('items'),
        _creationTime: Schema.Number,
      }),
    )

    type Expected = typeof Expected

    const Actual = ExtendedItemSchema
    type Actual = typeof Actual

    const extendedNote = {
      content: 'Hello, world!',
      _id: 'abc123' as GenericId<'items'>,
      _creationTime: 1_234_567_890,
    }

    expect(() => Schema.decodeUnknownSync(Actual)(extendedNote)).not.toThrow()
    expect(() => Schema.decodeUnknownSync(Expected)(extendedNote)).not.toThrow()

    const extendedImage = {
      url: 'https://example.com/image.jpg',
      _id: 'def456' as GenericId<'items'>,
      _creationTime: 1_234_567_890,
    }

    expect(() => Schema.decodeUnknownSync(Actual)(extendedImage)).not.toThrow()
    expect(() => Schema.decodeUnknownSync(Expected)(extendedImage)).not.toThrow()

    expectTypeOf<Expand<Actual['Encoded']>>().toEqualTypeOf<Expected['Encoded']>()
    expectTypeOf<Expand<Actual['Type']>>().toEqualTypeOf<Expected['Type']>()
  })
})

describe(systemFields, () => {
  test('creates system fields object for a table', () => {
    const fields = systemFields('users')

    expect(fields).toHaveProperty('_id')
    expect(fields).toHaveProperty('_creationTime')

    // Test that the fields work correctly by creating a schema with them
    const testSchema = Schema.Struct(fields)
    const testData = {
      _id: 'user123' as GenericId<'users'>,
      _creationTime: 1234567890
    }

    expect(() => Schema.decodeUnknownSync(testSchema)(testData)).not.toThrow()
  })
})

describe(withSystemFieldsMacro, () => {
  test('returns system fields for use in TaggedClass', () => {
    const fields = withSystemFieldsMacro('todos')

    expect(fields).toHaveProperty('_id')
    expect(fields).toHaveProperty('_creationTime')

    // Test that it can be used in object spread
    const baseFields = { text: Schema.String, completed: Schema.optional(Schema.Boolean) }
    const allFields = { ...baseFields, ...fields }

    expect(allFields).toHaveProperty('text')
    expect(allFields).toHaveProperty('completed')
    expect(allFields).toHaveProperty('_id')
    expect(allFields).toHaveProperty('_creationTime')

    // Test that the combined fields work in a schema
    const testSchema = Schema.Struct(allFields)
    const testData = {
      text: 'Test todo',
      completed: true,
      _id: 'todo123' as GenericId<'todos'>,
      _creationTime: 1234567890
    }

    expect(() => Schema.decodeUnknownSync(testSchema)(testData)).not.toThrow()
  })
})
