import { type Atom, type Result, useAtomSet, useAtomValue } from '@effect-atom/atom-react'
import React from 'react'

export const useAtomSetPromiseUnwrapped = <E, A, W>(atom: Atom.Writable<Result.Result<A, E>, W>) => {
  const set = useAtomSet(atom, { mode: 'promise' })

  return React.useCallback(
    (
      _: W,

      options?:
        | {
            readonly signal?: AbortSignal | undefined
          }
        | undefined,
    ) => set(_, options),

    [set],
  )
}

export const useAtomPromiseUnwrapped = <E, A, W>(atom: Atom.Writable<Result.Result<A, E>, W>) => {
  return [useAtomValue(atom), useAtomSetPromiseUnwrapped(atom)] as const
}

export const useAtomPromise = <E, A, W>(atom: Atom.Writable<Result.Result<A, E>, W>) => {
  return [useAtomValue(atom), useAtomSet(atom, { mode: 'promise' })] as const
}
