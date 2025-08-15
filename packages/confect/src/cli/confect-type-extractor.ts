
import * as ts from 'typescript'
import * as fs from 'fs'
import * as path from 'path'
import { ParseResult } from './shared-types'


/**
 * Recursively scans convex/ folder and extracts Confect function information
 */
export class ConfectTypeExtractor {
  private convexDir: string
  private result: ParseResult = { functions: [], typeDefinitions: new Map() }

  constructor(convexDir: string) {
    this.convexDir = convexDir
  }

  /**
   * Main entry point
   */
  async extract(): Promise<ParseResult> {
    await this.scanDirectory(this.convexDir)
    await this.findUsedTypeDefinitions()
    return this.result
  }

  /**
   * Find definitions for types actually used in Confect functions
   */
  private async findUsedTypeDefinitions(): Promise<void> {
    const usedTypes = new Set<string>()
    for (const func of this.result.functions) {
      for (const errorType of func.errorTypes) {
        usedTypes.add(errorType)
      }
    }

    await this.scanDirectoryForTypes(this.convexDir, usedTypes)
  }

  /**
   * Scan directory for specific type definitions
   */
  private async scanDirectoryForTypes(dir: string, targetTypes: Set<string>): Promise<void> {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        if (entry.name === '_generated' || entry.name === 'node_modules') {
          continue
        }
        await this.scanDirectoryForTypes(fullPath, targetTypes)
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        await this.findTypeDefinitionsInFile(fullPath, targetTypes)
      }
    }
  }

  /**
   * Find specific type definitions in a file
   */
  private async findTypeDefinitionsInFile(filePath: string, targetTypes: Set<string>): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf-8')
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    )

    const relativePath = path.relative(this.convexDir, filePath)

    this.scanImportsForTypes(sourceFile, targetTypes)

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name && this.hasExportModifierGeneric(node)) {
        const className = node.name.text
        if (targetTypes.has(className)) {
          this.result.typeDefinitions.set(className, relativePath)
        }
      }

      if (ts.isTypeAliasDeclaration(node) && this.hasExportModifierGeneric(node)) {
        const typeName = node.name.text
        if (targetTypes.has(typeName)) {
          this.result.typeDefinitions.set(typeName, relativePath)
        }
      }

      if (ts.isInterfaceDeclaration(node) && this.hasExportModifierGeneric(node)) {
        const interfaceName = node.name.text
        if (targetTypes.has(interfaceName)) {
          this.result.typeDefinitions.set(interfaceName, relativePath)
        }
      }

      ts.forEachChild(node, visit)
    }

    visit(sourceFile)
  }

  /**
   * Scan imports in a file to find external types
   */
  private scanImportsForTypes(sourceFile: ts.SourceFile, targetTypes: Set<string>): void {
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const moduleName = node.moduleSpecifier.text

        // Verificar si es un import con named imports
        if (node.importClause && node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
          const namedImports = node.importClause.namedBindings

          for (const importSpecifier of namedImports.elements) {
            const importedName = importSpecifier.name.text

            if (targetTypes.has(importedName)) {

              this.result.typeDefinitions.set(importedName, `EXTERNAL:${moduleName}`)
            }
          }
        }
      }

      ts.forEachChild(node, visit)
    }

    visit(sourceFile)
  }

  /**
   * Recursively scan a directory
   */
  private async scanDirectory(dir: string): Promise<void> {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        if (entry.name === '_generated' || entry.name === 'node_modules') {
          continue
        }
        await this.scanDirectory(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        await this.parseFile(fullPath)
      }
    }
  }

  /**
   * Parse a TypeScript file and extract Confect functions
   */
  private async parseFile(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf-8')
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    )

    this.visitNode(sourceFile, filePath)
  }



  /**
   * Recursively visit AST nodes
   */
  private visitNode(node: ts.Node, filePath: string): void {
    if (ts.isVariableStatement(node) && this.hasExportModifier(node)) {
      this.processVariableStatement(node, filePath)
    }

    ts.forEachChild(node, (child) => this.visitNode(child, filePath))
  }

  /**
   * Generate module name and full key from file path
   */
  private generateModuleInfo(filePath: string, functionName: string): { moduleName: string, fullKey: string } {
    const relativePath = path.relative(this.convexDir, filePath)

    // Remove .ts extension and normalize path separators
    const modulePathWithoutExt = relativePath.replace(/\.ts$/, '').replace(/\\/g, '/')

    // Generate module name (e.g., "functions", "admin/functions", "user/auth")
    const moduleName = modulePathWithoutExt

    // Generate full key for namespacing (e.g., "functions.insertTodo", "admin/functions.insertTodo")
    const fullKey = `${moduleName}.${functionName}`

    return { moduleName, fullKey }
  }

  /**
   * Check if a node has export modifier
   */
  private hasExportModifier(node: ts.VariableStatement): boolean {
    return node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword) ?? false
  }

  /**
   * Check if a declaration node has export modifier
   */
  private hasExportModifierGeneric(node: ts.Node): boolean {
    return ('modifiers' in node &&
           Array.isArray(node.modifiers) &&
           node.modifiers?.some((mod: any) => mod.kind === ts.SyntaxKind.ExportKeyword)) ?? false
  }

  /**
   * Process an exported variable declaration
   */
  private processVariableStatement(node: ts.VariableStatement, filePath: string): void {
    for (const declaration of node.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer) {
        const functionName = declaration.name.text
        const confectInfo = this.extractConfectFunction(declaration.initializer)

        if (confectInfo) {
          const errorTypes = this.extractErrorTypes(confectInfo.errorSchema)
          const relativePath = path.relative(this.convexDir, filePath)
          const { moduleName, fullKey } = this.generateModuleInfo(filePath, functionName)

          this.result.functions.push({
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
   * Extract information from a Confect function
   */
  private extractConfectFunction(node: ts.Expression): { type: 'query' | 'mutation' | 'action', errorSchema: string | null, returnsSchema: string | null } | null {
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
      errorSchema = this.extractErrorSchema(errorsProperty.initializer)
    }

    let returnsSchema: string | null = null
    if (returnsProperty) {
      returnsSchema = this.extractErrorSchema(returnsProperty.initializer)
    }

    return { type, errorSchema, returnsSchema }
  }

  /**
   * Extract error schema as string
   */
  private extractErrorSchema(node: ts.Expression): string {
    const sourceFile = node.getSourceFile()
    return node.getText(sourceFile)
  }

  /**
   * Extract individual error types from a schema
   */
  private extractErrorTypes(schema: string | null): Set<string> {
    const types = new Set<string>()

    if (!schema) return types

    const unionMatch = schema.match(/Schema\.Union\((.*)\)/)
    if (unionMatch) {
      const unionContent = unionMatch[1]
      const parts = unionContent.split(',')
      for (const part of parts) {
        const trimmed = part.trim()
        const type = this.extractSingleType(trimmed)
        if (type) types.add(type)
      }
    } else {
      const type = this.extractSingleType(schema)
      if (type) types.add(type)
    }

    return types
  }

  /**
   * Extract a single type from an expression
   */
  private extractSingleType(expression: string): string | null {
    const trimmed = expression.trim()

    if (trimmed.includes('Schema.Number') ||
        trimmed.includes('Schema.String') ||
        trimmed.includes('Schema.Boolean')) {
      return null
    }

    const match = trimmed.match(/^([A-Z][a-zA-Z0-9_]*)/)
    return match ? match[1] : null
  }
}