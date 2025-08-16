#!/usr/bin/env node

import * as Effect from "effect/Effect"
import * as Console from "effect/Console"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import { ConfectTypeExtractorService } from './type-extractor-service'
import { ErrorTypesGenerator } from "./error-type-generator-service"

/**
 * Effect-based service for generating Confect error types.
 *
 * This service orchestrates the extraction of Confect functions and generation
 * of TypeScript type definitions using Effect-native FileSystem operations.
 *
 * @since 1.0.0
 * @example
 * ```typescript
 * const generator = yield* ConfectTypeGeneratorService
 * yield* generator.generate('./convex', './types.d.ts')
 * ```
 */
export class ConfectTypeGeneratorService extends Effect.Service<ConfectTypeGeneratorService>()("ConfectTypeGeneratorService", {
  dependencies: [ConfectTypeExtractorService.Default],
  effect: Effect.gen(function* () {
    return {
      /**
       * Generates TypeScript error type definitions for Confect functions.
       *
       * @param convexDir - Path to the Convex directory to scan
       * @param outputPath - Path where the generated types file will be written
       * @returns Effect that completes when type generation is done
       * @since 1.0.0
       */
      generate: (convexDir: string, outputPath: string) =>
        Effect.gen(function* () {
          yield* Console.log('⚡ Generating types...')

          const extractor = yield* ConfectTypeExtractorService
          const result = yield* extractor.extract(convexDir)



          // Generate the output file using Effect-native FileSystem
          const fs = yield* FileSystem.FileSystem
          const path = yield* Path.Path

          // Generate content using existing logic
          const generator = new ErrorTypesGenerator(result.functions, outputPath, result.typeDefinitions, convexDir)
          const content = yield* Effect.sync(() => generator['generateTypeDefinitions']())

          // Ensure output path ends with .d.ts
          let finalOutputPath = outputPath
          if (!finalOutputPath.endsWith('.d.ts')) {
            finalOutputPath = finalOutputPath.replace(/\.ts$/, '.d.ts')
            if (!finalOutputPath.endsWith('.d.ts')) {
              finalOutputPath += '.d.ts'
            }
          }

          // Create directory if it doesn't exist using Effect-native FileSystem
          const dir = path.dirname(finalOutputPath)
          const dirExists = yield* fs.exists(dir)
          if (!dirExists) {
            yield* fs.makeDirectory(dir, { recursive: true })
          }

          // Write file using Effect-native FileSystem
          yield* fs.writeFileString(finalOutputPath, content)
          yield* Console.log(`✅ Types generated: ${finalOutputPath}`)

          // Use existing methods for additional file operations
          // TODO: Refactor these to be Effect-native as well
          yield* Effect.sync(() => {
            generator['updateGitignore']()
            generator['createAutoImportFile']()
            generator['updatePackageJsonExport'](finalOutputPath)
          })

          yield* Console.log('✅ Types generated')
        })
    }
  })
}) {}

// This file is now imported by the CLI, not executed directly
