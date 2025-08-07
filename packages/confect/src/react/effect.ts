import {
  useQuery as useConvexQuery,
  useMutation as useConvexMutation,
  useAction as useConvexAction,
} from 'convex/react'

import { Effect } from 'effect'

// Error types will be provided via declaration merging
export interface ConfectErrorTypes {}

// Return types will be provided via declaration merging
export interface ConfectReturnTypes {}

// Type inference from Convex API structure (same as in index.ts)
type InferFunctionArgs<T> = T extends { _args: infer Args } ? Args : any
type InferFunctionReturns<T> = T extends { _returnType: infer Returns } ? Returns : any

// Extract error types from ConfectErrorTypes interface (declaration merging)
type InferFunctionErrors<F extends string> = F extends keyof ConfectErrorTypes
  ? ConfectErrorTypes[F]
  : any

// Hybrid return type inference: prefer Confect types, fallback to Convex API
type InferFunctionReturnsHybrid<T, F extends string> =
  F extends keyof ConfectReturnTypes
    ? ConfectReturnTypes[F]
    : InferFunctionReturns<T>

// Dynamic API overload (same as useQuery but returning Effect)
export function useEffectQuery<
  ApiObject extends Record<string, any>,
  M extends keyof ApiObject,
  F extends keyof ApiObject[M],
>(
  apiObject: ApiObject,
  moduleName: M,
  functionName: F,
): (args: InferFunctionArgs<ApiObject[M][F]>) => Effect.Effect<InferFunctionReturns<ApiObject[M][F]>, InferFunctionErrors<F & string>, never>

// Implementation that handles the API (same strategy as useQuery)
export function useEffectQuery(...args: any[]): any {
  // Extract arguments
  const [apiObject, moduleName, functionName] = args
  const fn = apiObject[moduleName][functionName]

  return (actualArgs: any): Effect.Effect<any, any, never> => {
    // Use the existing Convex hook to get result
    const convexResult = useConvexQuery(fn, actualArgs)

    // Transform result to Effect
    if (convexResult === undefined) {
      // Still loading - return never-resolving effect
      return Effect.never
    }

    // Check if the result is an error (Convex error format)
    if (convexResult && typeof convexResult === 'object' && '__convexError' in convexResult) {
      // Extract and return the error to the error channel
      return Effect.fail((convexResult as any).__convexError)
    }

    // Success case - return as-is to preserve types
    return Effect.succeed(convexResult)
  }
}

// Implementation for mutations
export function useEffectMutation<
  ApiObject extends Record<string, any>,
  M extends keyof ApiObject,
  F extends keyof ApiObject[M] & string,
  Fn extends ApiObject[M][F]
>(
  apiObject: ApiObject,
  moduleName: M,
  functionName: F,
): (args: InferFunctionArgs<Fn>) => Effect.Effect<InferFunctionReturnsHybrid<Fn, F>, InferFunctionErrors<F>, never> {
  const fn = apiObject[moduleName][functionName]
  const convexMutation = useConvexMutation(fn)

  return (actualArgs: InferFunctionArgs<Fn>): Effect.Effect<InferFunctionReturnsHybrid<Fn, F>, InferFunctionErrors<F>, never> => {
    return Effect.tryPromise({
      try: () => convexMutation(actualArgs),
      catch: (error) => {
        // Handle ConvexError and extract typed data
        if (error && typeof error === 'object' && 'message' in error) {
          const message = (error as any).message
          if (message && message.includes('ConvexError:')) {
            try {
              // Extract JSON from error message
              const jsonMatch = message.match(/ConvexError: ({.*})/)
              if (jsonMatch) {
                return JSON.parse(jsonMatch[1])
              }
            } catch (e) {
              // Fallback to original error
            }
          }
        }
        return error
      }
    })
  }
}

// Implementation for actions
export function useEffectAction<
  ApiObject extends Record<string, any>,
  M extends keyof ApiObject,
  F extends keyof ApiObject[M] & string,
  Fn extends ApiObject[M][F]
>(
  apiObject: ApiObject,
  moduleName: M,
  functionName: F,
): (args: InferFunctionArgs<Fn>) => Effect.Effect<InferFunctionReturnsHybrid<Fn, F>, InferFunctionErrors<F>, never> {
  const fn = apiObject[moduleName][functionName]
  const convexAction = useConvexAction(fn)

  return (actualArgs: InferFunctionArgs<Fn>): Effect.Effect<InferFunctionReturnsHybrid<Fn, F>, InferFunctionErrors<F>, never> => {
    return Effect.tryPromise({
      try: () => convexAction(actualArgs),
      catch: (error) => {
        // Handle ConvexError and extract typed data
        if (error && typeof error === 'object' && 'message' in error) {
          const message = (error as any).message
          if (message && message.includes('ConvexError:')) {
            try {
              // Extract JSON from error message
              const jsonMatch = message.match(/ConvexError: ({.*})/)
              if (jsonMatch) {
                return JSON.parse(jsonMatch[1])
              }
            } catch (e) {
              // Fallback to original error
            }
          }
        }
        return error
      }
    })
  }
}