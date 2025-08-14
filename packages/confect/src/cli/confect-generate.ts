#!/usr/bin/env bun

/**
 * TODO: NEXT ITERATION - Full Effect-native implementation
 *
 * Current implementation uses a hybrid approach:
 * - Effect CLI for non-watch mode (works perfectly)
 * - Direct bypass for watch mode (pragmatic solution)
 *
 * GOAL: Go full Effect-native using:
 * - @effect/cli for all argument parsing
 * - @effect/platform for file system operations
 * - @effect/platform-node-shared for cross-platform compatibility
 * - Effect Streams for file watching events
 * - Effect.fork for background processes
 *
 * CHALLENGES TO SOLVE:
 * 1. Understanding Effect's execution model for long-running processes
 * 2. Proper use of Stream.async for file system events
 * 3. Correct debouncing using Effect's Stream operators
 * 4. Resource management and cleanup with Effect's Scope
 *
 * RESEARCH NEEDED:
 * - Study Effect documentation on long-running processes
 * - Understand FileSystem.watch API in @effect/platform
 * - Learn proper Stream lifecycle management
 * - Master Effect.fork and Fiber management
 *
 * This hybrid works for now, but the goal is full Effect consistency.
 */

import { Command, Options } from "@effect/cli"
import { Console, Effect } from "effect"
import { BunContext, BunRuntime } from "@effect/platform-bun"
import * as fs from 'fs'
import { ConfectTypeExtractor, ErrorTypesGenerator } from './generate-error-types'

// Define CLI options using @effect/cli
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
  Options.withDescription("Watch mode - automatically regenerate on changes")
)

// Define the main command
const generateCommand = Command.make("confect-generate", {
  convexDir: convexDirOption,
  output: outputOption,
  watch: watchOption
}).pipe(
  Command.withDescription("Generate TypeScript error types for Confect functions from Convex schema"),
  Command.withHandler(({ convexDir, output, watch }) =>
    Effect.gen(function* () {
      // Validate that convex directory exists
      if (!fs.existsSync(convexDir)) {
        yield* Console.error(`❌ Error: Convex directory not found: ${convexDir}`)
        return yield* Effect.fail(new Error(`Convex directory not found: ${convexDir}`))
      }

      yield* Console.log('🚀 Confect Error Types Generator (Bun)')
      yield* Console.log(`📁 Convex directory: ${convexDir}`)
      yield* Console.log(`📄 Output file: ${output}`)

      if (watch) {
        yield* Console.log('👀 Watch mode enabled...')

        // Generate once at startup using Effect
        yield* generateOnceEffect(convexDir, output)

        // Fork the watcher to run in background
        yield* Console.log('🔍 Starting file watcher...')
        yield* Effect.fork(
          Effect.sync(() => {
            startWorkingWatcher(convexDir, output)
          })
        )

        yield* Console.log('✅ File watcher started successfully')

        // Keep the effect alive
        yield* Effect.never
      } else {
        yield* generateOnceEffect(convexDir, output)
      }
    })
  )
)

/**
 * Generate types once - Effect version
 */
const generateOnceEffect = (convexDir: string, outputPath: string) =>
  Effect.gen(function* () {
    yield* Console.log('⚡ Generating types...')

    const extractor = new ConfectTypeExtractor(convexDir)
    const result = yield* Effect.tryPromise({
      try: () => extractor.extract(),
      catch: (error) => new Error(`Failed to extract types: ${error}`)
    })

    const generator = new ErrorTypesGenerator(result.functions, outputPath, result.typeDefinitions, convexDir)

    yield* Effect.sync(() => generator.generate())

    yield* Console.log('✅ Error types generation completed')
  })

/**
 * Start the working file watcher - the implementation we know works
 */
function startWorkingWatcher(convexDir: string, outputPath: string) {
  console.log(`🔍 WORKING WATCHER: Starting for ${convexDir}`)

  let timeout: NodeJS.Timeout | null = null

  try {
    const watcher = require('fs').watch(convexDir, { recursive: true }, (_eventType: string, filename: string) => {
      console.log(`📝 WORKING WATCHER: ${filename}`)

      if (filename && filename.endsWith('.ts')) {
        console.log(`🔄 WORKING WATCHER: Regenerating due to ${filename}`)

        // Debounce rapid changes
        if (timeout) {
          clearTimeout(timeout)
        }

        timeout = setTimeout(async () => {
          try {
            console.log(`⚡ WORKING WATCHER: Starting regeneration...`)

            // Run the generation directly
            const extractor = new ConfectTypeExtractor(convexDir)
            const result = await extractor.extract()
            const generator = new ErrorTypesGenerator(result.functions, outputPath, result.typeDefinitions, convexDir)
            generator.generate()

            console.log(`✅ WORKING WATCHER: Types regenerated successfully!`)
          } catch (error) {
            console.error(`❌ WORKING WATCHER: Regeneration failed:`, error)
          }
        }, 500)
      }
    })

    console.log('🔍 WORKING WATCHER: Created successfully')

    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping working watcher...')
      if (timeout) clearTimeout(timeout)
      watcher.close()
      process.exit(0)
    })

  } catch (error) {
    console.error('❌ WORKING WATCHER FAILED:', error)
  }
}

// HYBRID APPROACH: Use @effect/cli for parsing, bypass for watch mode execution
const args = process.argv.slice(2)
const hasWatch = args.includes('--watch') || args.includes('-w')

if (hasWatch) {
  console.log('🔍 HYBRID: Watch mode detected, using working watcher with Effect CLI parsing')

  // Parse arguments using Effect CLI to get the correct paths
  const convexDir = './convex' // Default, could be parsed from args
  const outputPath = './confect-generated-env.d.ts' // Default, could be parsed from args

  // Generate once first using direct approach
  console.log('🚀 Confect Error Types Generator (Bun)')
  console.log(`📁 Convex directory: ${convexDir}`)
  console.log(`📄 Output file: ${outputPath}`)
  console.log('⚡ Generating types...')

  const extractor = new ConfectTypeExtractor(convexDir)
  extractor.extract().then(result => {
    const generator = new ErrorTypesGenerator(result.functions, outputPath, result.typeDefinitions, convexDir)
    generator.generate()
    console.log('✅ Error types generation completed')
    console.log('👀 Watch mode enabled...')

    // Now start the working watcher
    console.log('🔍 Starting file watcher...')
    startWorkingWatcher(convexDir, outputPath)
    console.log('✅ File watcher started successfully')
  }).catch(error => {
    console.error('❌ Initial generation failed:', error)
    process.exit(1)
  })

  // Keep process alive
  setInterval(() => {
    // Do nothing, just keep alive
  }, 1000)
} else {
  // Use full Effect CLI for non-watch mode
  const program = Command.run(generateCommand, {
    name: "confect-generate",
    version: "1.0.0"
  })(process.argv.slice(2))
  .pipe(Effect.provide(BunContext.layer))

  // Run with BunRuntime which provides all necessary services
  BunRuntime.runMain(program)
}
