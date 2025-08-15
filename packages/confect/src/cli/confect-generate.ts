#!/usr/bin/env bun
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Options from "@effect/cli/Options"
import * as Command from "@effect/cli/Command"
import * as Stream from "effect/Stream"
import * as BunContext from "@effect/platform-bun/BunContext"
import * as BunRuntime from "@effect/platform-bun/BunRuntime"
import * as FileSystem from "@effect/platform/FileSystem"
import { ConfectTypeExtractor, ErrorTypesGenerator } from './generate-error-types'

const convexDirOption = Options.text("convex-dir").pipe(
  Options.withAlias("d"),
  Options.withDefault("./convex"),
  Options.withDescription("Convex functions directory")
)

const outputOption = Options.text("output").pipe(
  Options.withAlias("o"),
  Options.withDefault("./confect-generated-env.d.ts"),
  Options.withDescription("Output file path")
)

const watchOption = Options.boolean("watch").pipe(
  Options.withAlias("w"),
  Options.withDefault(false),
  Options.withDescription("Watch mode - automatically regenerate on changes")
)


const generateCommand = Command.make("confect-generate", {
  convexDir: convexDirOption,
  output: outputOption,
  watch: watchOption
}).pipe(
  Command.withDescription("Generate TypeScript error types for Confect functions from Convex schema"),
  Command.withHandler(({ convexDir, output, watch }) =>
    Effect.gen(function* () {
      yield* Console.log('🚀 Confect Error Types Generator')

      const fileSystem = yield* FileSystem.FileSystem
      const dirExists = yield* fileSystem.exists(convexDir)
      if (!dirExists) {
        yield* Console.error(`❌ Convex directory not found: ${convexDir}`)
        return yield* Effect.fail(new Error(`Convex directory not found: ${convexDir}`))
      }

      if (watch) {
        yield* generateOnceEffect(convexDir, output)
        yield* Console.log('� Watching for changes...')

        yield* fileSystem.watch(convexDir, { recursive: true }).pipe(
          Stream.filter((event) => event.path.endsWith(".ts")),
          Stream.debounce("500 millis"),
          Stream.mapEffect(() => generateOnceEffect(convexDir, output)),
          Stream.runDrain,
          Effect.forkScoped
        )

        yield* Effect.never
      } else {
        yield* generateOnceEffect(convexDir, output)
      }
    })
  )
)

const generateOnceEffect = (convexDir: string, outputPath: string) =>
  Effect.gen(function* () {
    const extractor = new ConfectTypeExtractor(convexDir)
    const result = yield* Effect.tryPromise({
      try: () => extractor.extract(),
      catch: (error) => new Error(`Failed to extract types: ${error}`)
    })

    const generator = new ErrorTypesGenerator(result.functions, outputPath, result.typeDefinitions, convexDir)
    yield* Effect.sync(() => generator.generate())
    yield* Console.log('✅ Types generated')
  })


const program = Command.run(generateCommand, {
  name: "confect-generate",
  version: "1.0.0"
})(process.argv)
.pipe(
  Effect.provide(BunContext.layer),
  Effect.scoped
)


BunRuntime.runMain(program)
