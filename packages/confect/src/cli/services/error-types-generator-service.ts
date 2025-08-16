/**
 * @fileoverview Effect-native service for generating TypeScript error types from Confect functions.
 * 
 * This service provides Effect-based operations for generating TypeScript type definitions
 * that provide compile-time type safety for error handling in Confect applications.
 * 
 * @since 1.0.0
 */

import * as Effect from "effect/Effect"
import * as Console from "effect/Console"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import { ExtractedFunction } from '../shared-types'

/**
 * Effect-native service for generating TypeScript error type definitions.
 * 
 * This service handles the generation of TypeScript declaration files from
 * extracted Confect function metadata, using Effect-native FileSystem operations
 * for all file I/O operations.
 * 
 * @since 1.0.0
 * @example
 * ```typescript
 * const generator = yield* ErrorTypesGeneratorService
 * yield* generator.generate(functions, './types.d.ts', typeDefinitions, './convex')
 * ```
 */
export class ErrorTypesGeneratorService extends Effect.Service<ErrorTypesGeneratorService>()("ErrorTypesGeneratorService", {
  effect: Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const pathService = yield* Path.Path

    return {
      /**
       * Generates TypeScript error type definitions from Confect functions.
       * 
       * Creates a complete TypeScript declaration file with error types, module augmentation,
       * and helper types for all provided Confect functions.
       * 
       * @param functions - Array of extracted Confect functions
       * @param outputPath - Path where the generated types file will be written
       * @param typeDefinitions - Map of type names to their definitions
       * @param convexDir - Root Convex directory path
       * @returns Effect that completes when type generation is done
       * @since 1.0.0
       */
      generate: (
        functions: ExtractedFunction[], 
        outputPath: string, 
        typeDefinitions: Map<string, string>, 
        convexDir: string
      ) =>
        Effect.gen(function* () {
          const monorepoRoot = yield* findMonorepoRoot(fileSystem, pathService, process.cwd())
          const content = yield* generateTypeDefinitions(functions, typeDefinitions, fileSystem, pathService, monorepoRoot, convexDir)

          // Ensure output path ends with .d.ts
          let finalOutputPath = outputPath
          if (!finalOutputPath.endsWith('.d.ts')) {
            finalOutputPath = finalOutputPath.replace(/\.ts$/, '.d.ts')
            if (!finalOutputPath.endsWith('.d.ts')) {
              finalOutputPath += '.d.ts'
            }
          }

          // Ensure output directory exists
          const dir = pathService.dirname(finalOutputPath)
          yield* fileSystem.makeDirectory(dir, { recursive: true })

          // Write the generated content
          yield* fileSystem.writeFileString(finalOutputPath, content)
          yield* Console.log(`✅ Types generated: ${finalOutputPath}`)

          // Update supporting files
          yield* updateGitignore(fileSystem, pathService)
          yield* updatePackageJsonExport(fileSystem, pathService, finalOutputPath)
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
 * Generates the complete TypeScript type definitions file content.
 *
 * @param functions - Array of extracted Confect functions
 * @param typeDefinitions - Map of type names to their definitions
 * @param fileSystem - FileSystem service instance
 * @param pathService - Path service instance
 * @param monorepoRoot - Root directory of the monorepo
 * @returns Effect that resolves to the complete TypeScript definition content
 * @since 1.0.0
 * @internal
 */
const generateTypeDefinitions = (
  functions: ExtractedFunction[],
  _typeDefinitions: Map<string, string>,
  fileSystem: FileSystem.FileSystem,
  pathService: Path.Path,
  monorepoRoot: string,
  convexDir: string
) =>
  Effect.gen(function* () {
    const confectPackageName = yield* getConfectPackageName(fileSystem, pathService, monorepoRoot)

    const header = `// Auto-generated by Confect Error Types Generator
// Do not edit this file manually
// This file should be committed to version control for other developers and CI/CD
// This file is automatically loaded when you import ${confectPackageName}/react/effect

`

    const imports = yield* generateImports(functions, fileSystem, pathService, convexDir)
    const moduleAugmentation = generateModuleAugmentation(functions, confectPackageName)
    const helperTypes = generateHelperTypes(functions)
    const globalDeclaration = generateGlobalDeclaration(functions)

    return header + imports + moduleAugmentation + '\n' + helperTypes + '\n' + globalDeclaration
  })

/**
 * Detects the Confect package name from the project's package.json dependencies.
 *
 * @param fs - FileSystem service instance
 * @param path - Path service instance
 * @param monorepoRoot - Root directory of the monorepo
 * @returns Effect that resolves to the Confect package name
 * @since 1.0.0
 * @internal
 */
const getConfectPackageName = (
  fs: FileSystem.FileSystem,
  path: Path.Path,
  monorepoRoot: string
) =>
  Effect.gen(function* () {
    // Check multiple possible locations for package.json
    const possiblePaths = [
      path.join(monorepoRoot, 'package.json'),
      path.join(process.cwd(), 'package.json'),
      path.join(monorepoRoot, 'apps/web/package.json'),
      path.join(monorepoRoot, 'apps/native/package.json')
    ]

    for (const packageJsonPath of possiblePaths) {
      const exists = yield* fs.exists(packageJsonPath)

      if (exists) {
        const content = yield* fs.readFileString(packageJsonPath)
        const packageJson = JSON.parse(content)

        // Check dependencies and devDependencies for confect package
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        }

        // Look for packages that contain 'confect' in the name
        const confectPackage = Object.keys(allDeps).find(pkg =>
          pkg.includes('confect') || pkg.endsWith('/confect')
        )

        if (confectPackage) {
          return confectPackage
        }
      }
    }

    // Fallback: use @monorepo/confect if not found
    return '@monorepo/confect'
  })

/**
 * Detects where type definitions are located in the file system.
 *
 * @param usedTypes - Set of type names to find
 * @param fs - FileSystem service instance
 * @param path - Path service instance
 * @param convexDir - Convex directory path
 * @returns Effect that resolves to a Map of type names to their import paths
 * @since 1.0.0
 * @internal
 */
const detectTypeDefinitionPaths = (
  usedTypes: Set<string>,
  fs: FileSystem.FileSystem,
  path: Path.Path,
  convexDir: string
) =>
  Effect.gen(function* () {
    const typeDefinitionPaths = new Map<string, string>()

    const searchPatterns = [
      'functions.js',
      'functions.ts',
      'functions.schemas.js',
      'functions.schemas.ts',
      'schemas.js',
      'schemas.ts',
      'types.js',
      'types.ts'
    ]

    for (const pattern of searchPatterns) {
      const filePath = path.join(convexDir, pattern)
      const exists = yield* fs.exists(filePath)

      if (exists) {
        const content = yield* fs.readFileString(filePath)

        for (const typeName of usedTypes) {
          if (!typeDefinitionPaths.has(typeName)) {
            const exportPatterns = [
              new RegExp(`export\\s+class\\s+${typeName}\\b`),
              new RegExp(`export\\s+interface\\s+${typeName}\\b`),
              new RegExp(`export\\s+type\\s+${typeName}\\b`),
              new RegExp(`export\\s*{[^}]*\\b${typeName}\\b[^}]*}`),
            ]

            let found = false
            for (const pattern of exportPatterns) {
              if (pattern.test(content)) {
                found = true
                break
              }
            }

            if (found) {
              const relativePath = `./convex/${pattern.replace(/\.(js|ts)$/, '')}`
              typeDefinitionPaths.set(typeName, relativePath)
            }
          }
        }
      }
    }

    for (const typeName of usedTypes) {
      if (!typeDefinitionPaths.has(typeName)) {
        typeDefinitionPaths.set(typeName, './convex/functions.schemas')
      }
    }

    return typeDefinitionPaths
  })

/**
 * Generates import statements for the type definitions.
 *
 * @param functions - Array of extracted Confect functions
 * @param fileSystem - FileSystem service instance
 * @param pathService - Path service instance
 * @param convexDir - Convex directory path
 * @returns Effect that resolves to import statements string
 * @since 1.0.0
 * @internal
 */
const generateImports = (
  functions: ExtractedFunction[],
  fileSystem: FileSystem.FileSystem,
  pathService: Path.Path,
  convexDir: string
) =>
  Effect.gen(function* () {
    const usedTypes = getUsedTypes(functions)

    if (usedTypes.size === 0) {
      return ''
    }

    // Detect where each type is defined
    const typeDefinitionPaths = yield* detectTypeDefinitionPaths(
      usedTypes,
      fileSystem,
      pathService,
      convexDir
    )

    // Group types by their source file
    const importsByFile = new Map<string, Set<string>>()

    for (const [typeName, filePath] of typeDefinitionPaths) {
      if (!importsByFile.has(filePath)) {
        importsByFile.set(filePath, new Set())
      }
      importsByFile.get(filePath)!.add(typeName)
    }

    // Generate import statements
    const imports = Array.from(importsByFile.entries())
      .map(([filePath, types]) => {
        const typesList = Array.from(types).sort().join(', ')
        return `import type { ${typesList} } from '${filePath}'`
      })
      .join('\n')

    return imports ? imports + '\n\n' : ''
  })

/**
 * Gets all error types that are actually used in the functions.
 * 
 * @param functions - Array of extracted Confect functions
 * @returns Set of used type names
 * @since 1.0.0
 * @internal
 */
const getUsedTypes = (functions: ExtractedFunction[]): Set<string> => {
  const usedTypes = new Set<string>()
  
  for (const func of functions) {
    if (func.errorTypes) {
      for (const errorType of func.errorTypes) {
        usedTypes.add(errorType)
      }
    }
  }
  
  return usedTypes
}

/**
 * Generates module augmentation for confect/react and effect-atom.
 *
 * @param functions - Array of extracted Confect functions
 * @param confectPackageName - Name of the Confect package (e.g., '@monorepo/confect', 'confect')
 * @returns Module augmentation string
 * @since 1.0.0
 * @internal
 */
const generateModuleAugmentation = (functions: ExtractedFunction[], confectPackageName: string): string => {
  if (functions.length === 0) {
    return `// Module augmentation for main react module
declare module '${confectPackageName}/react' {
  interface ConfectErrorTypes {}
}

// Module augmentation for effect-atom module
declare module '${confectPackageName}/react/effect-atom' {
  interface ConfectErrorTypes {}
}`
  }

  const errorMappings = functions
    .filter(func => func.errorTypes && func.errorTypes.size > 0)
    .map(func => {
      const errorUnion = Array.from(func.errorTypes).join(' | ')
      return `    "${func.fullKey}": ${errorUnion}`
    })
    .join('\n')

  return `// Module augmentation for main react module
declare module '${confectPackageName}/react' {
  interface ConfectErrorTypes {
${errorMappings}
  }
}

// Module augmentation for effect-atom module
declare module '${confectPackageName}/react/effect-atom' {
  interface ConfectErrorTypes {
${errorMappings}
  }
}`
}

/**
 * Generates helper types for individual functions.
 *
 * @param functions - Array of extracted Confect functions
 * @returns Helper types string
 * @since 1.0.0
 * @internal
 */
const generateHelperTypes = (functions: ExtractedFunction[]): string => {
  if (functions.length === 0) {
    return ''
  }

  const helperTypes = functions
    .filter(func => func.errorTypes && func.errorTypes.size > 0)
    .map(func => {
      const errorUnion = Array.from(func.errorTypes).join(' | ')
      const typeName = func.fullKey
        .split('.')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('') + 'Errors'
      return `export type ${typeName} = ${errorUnion}`
    })
    .join('\n')

  return `// biome-ignore lint/complexity/noUselessEmptyExport: <auto-generated>
export {}

// Helper types for individual functions
${helperTypes}`
}

/**
 * Generates global type declarations for auto-loading.
 *
 * @param functions - Array of extracted Confect functions
 * @returns Global declarations string
 * @since 1.0.0
 * @internal
 */
const generateGlobalDeclaration = (_functions: ExtractedFunction[]): string => {
  return `
// Auto-load this module when @monorepo/confect/react/effect is imported
declare global {
  namespace ConfectTypes {
    interface ErrorTypesLoaded {
      [key: string]: any
    }
  }
}

// This ensures the module is loaded when any part of confect is imported
export {}
`
}

/**
 * Updates .gitignore to ignore generated files.
 *
 * @param fileSystem - FileSystem service instance
 * @param pathService - Path service instance
 * @returns Effect that completes when .gitignore is updated
 * @since 1.0.0
 * @internal
 */
const updateGitignore = (fileSystem: FileSystem.FileSystem, pathService: Path.Path) =>
  Effect.gen(function* () {
    const gitignorePath = pathService.join(process.cwd(), '.gitignore')
    const ignoreEntry = '_generated-types/'

    const exists = yield* fileSystem.exists(gitignorePath)
    let gitignoreContent = ''

    if (exists) {
      gitignoreContent = yield* fileSystem.readFileString(gitignorePath)
    }

    const lines = gitignoreContent.split('\n')
    const alreadyIgnored = lines.some(line => line.trim() === ignoreEntry.trim())

    if (!alreadyIgnored) {
      if (gitignoreContent && !gitignoreContent.endsWith('\n')) {
        gitignoreContent += '\n'
      }
      gitignoreContent += `\n# Confect generated types\n${ignoreEntry}\n`
      yield* fileSystem.writeFileString(gitignorePath, gitignoreContent)
    }
  })



/**
 * Updates package.json exports to include generated types.
 *
 * @param fileSystem - FileSystem service instance
 * @param pathService - Path service instance
 * @param outputPath - Path to the generated types file
 * @returns Effect that completes when package.json is updated
 * @since 1.0.0
 * @internal
 */
const updatePackageJsonExport = (
  fileSystem: FileSystem.FileSystem,
  pathService: Path.Path,
  outputPath: string
) =>
  Effect.gen(function* () {
    const packageJsonPath = pathService.join(process.cwd(), 'package.json')
    const exists = yield* fileSystem.exists(packageJsonPath)

    if (!exists) {
      return
    }

    const packageJsonContent = yield* fileSystem.readFileString(packageJsonPath)
    const packageJson = JSON.parse(packageJsonContent)

    if (!packageJson.exports) {
      packageJson.exports = {}
    }

    const relativePath = pathService.relative(process.cwd(), outputPath)
    packageJson.exports['./confect-types'] = `./${relativePath}`

    const updatedContent = JSON.stringify(packageJson, null, 2) + '\n'
    yield* fileSystem.writeFileString(packageJsonPath, updatedContent)
  })
