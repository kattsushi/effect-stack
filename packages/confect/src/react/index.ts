import { useConvexQuery, useConvexAction, useConvexMutation } from "@convex-dev/react-query";
import { Effect } from 'effect'
import * as Option from 'effect/Option'
import type {
  InferFunctionErrors,
  InferFunctionArgs,
  InferFunctionReturns
} from './types'

export type { ConfectErrorTypes } from './types'

/**
 * Hook for reactive queries that return Effect. Use this for data fetching
 * operations that need reactive updates and Effect-based error handling.
 *
 * @example
 * ```tsx
 * import { api } from '@/convex/_generated/api'
 * import { useQuery } from '@monorepo/confect/react'
 * import { Effect } from 'effect'
 * import { runtime } from '@/lib/runtime'
 *
 * function TodosList() {
 *   const [todos, setTodos] = useState([])
 *   const todosEffect = useQuery(api, 'functions', 'listTodos')({})
 *
 *   useEffect(() => {
 *     const program = todosEffect.pipe(
 *       Effect.catchAll(error => Effect.log(`Failed: ${error}`))
 *     )
 *     runtime.runPromise(program).then(setTodos)
 *   }, [todosEffect])
 *
 *   return <div>{todos.map(todo => <div key={todo._id}>{todo.text}</div>)}</div>
 * }
 * ```
 */
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

export function useQuery(...args: any[]) {
  const [apiObject, moduleName, functionName] = args
  const fn = apiObject[moduleName][functionName]

  return (actualArgs: any) => {
    try {
      const convexResult = useConvexQuery(fn as any, actualArgs)

      if (convexResult === undefined) {
        return Effect.never
      }

      if (convexResult && typeof convexResult === 'object') {
        if ('__convexError' in convexResult) {
          return Effect.fail((convexResult as any).__convexError)
        }

        if ('_tag' in convexResult && 'message' in convexResult) {
          return Effect.fail(convexResult)
        }

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

        if ('error' in convexResult && convexResult.error) {
          const error = (convexResult as any).error
          if (error && typeof error === 'object' && 'data' in error) {
            return Effect.fail(error.data)
          }
          return Effect.fail(error)
        }

        if ('data' in convexResult) {
          const data = (convexResult as any).data
          if (data === undefined) {
            return Effect.never
          }
          return Effect.succeed(data)
        }
      }

      return Effect.succeed(convexResult)
    } catch (error) {
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

      return Effect.fail(error as any)
    }
  }
}

/**
 * Hook for mutations that return Effect. Use this for data modification
 * operations that need Effect-based error handling and composition.
 *
 * @example
 * ```tsx
 * import { api } from '@/convex/_generated/api'
 * import { useMutation } from '@monorepo/confect/react'
 * import { Effect } from 'effect'
 * import { runtime } from '@/lib/runtime'
 *
 * function AddTodoForm() {
 *   const [text, setText] = useState('')
 *   const addTodoEffect = useMutation(api, 'functions', 'insertTodo')
 *
 *   const handleSubmit = () => {
 *     const program = addTodoEffect({ text }).pipe(
 *       Effect.catchTags({
 *         ValidationError: () => Effect.log('Invalid input'),
 *         NetworkError: () => Effect.log('Network failed')
 *       }),
 *       Effect.tap(() => Effect.sync(() => setText('')))
 *     )
 *     runtime.runPromise(program)
 *   }
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input value={text} onChange={(e) => setText(e.target.value)} />
 *       <button type="submit">Add Todo</button>
 *     </form>
 *   )
 * }
 * ```
 */
export function useMutation<
  ApiObject extends Record<string, any>,
  M extends keyof ApiObject,
  F extends keyof ApiObject[M] & string,
>(
  apiObject: ApiObject,
  moduleName: M,
  functionName: F,
): (args: InferFunctionArgs<ApiObject[M][F]>) => Effect.Effect<InferFunctionReturns<ApiObject[M][F]>, InferFunctionErrors<F>, never>

export function useMutation(...args: any[]) {
  const [apiObject, moduleName, functionName] = args
  const fn = apiObject[moduleName][functionName]
  const convexMutation = useConvexMutation(fn as any)

  return (actualArgs: any) =>
    Effect.tryPromise({
      try: () => convexMutation(actualArgs),
      catch: (error) => {
        if (error && typeof error === 'object' && 'message' in error) {
          const message = (error as any).message

          if (message && message.includes('ConvexError:')) {
            const jsonMatch = message.match(/ConvexError: ({.*})/)
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[1])

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

/**
 * Hook for actions that return Effect. Use this for operations that need
 * to run in the background without blocking the UI.
 *
 * @example
 * ```tsx
 * import { api } from '@/convex/_generated/api'
 * import { useAction } from '@monorepo/confect/react'
 * import { Effect } from 'effect'
 * import { runtime } from '@/lib/runtime'
 *
 * function TodoItem({ todo }) {
 *   const toggleTodoEffect = useAction(api, 'functions', 'toggleTodo')
 *
 *   const handleToggle = () => {
 *     const program = toggleTodoEffect({ id: todo._id }).pipe(
 *       Effect.catchAll(error =>
 *         Effect.log(`Failed to toggle todo: ${error}`)
 *       )
 *     )
 *     runtime.runPromise(program)
 *   }
 *
 *   return (
 *     <div>
 *       <input
 *         type="checkbox"
 *         checked={todo.completed}
 *         onChange={handleToggle}
 *       />
 *       {todo.text}
 *     </div>
 *   )
 * }
 * ```
 */
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

/**
 * Hook for queries that return Option with loading and error states.
 * Use this when you need simple reactive queries without Effect composition.
 *
 * @example
 * ```tsx
 * import { api } from '@/convex/_generated/api'
 * import { useQueryOption } from '@monorepo/confect/react'
 * import * as Option from 'effect/Option'
 *
 * function TodosList() {
 *   const todosQuery = useQueryOption(api, 'functions', 'listTodos')({})
 *
 *   if (todosQuery.loading) {
 *     return <div>Loading...</div>
 *   }
 *
 *   if (todosQuery.error) {
 *     return <div>Error loading todos</div>
 *   }
 *
 *   return Option.match(todosQuery.data, {
 *     onNone: () => <div>No todos found</div>,
 *     onSome: (todos) => (
 *       <ul>
 *         {todos.map(todo => <li key={todo._id}>{todo.text}</li>)}
 *       </ul>
 *     )
 *   })
 * }
 * ```
 */
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
