import { Rx } from '@effect-rx/rx-react'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as ManagedRuntime from 'effect/ManagedRuntime'

export const makeRxRuntimeLayer = <R, E>(layer: Layer.Layer<R, E, never>) => {
  const memoMap = Effect.runSync(Layer.makeMemoMap)
  const makeRxRuntime = Rx.context({ memoMap })
  return {
    runtime: ManagedRuntime.make(layer, memoMap),
    makeRxRuntime,
    rxRuntime: makeRxRuntime(layer),
  }
}
