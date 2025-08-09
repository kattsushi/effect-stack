import { Atom } from '@effect-atom/atom-react'
import { api } from '@monorepo/backend/convex/_generated/api'
import type { Id } from '@monorepo/backend/convex/_generated/dataModel'
import { useQuery, useMutation, useAction } from '@monorepo/confect/react'
import * as Effect from 'effect/Effect'
import * as Reactivity from '@effect/experimental/Reactivity'
import { ApiService } from '@/lib/api'
import { atomRuntime } from '@/lib/runtime'

// ✅ Atoms defined outside components - no performance issues
// ✅ No recreation on every render
// ✅ Better memoization and optimization

/**
 * Simple text atom for todo input
 */
export const todoTextAtom = Atom.make('')

/**
 * Query atom for listing all todos - simple Effect atom
 */
export const todosQueryAtom = atomRuntime.atom(
  Effect.gen(function* () {
    const timestamp = Date.now()
    const executionId = Math.random().toString(36).substring(2, 11)

    yield* Effect.log(`📋 [todosQueryAtom] 🚀 STARTING execution #${executionId} at ${timestamp}`)
    yield* Effect.log('📋 [todosQueryAtom] 🔍 Creating effectQuery...')

    const query = effectQuery(api, 'functions', 'listTodos')

    yield* Effect.log(`📋 [todosQueryAtom] 📞 Calling query with execution #${executionId}`)
    const result = yield* query({})

    yield* Effect.log(`📋 [todosQueryAtom] ✅ COMPLETED execution #${executionId}`)
    yield* Effect.log(`📋 [todosQueryAtom] 📊 Result: ${Array.isArray(result) ? result.length : 'unknown'} todos`)
    yield* Effect.log(`📋 [todosQueryAtom] 🏁 FINISHED execution #${executionId} at ${Date.now()}`)

    return result
  }),
)

/**
 * Mutation atom for adding new todos - with official reactivity system
 */
export const addTodoAtom = atomRuntime.fn(
  Effect.fn(function* (text: string, get: Atom.FnContext) {
    const mutationId = Math.random().toString(36).substring(2, 11)

    yield* Effect.log(`🎯 [addTodoAtom] 🚀 STARTING mutation #${mutationId}: "${text}"`)
    yield* Effect.log('🎯 [addTodoAtom] 🔍 Creating effectMutation...')

    const createTodo = effectMutation(api, 'functions', 'insertTodo')

    yield* Effect.log(`🎯 [addTodoAtom] 📞 Calling mutation #${mutationId}`)
    yield* createTodo({ text })

    yield* Effect.log('🎯 [addTodoAtom] 🧹 Clearing input field...')
    get.set(todoTextAtom, '')

    // Use official reactivity system to invalidate todos
    yield* Effect.log('🎯 [addTodoAtom] 🔄 Invalidating todos key...')
    yield* Reactivity.invalidate(["todos"])
    yield* Effect.log('🎯 [addTodoAtom] ✅ Todos key invalidated!')

    yield* Effect.log(`🎯 [addTodoAtom] ✅ COMPLETED mutation #${mutationId}`)
    yield* Effect.log(`🎯 [addTodoAtom] 🏁 FINISHED mutation #${mutationId} at ${Date.now()}`)
  }),
  // 🎯 CLAVE: Auto-invalidate "todos" key when mutation completes
  { reactivityKeys: ["todos"] }
)

/**
 * Action atom for toggling todo completion
 */
export const toggleTodoAtom = atomRuntime.fn(
  Effect.fn(function* (args: { id: Id<'todos'> }) {
    yield* Effect.log(`🔄 [toggleTodoAtom] Starting toggle for todo: ${args.id}`)
    const toggleAction = effectAction(api, 'functions', 'toggleTodo')
    const result = yield* toggleAction(args)
    yield* Effect.log('🔄 [toggleTodoAtom] Toggle completed!')
    return result
  }),
)

/**
 * Mutation atom for deleting todos
 */
export const deleteTodoAtom = atomRuntime.fn(
  Effect.fn(function* (args: { id: Id<'todos'> }) {
    yield* Effect.log(`🗑️ [deleteTodoAtom] Starting delete for todo: ${args.id}`)
    const deleteMutation = effectMutation(api, 'functions', 'deleteTodo')
    const result = yield* deleteMutation(args)
    yield* Effect.log('🗑️ [deleteTodoAtom] Delete completed!')
    return result
  }),
)

/**
 * Custom atom for getting first todo using ApiService (HTTP API)
 * This demonstrates mixing both approaches
 */
export const getFirstTodoAtom = atomRuntime.fn(
  Effect.fnUntraced(function* () {
    const client = yield* ApiService
    return yield* client.notes.getFirst()
  }),
)
