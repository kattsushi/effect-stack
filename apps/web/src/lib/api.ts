import * as HttpApiClient from '@effect/platform/HttpApiClient'
import { Api } from '@monorepo/backend/convex/http/api'
import * as Config from 'effect/Config'
import * as Effect from 'effect/Effect'

export class ApiService extends Effect.Service<ApiService>()('ApiService', {
  effect: Effect.gen(function* () {
    return yield* HttpApiClient.make(Api, {
      baseUrl: yield* Config.url('VITE_CONVEX_API_URL').pipe(Config.withDefault('http://localhost:3211')),
    })
  }),
}) {}
