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

// Import shared type utilities
import type {
  InferFunctionErrors,
  InferFunctionArgs,
  InferFunctionReturns
} from './types'

// Re-export for backward compatibility
export type { ConfectErrorTypes } from './types'



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
  ApiObject extends Record<string, any>,
  M extends keyof ApiObject,
  F extends keyof ApiObject[M] & string,
>(
  apiObject: ApiObject,
  moduleName: M,
  functionName: F,
  args: InferFunctionArgs<ApiObject[M][F]>,
): Result.Result<InferFunctionReturns<ApiObject[M][F]>, InferFunctionErrors<F>> {
  const atomRuntime = useAtomRuntime()

  // 🎯 SOLUCIÓN: Hook en el nivel superior con tu API elegante
  const queryEffect = useQuery(apiObject, moduleName, functionName)(args)

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
  ApiObject extends Record<string, any>,
  M extends keyof ApiObject,
  F extends keyof ApiObject[M] & string,
>(
  apiObject: ApiObject,
  moduleName: M,
  functionName: F,
): (args: InferFunctionArgs<ApiObject[M][F]>) => Promise<InferFunctionReturns<ApiObject[M][F]>> {
  const atomRuntime = useAtomRuntime()

  // 🎯 SOLUCIÓN: Hook en el nivel superior con tu API elegante
  const mutationEffect = useMutation(apiObject, moduleName, functionName)

  const mutationAtom = useMemo(() =>
    atomRuntime.fn(
      Effect.fn(function* (args: InferFunctionArgs<ApiObject[M][F]>) {
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
  ApiObject extends Record<string, any>,
  M extends keyof ApiObject,
  F extends keyof ApiObject[M] & string,
>(
  apiObject: ApiObject,
  moduleName: M,
  functionName: F,
): (args: InferFunctionArgs<ApiObject[M][F]>) => Promise<InferFunctionReturns<ApiObject[M][F]>> {
  const atomRuntime = useAtomRuntime()

  // 🎯 SOLUCIÓN: Hook en el nivel superior con tu API elegante
  const actionEffect = useAction(apiObject, moduleName, functionName)

  const actionAtom = useMemo(() =>
    atomRuntime.fn(
      Effect.fn(function* (args: InferFunctionArgs<ApiObject[M][F]>) {
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
  ApiObject extends Record<string, any>,
  M extends keyof ApiObject,
  F extends keyof ApiObject[M] & string,
>(
  apiObject: ApiObject,
  moduleName: M,
  functionName: F,
  args: InferFunctionArgs<ApiObject[M][F]>,
) {
  const value = useAtomValueConfect(apiObject, moduleName, functionName, args)
  const setter = useAtomSetConfect(apiObject, moduleName, functionName)

  return [value, setter] as const
}