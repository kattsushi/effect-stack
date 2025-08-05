/** biome-ignore-all lint/suspicious/noExplicitAny: Dynamic API with type inference */
import { useMutation as useMutationBase, useQuery as useQueryBase } from '@monorepo/confect/react'
import type * as Effect from 'effect/Effect'
import type * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

// Type inference from Convex FunctionReference
type InferFunctionArgs<T> = T extends { _args: infer Args } ? Args : any
type InferFunctionReturns<T> = T extends { _returnType: infer Returns } ? Returns : any

// Dynamic API with type inference
export function useQuery<
  ApiObject extends Record<string, any>,
  M extends keyof ApiObject,
  F extends keyof ApiObject[M],
>(
  apiObject: ApiObject,
  moduleName: M,
  functionName: F,
): (args: InferFunctionArgs<ApiObject[M][F]>) => Option.Option<InferFunctionReturns<ApiObject[M][F]>> {
  const fn = (apiObject[moduleName] as any)[functionName]

  if (!fn) {
    throw new Error(`Function not found in ${String(moduleName)}.${String(functionName)}`)
  }

  // Use generic Schema objects that work with any function
  return (useQueryBase as any)({
    query: fn,
    args: Schema.Any,
    returns: Schema.Any,
  })
}

export function useMutation<
  ApiObject extends Record<string, any>,
  M extends keyof ApiObject,
  F extends keyof ApiObject[M],
>(
  apiObject: ApiObject,
  moduleName: M,
  functionName: F,
): (args: InferFunctionArgs<ApiObject[M][F]>) => Effect.Effect<InferFunctionReturns<ApiObject[M][F]>> {
  const fn = (apiObject[moduleName] as any)[functionName]

  if (!fn) {
    throw new Error(`Function not found in ${String(moduleName)}.${String(functionName)}`)
  }

  // Use generic Schema objects that work with any function
  return (useMutationBase as any)({
    mutation: fn,
    args: Schema.Any,
    returns: Schema.Any,
  })
}
