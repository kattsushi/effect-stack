import * as FetchHttpClient from '@effect/platform/FetchHttpClient'
import { makeAtomRuntimeLayer } from '@monorepo/shared/make-atom-runtime-layer'
import * as ConfigProvider from 'effect/ConfigProvider'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Logger from 'effect/Logger'
import * as LogLevel from 'effect/LogLevel'
import { ApiService } from './api'

export const MainLayer = Logger.pretty.pipe(
  Layer.provideMerge(Layer.setConfigProvider(ConfigProvider.fromJson(import.meta.env))),
  Layer.provideMerge(Logger.minimumLogLevel(LogLevel.Debug)),
  Layer.provideMerge(ApiService.Default.pipe(Layer.provide(FetchHttpClient.layer))),
  Layer.tapErrorCause(Effect.logError),
)

export const { runtime, makeAtomRuntime, atomRuntime } = makeAtomRuntimeLayer(MainLayer)

makeAtomRuntime.addGlobalLayer(MainLayer)
