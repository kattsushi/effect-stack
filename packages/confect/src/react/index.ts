import { useConvexQuery, useConvexAction, useConvexMutation } from "@convex-dev/react-query";
import type { FunctionReference } from "convex/server";
import React, { createContext, useContext } from 'react'

import { Effect } from 'effect'
import * as Option from 'effect/Option'

// Import shared type utilities
import type {
  ConfectErrorTypes,
  InferFunctionErrors,
  InferFunctionArgs,
  InferFunctionReturns
} from './types'

// Re-export for backward compatibility
export type { ConfectErrorTypes } from './types'



// Dynamic API overload for useQuery
export function useQuery<
  ApiObject extends Record<string, any>,
  M extends keyof ApiObject,
  F extends keyof ApiObject[M] & string,
>(
  apiObject: ApiObject,
  moduleName: M,
  functionName: F,
): (args: InferFunctionArgs<ApiObject[M][F]>) => Effect.Effect<
  InferFunctionReturns<ApiObject[M][F]>,
  InferFunctionErrors<F>,
  never
>

// Implementation that handles the API
export function useQuery(...args: any[]) {
  // Extract arguments
  const [apiObject, moduleName, functionName] = args
  const fn = apiObject[moduleName][functionName]

  return (actualArgs: any) => {
    // Use the existing Convex hook to get result
    const convexResult = useConvexQuery(fn as any, actualArgs)

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

// Dynamic API overload for useMutation
export function useMutation<
  ApiObject extends Record<string, any>,
  M extends keyof ApiObject,
  F extends keyof ApiObject[M] & string,
>(
  apiObject: ApiObject,
  moduleName: M,
  functionName: F,
): (args: InferFunctionArgs<ApiObject[M][F]>) => Effect.Effect<InferFunctionReturns<ApiObject[M][F]>, InferFunctionErrors<F>, never>

// Implementation that handles the API
export function useMutation(...args: any[]) {
  // Extract arguments
  const [apiObject, moduleName, functionName] = args
  const fn = apiObject[moduleName][functionName]
  const convexMutation = useConvexMutation(fn as any)

  return (actualArgs: any) =>
    Effect.tryPromise({
      try: () => convexMutation(actualArgs),
      catch: (error) => {
        // Best-effort: return parsed ConvexError payload if available, else raw error
        if (error && typeof error === 'object' && 'message' in error) {
          const message = (error as any).message
          if (message && message.includes('ConvexError:')) {
            const jsonMatch = message.match(/ConvexError: ({.*})/)
            if (jsonMatch) {
              try {
                return JSON.parse(jsonMatch[1])
              } catch {}
            }
          }
        }
        return error as any
      },
    })
}

// Dynamic API overload for useAction
export function useAction<
  ApiObject extends Record<string, any>,
  M extends keyof ApiObject,
  F extends keyof ApiObject[M] & string,
>(
  apiObject: ApiObject,
  moduleName: M,
  functionName: F,
): (args: InferFunctionArgs<ApiObject[M][F]>) => Effect.Effect<InferFunctionReturns<ApiObject[M][F]>, InferFunctionErrors<F>, never>

// Implementation that handles the API
export function useAction(...args: any[]) {
  // Extract arguments
  const [apiObject, moduleName, functionName] = args
  const fn = apiObject[moduleName][functionName]
  const convexAction = useConvexAction(fn as any)

  return (actualArgs: any) =>
    Effect.tryPromise({
      try: () => convexAction(actualArgs),
      catch: (error) => {
        if (error && typeof error === 'object' && 'message' in error) {
          const message = (error as any).message
          if (message && message.includes('ConvexError:')) {
            const jsonMatch = message.match(/ConvexError: ({.*})/)
            if (jsonMatch) {
              try {
                return JSON.parse(jsonMatch[1])
              } catch {}
            }
          }
        }
        return error as any
      },
    })
}

// Dynamic API overload for useQueryOption (same as useQuery but returning Option)
export function useQueryOption<
  ApiObject extends Record<string, any>,
  M extends keyof ApiObject,
  F extends keyof ApiObject[M] & string,
>(
  apiObject: ApiObject,
  moduleName: M,
  functionName: F,
): (args: InferFunctionArgs<ApiObject[M][F]>) => Option.Option<InferFunctionReturns<ApiObject[M][F]>>

// Implementation that handles the API (same strategy as useQuery)
export function useQueryOption(...args: any[]) {
  // Extract arguments
  const [apiObject, moduleName, functionName] = args
  const fn = apiObject[moduleName][functionName]

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
