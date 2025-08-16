#!/usr/bin/env node

import * as Effect from "effect/Effect"
import * as Console from "effect/Console"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import { ConfectTypeExtractorService } from './type-extractor-service'
import { ErrorTypesGeneratorService } from "./error-types-generator-service"

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
  dependencies: [ConfectTypeExtractorService.Default, ErrorTypesGeneratorService.Default],
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

          const generator = yield* ErrorTypesGeneratorService
          yield* generator.generate(result.functions, outputPath, result.typeDefinitions, convexDir)

          const fs = yield* FileSystem.FileSystem
          const path = yield* Path.Path

          let finalOutputPath = outputPath
          if (!finalOutputPath.endsWith('.d.ts')) {
            finalOutputPath = finalOutputPath.replace(/\.ts$/, '.d.ts')
            if (!finalOutputPath.endsWith('.d.ts')) {
              finalOutputPath += '.d.ts'
            }
          }

          yield* createEnvironmentFiles(fs, path, finalOutputPath)
        })
    }
  })
}) {}

/**
 * Finds the monorepo root directory by looking for package.json with workspaces.
 *
 * @param fs - FileSystem service instance
 * @param path - Path service instance
 * @param startDir - Directory to start searching from
 * @returns Effect that resolves to the monorepo root path
 * @since 1.0.0
 * @internal
 */
const findMonorepoRoot = (
  fs: FileSystem.FileSystem,
  path: Path.Path,
  startDir: string
) =>
  Effect.gen(function* () {
    let currentDir = startDir

    while (currentDir !== path.dirname(currentDir)) {
      const packageJsonPath = path.join(currentDir, 'package.json')
      const exists = yield* fs.exists(packageJsonPath)

      if (exists) {
        const content = yield* fs.readFileString(packageJsonPath)
        const packageJson = JSON.parse(content)

        // Check if this package.json has workspaces (indicating monorepo root)
        if (packageJson.workspaces) {
          return currentDir
        }
      }

      currentDir = path.dirname(currentDir)
    }

    // Fallback: if no workspaces found, assume current directory is correct
    return startDir
  })

/**
 * Gets the backend package name from the current directory's package.json.
 *
 * @param fs - FileSystem service instance
 * @param path - Path service instance
 * @param currentDir - Current directory (where the backend package.json is)
 * @returns Effect that resolves to the backend package name
 * @since 1.0.0
 * @internal
 */
const getBackendPackageName = (
  fs: FileSystem.FileSystem,
  path: Path.Path,
  currentDir: string
) =>
  Effect.gen(function* () {
    const packageJsonPath = path.join(currentDir, 'package.json')
    const exists = yield* fs.exists(packageJsonPath)

    if (exists) {
      const content = yield* fs.readFileString(packageJsonPath)
      const packageJson = JSON.parse(content)

      if (packageJson.name) {
        return packageJson.name
      }
    }

    // Fallback: use @monorepo/backend if package name not found
    return '@monorepo/backend'
  })

/**
 * Creates environment files for apps that reference the generated types.
 *
 * @param fs - FileSystem service instance
 * @param path - Path service instance
 * @param typesPath - Path to the generated types file
 * @returns Effect that completes when environment files are created
 * @since 1.0.0
 * @internal
 */
const createEnvironmentFiles = (
  fs: FileSystem.FileSystem,
  path: Path.Path,
  _typesPath: string
) =>
  Effect.gen(function* () {
    const monorepoRoot = yield* findMonorepoRoot(fs, path, process.cwd())
    const appDirs = ['apps/native', 'apps/web']

    for (const appDir of appDirs) {
      const appPath = path.join(monorepoRoot, appDir)
      const exists = yield* fs.exists(appPath)

      if (exists) {
        const envFilePath = path.join(appPath, 'confect-env.d.ts')
        const backendPackageName = yield* getBackendPackageName(fs, path, process.cwd())

        const content = `// Auto-generated by confect-generate - loads Confect error types automatically
// This file should be committed to version control for other developers and CI/CD
// Re-run 'confect-generate' if you modify your Convex functions with new error types
/// <reference types="${backendPackageName}/confect-types" />

export {}
`

        yield* fs.writeFileString(envFilePath, content)
        yield* Console.log(`✅ Environment file created: ${envFilePath}`)
      }
    }
  })
