import { Rx } from '@effect-rx/rx-react'
import { Effect, Layer, Logger, LogLevel, ManagedRuntime } from 'effect'

const memoMap = Effect.runSync(Layer.makeMemoMap)

const MainLayer = Logger.pretty.pipe(
  Layer.provideMerge(Logger.minimumLogLevel(LogLevel.Debug)),
  Layer.tapErrorCause(Effect.logError),
)

export const runtime = ManagedRuntime.make(MainLayer, memoMap)

export const makeRxRuntime = Rx.context({ memoMap })
export const rxRuntime = makeRxRuntime(MainLayer)
