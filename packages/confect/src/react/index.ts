import {
  useQuery as useConvexQuery,
  useMutation as useConvexMutation,
  useAction as useConvexAction,
} from 'convex/react'

import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import type {
  InferFunctionArgs,
  InferFunctionReturnsHybrid,
  InferFunctionErrors,
} from './types.d.ts'

// Re-export all types for external use
export type {
  ConfectErrorTypes,
  ConfectReturnTypes,
  InferFunctionArgs,
  InferFunctionReturns,
  InferFunctionErrors,
  InferFunctionReturnsHybrid,
  ApiObject,
  ModuleName,
  FunctionName,
} from './types.d.ts'



// Dynamic API overload for useQueryOption (same interface as useQuery but returning Option)
export function useQueryOption<
  ApiObject extends Record<string, any>,
  M extends keyof ApiObject,
  F extends keyof ApiObject[M] & string,
>(
  apiObject: ApiObject,
  moduleName: M,
  functionName: F,
): (args: InferFunctionArgs<ApiObject[M][F]>) => Option.Option<InferFunctionReturnsHybrid<ApiObject[M][F], F>>

// Implementation that handles the API (same strategy as useQuery but returns Option)
export function useQueryOption(...args: any[]) {
  // Extract arguments
  const [apiObject, moduleName, functionName] = args
  const fn = apiObject[moduleName][functionName]

  return (actualArgs: any) => {
    // Use the existing Convex hook to get result
    const convexResult = useConvexQuery(fn, actualArgs)

    // Transform result to Option
    if (convexResult === undefined) {
      // Still loading - return None
      return Option.none()
    }

    // Return Some with the result
    return Option.some(convexResult)
  }
}


// Dynamic API overload (same as useQuery but returning Effect)
export function useQuery<
  ApiObject extends Record<string, any>,
  M extends keyof ApiObject,
  F extends keyof ApiObject[M] & string,
>(
  apiObject: ApiObject,
  moduleName: M,
  functionName: F,
): (args: InferFunctionArgs<ApiObject[M][F]>) => Effect.Effect<InferFunctionReturnsHybrid<ApiObject[M][F], F>, InferFunctionErrors<F>, never>

// Implementation that handles the API (same strategy as useQuery)
export function useQuery(...args: any[]) {
  // Extract arguments
  const [apiObject, moduleName, functionName] = args
  const fn = apiObject[moduleName][functionName]

  return (actualArgs: any) => {
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
export function useMutation<
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
export function useAction<
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