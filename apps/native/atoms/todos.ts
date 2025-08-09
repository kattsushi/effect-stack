import { Atom } from '@effect-atom/atom-react'
import { api } from '@monorepo/backend/convex/_generated/api'
import { effectQuery, effectMutation, effectAction } from '@monorepo/confect/react'
import * as Effect from 'effect/Effect'
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
 * Query atom for listing all todos using new effect-atom API
 */
export const todosQueryAtom = atomRuntime.atom(
  effectQuery(api, 'functions', 'listTodos')({})
)

/**
 * Mutation atom for adding new todos using new effect-atom API
 */
export const addTodoAtom = atomRuntime.fn(
  Effect.fn(function* (text: string, get: Atom.FnContext) {
    const createTodo = effectMutation(api, 'functions', 'insertTodo')
    yield* createTodo({ text })
    get.set(todoTextAtom, '')
  }),
)

/**
 * Action atom for toggling todo completion using new effect-atom API
 */
export const toggleTodoAtom = atomRuntime.fn(
  effectAction(api, 'functions', 'toggleTodo')
)

/**
 * Mutation atom for deleting todos using new effect-atom API
 */
export const deleteTodoAtom = atomRuntime.fn(
  effectMutation(api, 'functions', 'deleteTodo')
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
