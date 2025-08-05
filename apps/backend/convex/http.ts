import { HttpMiddleware } from '@effect/platform'
import { makeConvexHttpRouter } from '@monorepo/confect/server'
import { flow } from 'effect'
import { ApiLive } from './http/api.ts'

export default makeConvexHttpRouter({
  '/path-prefix/': {
    apiLive: ApiLive,
    middleware: flow(HttpMiddleware.cors(), HttpMiddleware.logger),
  },
})
