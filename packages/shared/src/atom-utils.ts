import { type Atom, Result, useAtomSet, useAtomValue } from '@effect-atom/atom-react'
import * as Cause from 'effect/Cause'
import React from 'react'

export const useAtomSetPromiseUnwrapped = <E, A, W>(atom: Atom.Writable<Result.Result<A, E>, W>) => {
  const set = useAtomSet(atom)
  const currentValue = useAtomValue(atom)

  return React.useCallback(
    (_: W) => {
      // Execute the set operation (now synchronous)
      set(_)

      // Since the operation is synchronous and we can't get the immediate result,
      // we'll create a Promise that resolves based on the current atom state
      return new Promise<A>((resolve, reject) => {
        // Use a microtask to allow the atom state to update
        Promise.resolve().then(() => {
          // Check the current state and handle accordingly
          Result.match(currentValue, {
            onSuccess: (result) => resolve(result.value),
            onFailure: (result) => reject(Cause.squash(result.cause)),
            onInitial: () => {
              // If still initial/loading, reject with a meaningful error
              reject(new Error('Operation is still in initial/loading state'))
            },
          })
        })
      })
    },
    [set, currentValue],
  )
}

export const useAtomPromiseUnwrapped = <E, A, W>(rx: Atom.Writable<Result.Result<A, E>, W>) => {
  return [useAtomValue(rx), useAtomSetPromiseUnwrapped(rx)] as const
}

export const useAtomPromise = <E, A, W>(rx: Atom.Writable<Result.Result<A, E>, W>) => {
  return [useAtomValue(rx), useAtomSet(rx)] as const
}
