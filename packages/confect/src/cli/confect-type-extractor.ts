
import * as ts from 'typescript'
import * as Effect from "effect/Effect"
import * as Console from "effect/Console"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import { ParseResult } from './shared-types'

/**
 * Confect Type Extractor Service using Effect.Service
 */
export class ConfectTypeExtractor extends Effect.Service<ConfectTypeExtractor>()("ConfectTypeExtractor", {
    
    effect: Effect.gen(function* () {

        const fileSystem = yield* FileSystem.FileSystem
        const pathService = yield* Path.Path
    return {
      extract: (convexDir: string) =>
        Effect.gen(function* () {
          yield* Console.log('🔍 Extracting types from Confex functions...')

          const result: ParseResult = { functions: [], typeDefinitions: new Map() }

        //   // Scan directory recursively
        // yield* scanDirectoryEffect(convexDir, convexDir, result)

            const entries = yield* fileSystem.readDirectory(convexDir)

            for (const entryName of entries) {
            const fullPath = pathService.join(convexDir, entryName)
            const stat = yield* fileSystem.stat(fullPath)

            if (stat.type === "Directory") {
                if (entryName === '_generated' || entryName === 'node_modules') {
                continue
                }
                yield* scanDirectoryEffect(fullPath, convexDir, result)
            } else if (stat.type === "File" && entryName.endsWith('.ts')) {
                yield* parseFileEffect(fullPath, convexDir, result)
            }
            }

        //   // Find used type definitions
         yield* findUsedTypeDefinitionsEffect(convexDir, result, fileSystem)

        //   yield* Console.log(`📊 Found ${result.functions.length} Confect functions`)
          return result
        })
    }
  })
}) {}

/**
 * Scan directory recursively using Effect-native FileSystem
 */
const scanDirectoryEffect = (
  dir: string,
  convexDir: string,
  result: ParseResult
) =>
  Effect.gen(function* () {
  })

/**
 * Parse a TypeScript file using Effect-native FileSystem
 */
const parseFileEffect = (
  filePath: string,
  convexDir: string,
  result: ParseResult
) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const pathService = yield* Path.Path
    const content = yield* fileSystem.readFileString(filePath)
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    )

    // Parse the file and extract Confect functions
    const relativePath = pathService.relative(convexDir, filePath)
    visitNode(sourceFile, filePath, convexDir, result, relativePath)
  })

/**
 * Find used type definitions (simplified version for now)
 */
const findUsedTypeDefinitionsEffect = (
  convexDir: string,
  _result: ParseResult,
  _fileSystem: FileSystem.FileSystem,
) =>
  Effect.gen(function* () {
    // For now, use a simplified approach
    // TODO: Implement full Effect-native type definition scanning
    yield* Effect.sync(() => {
      // This is a placeholder - in a full implementation, we would
      // scan all files to find type definitions for the used types
      console.log(`Scanning for type definitions in ${convexDir}`)
    })
  })



/**
 * Visit AST nodes to find Confect functions
 */
const visitNode = (
  node: ts.Node,
  filePath: string,
  convexDir: string,
  result: ParseResult,
  relativePath: string
) => {
    /**
     * Check if a node has export modifier
     */
    const hasExportModifier = (node: ts.VariableStatement): boolean => {
        return node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword) ?? false
    }



    if (ts.isVariableStatement(node) && hasExportModifier(node)) {
        processVariableStatement(node, filePath, convexDir, result, relativePath)
    }

    // Recursively visit children using Effect
    let children: ts.Node[] = []

    if (ts.isSourceFile(node)) {
        // For SourceFile, use statements directly
        children = Array.from(node.statements)
    } else {
        // For other nodes, use forEachChild
        ts.forEachChild(node, (child) => children.push(child))
    }

    for (const child of children) {
        visitNode(child, filePath, convexDir, result, relativePath)
    }
}


/**
 * Process an exported variable declaration
 */
