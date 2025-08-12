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
    // Wrap useConvexQuery in a try-catch to handle synchronous errors
    try {
      // Use the existing Convex hook to get result
      const convexResult = useConvexQuery(fn as any, actualArgs)

      // Transform result to Effect
      if (convexResult === undefined) {
        // Still loading - return never-resolving effect
        return Effect.never
      }

      // Check if the result is an error (multiple formats)
      if (convexResult && typeof convexResult === 'object') {
        // Format 1: __convexError (existing)
        if ('__convexError' in convexResult) {
          return Effect.fail((convexResult as any).__convexError)
        }

        // Format 2: ConvexError object directly
        if ('_tag' in convexResult && 'message' in convexResult) {
          return Effect.fail(convexResult)
        }

        // Format 3: Error object with ConvexError message
        if ('message' in convexResult) {
          const message = (convexResult as any).message
          if (typeof message === 'string' && message.includes('ConvexError:')) {
            const jsonMatch = message.match(/ConvexError: ({.*})/)
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[1])
                if (parsed && typeof parsed === 'object' && '_tag' in parsed) {
                  return Effect.fail(parsed)
                }
              } catch (parseError) {
                // Fall through
              }
            }
          }
        }

        // Format 4: Check if this is a TanStack Query result object with error
        if ('error' in convexResult && convexResult.error) {
          const error = (convexResult as any).error
          // Handle ConvexError from TanStack Query
          if (error && typeof error === 'object' && 'data' in error) {
            return Effect.fail(error.data)
          }
          return Effect.fail(error)
        }

        // Format 5: Check if this is a TanStack Query result object with data
        if ('data' in convexResult) {
          const data = (convexResult as any).data
          if (data === undefined) {
            // Still loading
            return Effect.never
          }
          return Effect.succeed(data)
        }
      }

      // Success case - return as-is to preserve types
      return Effect.succeed(convexResult)
    } catch (error) {
      // Handle synchronous errors from useConvexQuery

      // Parse ConvexError from the caught error
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as any).message
        if (typeof message === 'string' && message.includes('ConvexError:')) {
          const jsonMatch = message.match(/ConvexError: ({.*})/)
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[1])
              if (parsed && typeof parsed === 'object' && '_tag' in parsed) {
                return Effect.fail(parsed)
              }
            } catch (parseError) {
              // Fall through
            }
          }
        }
      }

      // Fallback: return raw error
      return Effect.fail(error as any)
    }
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
                const parsed = JSON.parse(jsonMatch[1])

                // Ensure the parsed error has the correct structure for Effect's catchTags
                if (parsed && typeof parsed === 'object' && '_tag' in parsed) {
                  return parsed
                } else {
                  return { _tag: 'UnknownError', message: JSON.stringify(parsed) }
                }
              } catch (parseError) {
                // Fall through to return raw error
              }
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

// Dynamic API overload for useQueryOption (returns Option with error and loading state)
export function useQueryOption<
  ApiObject extends Record<string, any>,
  M extends keyof ApiObject,
  F extends keyof ApiObject[M] & string,
>(
  apiObject: ApiObject,
  moduleName: M,
  functionName: F,
): (args: InferFunctionArgs<ApiObject[M][F]>) => {
  data: Option.Option<InferFunctionReturns<ApiObject[M][F]>>
  error: boolean
  loading: boolean
}

// Implementation that handles the API (same strategy as useQuery)
export function useQueryOption(...args: any[]) {
  // Extract arguments
  const [apiObject, moduleName, functionName] = args
  const fn = apiObject[moduleName][functionName]

  return (actualArgs: any) => {
    // Wrap useConvexQuery in a try-catch to handle synchronous errors
    try {
      // Use the existing Convex hook to get result
      const convexResult = useConvexQuery(fn, actualArgs)

      // Transform result to Option with error and loading state
      if (convexResult === undefined) {
        // Still loading
        return {
          data: Option.none(),
          error: false,
          loading: true
        }
      }

      // Check if the result is an error (multiple formats)
      if (convexResult && typeof convexResult === 'object') {
        // Format 1: __convexError (existing)
        if ('__convexError' in convexResult) {
          console.warn('Query failed in useQueryOption:', (convexResult as any).__convexError)
          return {
            data: Option.none(),
            error: true,
            loading: false
          }
        }

        // Format 2: ConvexError object directly
        if ('_tag' in convexResult && 'message' in convexResult) {
          console.warn('Query failed in useQueryOption:', convexResult)
          return {
            data: Option.none(),
            error: true,
            loading: false
          }
        }

        // Format 3: Error object with ConvexError message
        if ('message' in convexResult) {
          const message = (convexResult as any).message
          if (typeof message === 'string' && message.includes('ConvexError:')) {
            const jsonMatch = message.match(/ConvexError: ({.*})/)
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[1])
                if (parsed && typeof parsed === 'object' && '_tag' in parsed) {
                  console.warn('Query failed in useQueryOption:', parsed)
                  return {
                    data: Option.none(),
                    error: true,
                    loading: false
                  }
                }
              } catch (parseError) {
                // Fall through
              }
            }
          }
        }

        // Format 4: Check if this is a TanStack Query result object with error
        if ('error' in convexResult && convexResult.error) {
          console.warn('Query failed in useQueryOption:', (convexResult as any).error)
          return {
            data: Option.none(),
            error: true,
            loading: false
          }
        }

        // Format 5: Check if this is a TanStack Query result object with data
        if ('data' in convexResult) {
          const data = (convexResult as any).data
          if (data === undefined) {
            // Still loading
            return {
              data: Option.none(),
              error: false,
              loading: true
            }
          }
          return {
            data: Option.some(data),
            error: false,
            loading: false
          }
        }
      }

      // Success case - return some with the result
      return {
        data: Option.some(convexResult),
        error: false,
        loading: false
      }
    } catch (error) {
      // Handle synchronous errors from useConvexQuery
      console.warn('Query failed in useQueryOption with exception:', error)

      // Parse ConvexError from the caught error for better logging
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as any).message
        if (typeof message === 'string' && message.includes('ConvexError:')) {
          const jsonMatch = message.match(/ConvexError: ({.*})/)
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[1])
              if (parsed && typeof parsed === 'object' && '_tag' in parsed) {
                console.warn('Parsed ConvexError in useQueryOption:', parsed)
              }
            } catch (parseError) {
              // Fall through
            }
          }
        }
      }

      return {
        data: Option.none(),
        error: true,
        loading: false
      }
    }
  }
}
