import { useAtomValue, useAtomSet } from '@effect-atom/atom-react'
import type { Result } from '@effect-atom/atom'
import * as Effect from 'effect/Effect'
import React, { createContext, useContext, useMemo } from 'react'
import { useQuery, useMutation, useAction } from './index'

// Context for atom runtime
const ConfectContext = createContext<any>(null)

/**
 * Provider component for Confect hooks
 */
export function ConfectProvider({
  children,
  atomRuntime
}: {
  children: React.ReactNode
  atomRuntime: any
}) {
  return (
    <ConfectContext.Provider value={atomRuntime}>
      {children}
    </ConfectContext.Provider>
  )
}

/**
 * Hook to get the atom runtime from context
 */
function useAtomRuntime() {
  const atomRuntime = useContext(ConfectContext)
  if (!atomRuntime) {
    throw new Error('useAtomRuntime must be used within a ConfectProvider')
  }
  return atomRuntime
}

// Type inference from Convex API structure
type InferFunctionArgs<T> = T extends { _args: infer Args } ? Args : any
type InferFunctionReturns<T> = T extends { _returnType: infer Returns } ? Returns : any

// Extract error types from ConfectErrorTypes interface (declaration merging)
type InferFunctionErrors<F extends string> = F extends keyof import('./index').ConfectErrorTypes
  ? import('./index').ConfectErrorTypes[F]
  : any

// Extract return types from ConfectReturnTypes interface (declaration merging)
type InferFunctionReturnsHybrid<T, F> = F extends keyof import('./index').ConfectReturnTypes
  ? import('./index').ConfectReturnTypes[F]
  : InferFunctionReturns<T>



/**
 * Hook for creating a memoized query atom that wraps the existing useQuery hook
 *
 * @param apiObject - The generated API object
 * @param moduleName - The module name (e.g., 'functions')
 * @param functionName - The function name (e.g., 'listTodos')
 * @param args - The arguments for the query
 * @returns The Result of the query
 */
export function useAtomValueConfect<
  Fn extends { _args: any; _returnType: any },
  F extends string = string,
>(
  fn: Fn,
  args: InferFunctionArgs<Fn>,
): Result.Result<InferFunctionReturnsHybrid<Fn, F>, InferFunctionErrors<F>> {
  const atomRuntime = useAtomRuntime()

  // 🎯 SOLUCIÓN: Hook en el nivel superior, luego memoizar el atom
  const queryEffect = useQuery(fn)(args)

  const queryAtom = useMemo(() =>
    atomRuntime.atom(queryEffect),
    [queryEffect, atomRuntime]
  )

  // Usar useAtomValue para obtener el Result
  return useAtomValue(queryAtom)
}

/**
 * Hook for creating a memoized mutation atom that wraps the existing useMutation hook
 *
 * @param apiObject - The generated API object
 * @param moduleName - The module name (e.g., 'functions')
 * @param functionName - The function name (e.g., 'insertTodo')
 * @returns A function to execute the mutation
 */
export function useAtomSetConfect<
  Fn extends { _args: any; _returnType: any },
  F extends string = string,
>(
  fn: Fn,
): (args: InferFunctionArgs<Fn>) => Promise<InferFunctionReturnsHybrid<Fn, F>> {
  const atomRuntime = useAtomRuntime()

  // 🎯 SOLUCIÓN: Hook en el nivel superior, luego memoizar el atom
  const mutationEffect = useMutation(fn)

  const mutationAtom = useMemo(() =>
    atomRuntime.fn(
      Effect.fn(function* (args: InferFunctionArgs<Fn>) {
        const mutationId = Math.random().toString(36).substring(2, 11)
        const mutationKey = `mutation`

        yield* Effect.log(`🎯 [${mutationKey}] 🚀 STARTING mutation #${mutationId}`)

        // Ejecutar el Effect del hook existente
        const result = yield* mutationEffect(args)

        yield* Effect.log(`🎯 [${mutationKey}] ✅ COMPLETED mutation #${mutationId}`)

        return result
      }),
    ),
    [mutationEffect, atomRuntime]
  )

  // Usar useAtomSet para obtener la función de mutation
  return useAtomSet(mutationAtom, { mode: 'promise' } as any) as any
}

/**
 * Hook for creating a memoized action atom that wraps the existing useAction hook
 *
 * @param apiObject - The generated API object
 * @param moduleName - The module name (e.g., 'functions')
 * @param functionName - The function name (e.g., 'toggleTodo')
 * @returns A function to execute the action
 */
export function useAtomSetConfectAction<
  Fn extends { _args: any; _returnType: any },
  F extends string = string,
>(
  fn: Fn,
): (args: InferFunctionArgs<Fn>) => Promise<InferFunctionReturnsHybrid<Fn, F>> {
  const atomRuntime = useAtomRuntime()

  // 🎯 SOLUCIÓN: Hook en el nivel superior, luego memoizar el atom
  const actionEffect = useAction(fn)

  const actionAtom = useMemo(() =>
    atomRuntime.fn(
      Effect.fn(function* (args: InferFunctionArgs<Fn>) {
        const actionId = Math.random().toString(36).substring(2, 11)
        const actionKey = `action`

        yield* Effect.log(`⚡ [${actionKey}] 🚀 STARTING action #${actionId}`)

        // Ejecutar el Effect del hook existente
        const result = yield* actionEffect(args)

        yield* Effect.log(`⚡ [${actionKey}] ✅ COMPLETED action #${actionId}`)

        return result
      }),
    ),
    [actionEffect, atomRuntime]
  )

  // Usar useAtomSet para obtener la función de action
  return useAtomSet(actionAtom, { mode: 'promise' } as any) as any
}

/**
 * Hook for creating a memoized atom and getting both value and setter
 *
 * @param apiObject - The generated API object
 * @param moduleName - The module name (e.g., 'functions')
 * @param functionName - The function name (e.g., 'insertTodo')
 * @param args - The arguments for the query (for queries only)
 * @returns [value, setter] tuple
 */
export function useAtomConfect<
  Fn extends { _args: any; _returnType: any },
>(
  fn: Fn,
  args: InferFunctionArgs<Fn>,
) {
  const value = useAtomValueConfect(fn, args)
  const setter = useAtomSetConfect(fn)

  return [value, setter] as const
}