const processVariableStatement = (
  node: ts.VariableStatement,
  filePath: string,
  convexDir: string,
  result: ParseResult,
  relativePath: string
) => {
  for (const declaration of node.declarationList.declarations) {
    if (ts.isIdentifier(declaration.name) && declaration.initializer) {
      const functionName = declaration.name.text
      const confectInfo = extractConfectFunction(declaration.initializer)

      if (confectInfo) {
        const errorTypes = extractErrorTypes(confectInfo.errorSchema)
        const { moduleName, fullKey } = generateModuleInfo(filePath, functionName, convexDir, relativePath)

        result.functions.push({
          name: functionName,
          type: confectInfo.type,
          errorSchema: confectInfo.errorSchema,
          returnsSchema: confectInfo.returnsSchema,
          filePath: relativePath,
          moduleName,
          fullKey,
          errorTypes
        })
      }
    }
  }
}

/**
 * Generate module name and full key from file path
 */
const generateModuleInfo = (filePath: string, functionName: string, convexDir: string, relativePath: string
) => {
    const modulePathWithoutExt = relativePath.replace(/\.ts$/, '').replace(/\\/g, '/')
    const moduleName = modulePathWithoutExt
    const fullKey = `${moduleName}.${functionName}`

    return { moduleName, fullKey }
}

/**
 * Extract information from a Confect function
 */
const extractConfectFunction = (node: ts.Expression): {
  type: 'query' | 'mutation' | 'action',
  errorSchema: string | null,
  returnsSchema: string | null
} | null => {
  if (!ts.isCallExpression(node)) return null

  const expression = node.expression
  if (!ts.isIdentifier(expression)) return null

  let type: 'query' | 'mutation' | 'action' | null = null
  if (expression.text === 'confectQuery') type = 'query'
  else if (expression.text === 'confectMutation') type = 'mutation'
  else if (expression.text === 'confectAction') type = 'action'

  if (!type) return null

  const configArg = node.arguments[0]
  if (!ts.isObjectLiteralExpression(configArg)) return null

  const errorsProperty = configArg.properties.find(prop =>
    ts.isPropertyAssignment(prop) &&
    ts.isIdentifier(prop.name) &&
    prop.name.text === 'errors'
  ) as ts.PropertyAssignment | undefined

  const returnsProperty = configArg.properties.find(prop =>
    ts.isPropertyAssignment(prop) &&
    ts.isIdentifier(prop.name) &&
    prop.name.text === 'returns'
  ) as ts.PropertyAssignment | undefined

  let errorSchema: string | null = null
  if (errorsProperty) {
    errorSchema = extractErrorSchema(errorsProperty.initializer)
  }

  let returnsSchema: string | null = null
  if (returnsProperty) {
    returnsSchema = extractErrorSchema(returnsProperty.initializer)
  }

  return { type, errorSchema, returnsSchema }
}

/**
 * Extract error schema as string
 */
const extractErrorSchema = (node: ts.Expression): string => {
  const sourceFile = node.getSourceFile()
  return node.getText(sourceFile)
}

/**
 * Extract individual error types from a schema
 */
const extractErrorTypes = (schema: string | null): Set<string> => {
  const types = new Set<string>()

  if (!schema) return types

  const unionMatch = schema.match(/Schema\.Union\((.*)\)/)
  if (unionMatch) {
    const unionContent = unionMatch[1]
    const parts = unionContent.split(',')
    for (const part of parts) {
      const trimmed = part.trim()
      const type = extractSingleType(trimmed)
      if (type) types.add(type)
    }
  } else {
    const type = extractSingleType(schema)
    if (type) types.add(type)
  }

  return types
}

/**
 * Extract a single type from an expression
 */
const extractSingleType = (expression: string): string | null => {
  const trimmed = expression.trim()

  if (trimmed.includes('Schema.Number') ||
      trimmed.includes('Schema.String') ||
      trimmed.includes('Schema.Boolean')) {
    return null
  }

  const match = trimmed.match(/^([A-Z][a-zA-Z0-9_]*)/)
  return match ? match[1] : null
}