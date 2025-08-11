import { Atom } from '@effect-atom/atom-react'
// import * as Effect from 'effect/Effect'
import type * as Layer from 'effect/Layer'
import * as ManagedRuntime from 'effect/ManagedRuntime'

export const makeAtomRuntimeLayer = <R, E>(layer: Layer.Layer<R, E, never>) => {
  const makeAtomRuntime = Atom.context({ memoMap: Atom.defaultMemoMap })
  return {
    runtime: ManagedRuntime.make(layer),
    makeAtomRuntime,
    atomRuntime: makeAtomRuntime(layer),
  }
}
