import { Atom } from '@effect-atom/atom-react'
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
