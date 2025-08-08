import { Atom } from '@effect-atom/atom-react'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as ManagedRuntime from 'effect/ManagedRuntime'

export const makeAtomRuntimeLayer = <R, E>(layer: Layer.Layer<R, E, never>) => {
  const memoMap = Effect.runSync(Layer.makeMemoMap)
  const makeAtomRuntime = Atom.context({ memoMap })
  return {
    runtime: ManagedRuntime.make(layer, memoMap),
    makeAtomRuntime,
    atomRuntime: makeAtomRuntime(layer),
  }
}
