import { api } from '@monorepo/backend/convex/_generated/api'
import { CONFECT_FUNCTION_METADATA } from '@monorepo/backend/convex/functions'
import { useQuery as useQueryBase, useMutation as useMutationBase } from '@monorepo/confect/react'
import * as Option from 'effect/Option'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'

// Type helpers to extract the correct types from metadata
type ExtractArgsType<T> = T extends Schema.Schema<infer A, any> ? A : never
type ExtractReturnsType<T> = T extends Schema.Schema<infer R, any> ? R : never

// Type helpers for dynamic module access
type ApiModules = typeof api
type ModuleName = keyof ApiModules

// Type helpers for metadata lookup
type QueryReturnType<K extends keyof typeof CONFECT_FUNCTION_METADATA> =
  (args: ExtractArgsType<typeof CONFECT_FUNCTION_METADATA[K]['args']>) =>
  Option.Option<ExtractReturnsType<typeof CONFECT_FUNCTION_METADATA[K]['returns']>>

type MutationReturnType<K extends keyof typeof CONFECT_FUNCTION_METADATA> =
  (args: ExtractArgsType<typeof CONFECT_FUNCTION_METADATA[K]['args']>) =>
  Effect.Effect<ExtractReturnsType<typeof CONFECT_FUNCTION_METADATA[K]['returns']>>

// Enhanced hooks that automatically add metadata with proper types

// New dynamic API: useQuery with module and function name
export function useQuery<
  M extends ModuleName,
  F extends keyof typeof CONFECT_FUNCTION_METADATA
>(
  moduleName: M,
  functionName: F
): QueryReturnType<F> {
  const metadata = CONFECT_FUNCTION_METADATA[functionName]
  const fn = (api[moduleName] as any)[functionName]

  if (!metadata) {
    throw new Error(`No metadata found for function: ${String(functionName)}`)
  }

  if (!fn) {
    throw new Error(`Function not found in api.${String(moduleName)}: ${String(functionName)}`)
  }

  if (metadata.type !== 'query') {
    throw new Error(`Function ${String(functionName)} is not a query`)
  }

  // Use legacy API with metadata from our mapping
  return (useQueryBase as any)({
    query: fn,
    args: metadata.args,
    returns: metadata.returns,
  }) as QueryReturnType<F>
}

// Legacy API: useQuery with just function name (assumes 'functions' module)
export function useQueryLegacy<K extends keyof typeof CONFECT_FUNCTION_METADATA>(
  functionName: K
): QueryReturnType<K> {
  return useQuery('functions', functionName as any)
}

// New dynamic API: useMutation with module and function name
export function useMutation<
  M extends ModuleName,
  F extends keyof typeof CONFECT_FUNCTION_METADATA
>(
  moduleName: M,
  functionName: F
): MutationReturnType<F> {
  const metadata = CONFECT_FUNCTION_METADATA[functionName]
  const fn = (api[moduleName] as any)[functionName]

  if (!metadata) {
    throw new Error(`No metadata found for function: ${String(functionName)}`)
  }

  if (!fn) {
    throw new Error(`Function not found in api.${String(moduleName)}: ${String(functionName)}`)
  }

  if (metadata.type !== 'mutation') {
    throw new Error(`Function ${String(functionName)} is not a mutation`)
  }

  // Use legacy API with metadata from our mapping
  return (useMutationBase as any)({
    mutation: fn,
    args: metadata.args,
    returns: metadata.returns,
  }) as MutationReturnType<F>
}

// Legacy API: useMutation with just function name (assumes 'functions' module)
export function useMutationLegacy<K extends keyof typeof CONFECT_FUNCTION_METADATA>(
  functionName: K
): MutationReturnType<K> {
  return useMutation('functions', functionName as any)
}

// Convenience functions for the common case where module is 'functions'
export const useQueryFromFunctions = <K extends keyof typeof CONFECT_FUNCTION_METADATA>(
  functionName: K
): QueryReturnType<K> => useQuery('functions', functionName as any)

export const useMutationFromFunctions = <K extends keyof typeof CONFECT_FUNCTION_METADATA>(
  functionName: K
): MutationReturnType<K> => useMutation('functions', functionName as any)
