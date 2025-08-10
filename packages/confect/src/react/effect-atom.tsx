import { useAtomValue, useAtomSet } from '@effect-atom/atom-react'
import type { Result } from '@effect-atom/atom'
import * as Effect from 'effect/Effect'
import React, { createContext, useContext } from 'react'
import { useQuery, useMutation, useAction } from './index'
import type {
  InferFunctionArgs,
  InferFunctionReturnsHybrid,
  InferFunctionErrors,
} from './types.d.ts'

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

// Types are now imported from ./types



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
): Result.Result<InferFunctionReturnsHybrid<ApiObject[M][F], F>, InferFunctionErrors<F>> {
  const atomRuntime = useAtomRuntime()

  // 🎯 SIMPLE: Usar directamente el hook existente que ya funciona
  const queryEffect = useQuery(apiObject, moduleName, functionName)(args)

  // Crear atom que ejecuta el Effect (se recrea en cada render, pero es rápido)
  const queryAtom = atomRuntime.atom(queryEffect)

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
): (args: InferFunctionArgs<ApiObject[M][F]>) => Promise<InferFunctionReturnsHybrid<ApiObject[M][F], F>> {
  const atomRuntime = useAtomRuntime()

  // 🎯 SIMPLE: Usar directamente el hook existente que ya funciona
  const mutationEffect = useMutation(apiObject, moduleName, functionName)

  // Crear atom que ejecuta el Effect (se recrea en cada render, pero es rápido)
  const mutationAtom = atomRuntime.fn(
    Effect.fn(function* (args: InferFunctionArgs<ApiObject[M][F]>) {
      const mutationId = Math.random().toString(36).substring(2, 11)
      const mutationKey = `${String(moduleName)}.${String(functionName)}`

      yield* Effect.log(`🎯 [${mutationKey}] 🚀 STARTING mutation #${mutationId}`)

      // Ejecutar el Effect del hook existente
      const result = yield* mutationEffect(args)

      yield* Effect.log(`🎯 [${mutationKey}] ✅ COMPLETED mutation #${mutationId}`)

      return result
    }),
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
): (args: InferFunctionArgs<ApiObject[M][F]>) => Promise<InferFunctionReturnsHybrid<ApiObject[M][F], F>> {
  const atomRuntime = useAtomRuntime()

  // 🎯 SIMPLE: Usar directamente el hook existente que ya funciona
  const actionEffect = useAction(apiObject, moduleName, functionName)

  // Crear atom que ejecuta el Effect (se recrea en cada render, pero es rápido)
  const actionAtom = atomRuntime.fn(
    Effect.fn(function* (args: InferFunctionArgs<ApiObject[M][F]>) {
      const actionId = Math.random().toString(36).substring(2, 11)
      const actionKey = `${String(moduleName)}.${String(functionName)}`

      yield* Effect.log(`⚡ [${actionKey}] 🚀 STARTING action #${actionId}`)

      // Ejecutar el Effect del hook existente
      const result = yield* actionEffect(args)

      yield* Effect.log(`⚡ [${actionKey}] ✅ COMPLETED action #${actionId}`)

      return result
    }),
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
