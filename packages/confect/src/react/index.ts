import { useConvexQuery, useConvexAction, useConvexMutation } from "@convex-dev/react-query";

import { Effect } from 'effect'
import * as Option from 'effect/Option'

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

type InferFunctionReturnsHybrid<T, _F> = InferFunctionReturns<T>

// Dynamic API overload for useQueryOption (same as useQuery but returning Option)
export function useQueryOption<
  Fn extends { _args: any; _returnType: any },
  F extends string = string,
>(
  fn: Fn,
): (args: InferFunctionArgs<Fn>) => Option.Option<InferFunctionReturnsHybrid<Fn, F>>

// Implementation that handles the API (same strategy as useQuery)
export function useQueryOption(fn: any) {
  return (actualArgs: any) => {
    // Use the existing Convex hook to get result
    const convexResult = useConvexQuery(fn, actualArgs)

    // Transform result to Option
    if (convexResult === undefined) {
      // Still loading - return none
      return Option.none()
    }

    // Return some with the result
    return Option.some(convexResult)
  }
}

// Dynamic API overload (same as useQuery but returning Effect)
export function useQuery<
  Fn extends { _args: any; _returnType: any },
  F extends string = string,
>(
  fn: Fn,
): (args: InferFunctionArgs<Fn>) => Effect.Effect<InferFunctionReturnsHybrid<Fn, F>, InferFunctionErrors<F>, never>

// Implementation that handles the API (same strategy as useQuery)
export function useQuery(fn: any) {
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
  Fn extends { _args: any; _returnType: any },
  F extends string = string,
>(
  fn: Fn,
): (args: InferFunctionArgs<Fn>) => Effect.Effect<InferFunctionReturnsHybrid<Fn, F>, InferFunctionErrors<F>, never> {
  const convexMutation = useConvexMutation(fn as any)

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
  Fn extends { _args: any; _returnType: any },
  F extends string = string,
>(
  fn: Fn,
): (args: InferFunctionArgs<Fn>) => Effect.Effect<InferFunctionReturnsHybrid<Fn, F>, InferFunctionErrors<F>, never> {
  const convexAction = useConvexAction(fn as any)

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