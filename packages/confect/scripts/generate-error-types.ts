#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import * as ts from 'typescript'

interface ExtractedFunction {
  name: string
  type: 'query' | 'mutation' | 'action'
  errorSchema: string | null
  returnsSchema: string | null
  filePath: string
  errorTypes: Set<string>
}

interface ParseResult {
  functions: ExtractedFunction[]
  typeDefinitions: Map<string, string>
}

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

          this.result.functions.push({
            name: functionName,
            type: confectInfo.type,
            errorSchema: confectInfo.errorSchema,
            returnsSchema: confectInfo.returnsSchema,
            filePath: relativePath,
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

/**
 * Generate error types file
 */
export class ErrorTypesGenerator {
  private functions: ExtractedFunction[]
  private outputPath: string
  private typeDefinitions: Map<string, string>
  private convexDir: string

  constructor(functions: ExtractedFunction[], outputPath: string, typeDefinitions: Map<string, string>, convexDir: string) {
    this.functions = functions
    this.outputPath = outputPath
    this.typeDefinitions = typeDefinitions
    this.convexDir = convexDir
  }

  /**
   * Generate types file
   */
  generate(): void {
    const content = this.generateTypeDefinitions()

    let finalOutputPath = this.outputPath
    if (!finalOutputPath.endsWith('.d.ts')) {
      finalOutputPath = finalOutputPath.replace(/\.ts$/, '.d.ts')
      if (!finalOutputPath.endsWith('.d.ts')) {
        finalOutputPath += '.d.ts'
      }
    }

    const dir = path.dirname(finalOutputPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(finalOutputPath, content, 'utf-8')
    console.log(`✅ Types generated: ${finalOutputPath}`)

    this.updateGitignore()
    this.createAutoImportFile()
    this.updatePackageJsonExport(finalOutputPath)
  }

  /**
   * Update .gitignore to ignore generated files
   */
  private updateGitignore(): void {
    const gitignorePath = path.join(process.cwd(), '.gitignore')
    const ignoreEntry = '_generated-types/'

    try {
      let gitignoreContent = ''

      if (fs.existsSync(gitignorePath)) {
        gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8')
      }

      const lines = gitignoreContent.split('\n')
      const alreadyIgnored = lines.some(line =>
        line.trim() === ignoreEntry.trim()
      )

      if (!alreadyIgnored) {
        if (gitignoreContent && !gitignoreContent.endsWith('\n')) {
          gitignoreContent += '\n'
        }
        gitignoreContent += `${ignoreEntry}\n`

        fs.writeFileSync(gitignorePath, gitignoreContent, 'utf-8')
        console.log(`✅ Added ${ignoreEntry} to .gitignore`)
      }

    } catch (error) {
      console.log(`⚠️  Could not update .gitignore: ${error}`)
    }
  }

  /**
   * Create type reference files in frontend projects
   */
  private createAutoImportFile(): void {
    const frontendProjects = this.findFrontendProjects()

    if (frontendProjects.length === 0) {
      return
    }

    const typeReference = this.detectTypeReference()

    for (const projectPath of frontendProjects) {
      this.createTypeReferenceFile(projectPath, typeReference)
    }
  }

  /**
   * Find frontend projects that use confect
   */
  private findFrontendProjects(): string[] {
    const projects: string[] = []
    const monorepoRoot = this.findMonorepoRoot()

    if (!monorepoRoot) {
      const currentProject = this.findProjectRoot()
      if (currentProject && this.projectUsesConfect(currentProject)) {
        projects.push(currentProject)
      }
      return projects
    }

    const appsDir = path.join(monorepoRoot, 'apps')
    if (fs.existsSync(appsDir)) {
      const appDirs = fs.readdirSync(appsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => path.join(appsDir, dirent.name))

      for (const appDir of appDirs) {
        if (this.projectUsesConfect(appDir)) {
          projects.push(appDir)
        }
      }
    }

    return projects
  }

  /**
   * Check if a project uses confect and is NOT the backend
   */
  private projectUsesConfect(projectPath: string): boolean {
    const packageJsonPath = path.join(projectPath, 'package.json')

    if (!fs.existsSync(packageJsonPath)) {
      return false
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

      // Exclude backend project (which generates the types)
      if (packageJson.name === '@monorepo/backend' ||
          fs.existsSync(path.join(projectPath, 'convex'))) {
        return false
      }

      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      }

      return '@monorepo/confect' in dependencies || 'confect' in dependencies
    } catch {
      return false
    }
  }

  /**
   * Detect the correct type reference based on context
   */
  private detectTypeReference(): string {
    const backendPackageName = this.getBackendPackageName()

    if (backendPackageName) {
      return `${backendPackageName}/confect-types`
    }

    return './confect-types'
  }

  /**
   * Get backend package name from its package.json
   */
  private getBackendPackageName(): string | null {
    const currentDir = process.cwd()
    const packageJsonPath = path.join(currentDir, 'package.json')

    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
        return packageJson.name || null
      } catch {
        return null
      }
    }

    const monorepoRoot = this.findMonorepoRoot()
    if (monorepoRoot) {
      const backendPath = path.join(monorepoRoot, 'apps/backend/package.json')
      if (fs.existsSync(backendPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(backendPath, 'utf-8'))
          return packageJson.name || null
        } catch {
          return null
        }
      }
    }

    return null
  }

  /**
   * Create type reference file in a project
   */
  private createTypeReferenceFile(projectPath: string, typeReference: string): void {
    const typeReferenceContent = `// Auto-generated by confect-generate - loads Confect error types automatically
// This file should be committed to version control for other developers and CI/CD
// Re-run 'confect-generate' if you modify your Convex functions with new error types
/// <reference types="${typeReference}" />

export {}
`

    // Always create in project root
    const typeReferencePath = path.join(projectPath, 'confect-env.d.ts')

    try {
      fs.writeFileSync(typeReferencePath, typeReferenceContent, 'utf-8')
      console.log(`✅ Environment file created: ${typeReferencePath}`)
    } catch (error) {
      console.log(`⚠️  Could not create environment file in ${projectPath}: ${error}`)
    }
  }

  /**
   * Find monorepo root
   */
  private findMonorepoRoot(): string | null {
    let currentDir = process.cwd()

    while (currentDir !== path.dirname(currentDir)) {
      const indicators = ['pnpm-workspace.yaml', 'lerna.json', 'nx.json']
      for (const indicator of indicators) {
        if (fs.existsSync(path.join(currentDir, indicator))) {
          return currentDir
        }
      }
      currentDir = path.dirname(currentDir)
    }

    return null
  }



  /**
   * Encuentra la raíz del proyecto (donde está el tsconfig.json)
   */
  private findProjectRoot(): string | null {
    let currentDir = process.cwd()

    while (currentDir !== path.dirname(currentDir)) {
      const tsconfigPath = path.join(currentDir, 'tsconfig.json')
      if (fs.existsSync(tsconfigPath)) {
        return currentDir
      }
      currentDir = path.dirname(currentDir)
    }

    return null
  }

  /**
   * Update package.json to add error types export
   */
  private updatePackageJsonExport(typesFilePath: string): void {
    const packageJsonPath = this.findPackageJson()

    if (!packageJsonPath) {
      return
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      const relativePath = './' + path.relative(path.dirname(packageJsonPath), typesFilePath)

      if (!packageJson.exports) {
        packageJson.exports = {}
      }

      const exportKey = './confect-types'
      if (packageJson.exports[exportKey] === relativePath) {
        return
      }

      packageJson.exports[exportKey] = relativePath
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8')
      console.log(`✅ Export added to package.json: "${exportKey}": "${relativePath}"`)

    } catch (error) {
      console.error('❌ Error updating package.json:', error)
    }
  }

  /**
   * Find nearest package.json
   */
  private findPackageJson(): string | null {
    let currentDir = process.cwd()

    while (currentDir !== path.dirname(currentDir)) {
      const packageJsonPath = path.join(currentDir, 'package.json')
      if (fs.existsSync(packageJsonPath)) {
        return packageJsonPath
      }
      currentDir = path.dirname(currentDir)
    }

    return null
  }



  /**
   * Generate type definitions file content
   */
  private generateTypeDefinitions(): string {
    const header = `// Auto-generated by Confect Error Types Generator
// Do not edit this file manually
// This file should be committed to version control for other developers and CI/CD
// This file is automatically loaded when you import @monorepo/confect/react/effect

`

    const imports = this.generateImports()
    const moduleAugmentation = this.generateModuleAugmentation()
    const helperTypes = this.generateHelperTypes()
    const globalDeclaration = this.generateGlobalDeclaration()

    return header + imports + moduleAugmentation + '\n' + helperTypes + '\n' + globalDeclaration
  }

  /**
   * Generate necessary imports
   */
  private generateImports(): string {
    const localImports = new Map<string, Set<string>>()
    const externalImports = new Map<string, Set<string>>()

    for (const func of this.functions) {
      // Process error types
      for (const errorType of func.errorTypes) {
        const definitionFile = this.typeDefinitions.get(errorType)
        if (definitionFile) {
          if (definitionFile.startsWith('EXTERNAL:')) {
            const moduleName = definitionFile.replace('EXTERNAL:', '')
            if (!externalImports.has(moduleName)) {
              externalImports.set(moduleName, new Set())
            }
            externalImports.get(moduleName)!.add(errorType)
          } else {
            if (!localImports.has(definitionFile)) {
              localImports.set(definitionFile, new Set())
            }
            localImports.get(definitionFile)!.add(errorType)
          }
        }
      }

      // Process return types
      if (func.returnsSchema) {
        // This will register the types in typeDefinitions
        this.convertSchemaToType(func.returnsSchema)
      }
    }

    // Now collect all registered types for imports
    for (const [typeName, definitionFile] of this.typeDefinitions) {
      if (definitionFile.startsWith('EXTERNAL:')) {
        const moduleName = definitionFile.replace('EXTERNAL:', '')
        if (!externalImports.has(moduleName)) {
          externalImports.set(moduleName, new Set())
        }
        externalImports.get(moduleName)!.add(typeName)
      } else {
        if (!localImports.has(definitionFile)) {
          localImports.set(definitionFile, new Set())
        }
        localImports.get(definitionFile)!.add(typeName)
      }
    }

    let content = ''

    for (const [moduleName, types] of externalImports) {
      if (types.size > 0) {
        const typesArray = Array.from(types).sort()
        content += `import type { ${typesArray.join(', ')} } from '${moduleName}'\n`
      }
    }

    for (const [filePath, types] of localImports) {
      if (types.size > 0) {
        const typesArray = Array.from(types).sort()
        const importPath = this.getImportPath(filePath, this.convexDir)
        content += `import type { ${typesArray.join(', ')} } from '${importPath}'\n`
      }
    }

    return content ? content + '\n' : ''
  }

  /**
   * Convert file path to import path
   */
  private getImportPath(filePath: string, convexDir: string): string {
    // Determine if output file is in a convex/ subfolder
    const outputDir = path.dirname(this.outputPath)
    const convexDirAbsolute = path.resolve(convexDir)
    const outputDirAbsolute = path.resolve(outputDir)

    const targetFile = filePath.replace(/\.ts$/, '.js')
    let importPath: string

    if (outputDirAbsolute.startsWith(convexDirAbsolute)) {
      const relativePath = path.relative(outputDirAbsolute, path.join(convexDirAbsolute, targetFile))
      importPath = './' + relativePath.replace(/\\/g, '/')
    } else {
      importPath = `./convex/${targetFile}`
    }



    return importPath
  }

  /**
   * Generate module augmentation for Confect
   */
  private generateModuleAugmentation(): string {
    let content = `declare module '@monorepo/confect/react/effect' {\n`
    content += `  interface ConfectErrorTypes {\n`

    for (const func of this.functions) {
      if (func.errorSchema) {
        const typeDefinition = this.convertSchemaToType(func.errorSchema)
        content += `    ${func.name}: ${typeDefinition}\n`
      }
    }

    content += `  }\n`
    content += `\n`
    content += `  interface ConfectReturnTypes {\n`

    for (const func of this.functions) {
      if (func.returnsSchema) {
        const typeDefinition = this.convertSchemaToType(func.returnsSchema)
        content += `    ${func.name}: ${typeDefinition}\n`
      }
    }

    content += `  }\n`
    content += `}\n`
    content += `\n`
    content += `// biome-ignore lint/complexity/noUselessEmptyExport: <auto-generated>\n`
    content += `export {}\n`
    return content
  }

  /**
   * Generate helper types for each function
   */
  private generateHelperTypes(): string {
    let content = '// Helper types for individual functions\n'

    for (const func of this.functions) {
      if (func.errorSchema) {
        const typeDefinition = this.convertSchemaToType(func.errorSchema)
        const typeName = this.capitalize(func.name) + 'Errors'
        content += `export type ${typeName} = ${typeDefinition}\n`
      }
    }

    return content
  }

  /**
   * Generate global declaration for auto-loading
   */
  private generateGlobalDeclaration(): string {
    return `// Auto-load this module when @monorepo/confect/react/effect is imported
declare global {
  namespace ConfectTypes {
    interface ErrorTypesLoaded {
      [key: string]: any
    }
  }
}

// This ensures the module is loaded when any part of confect is imported
export {}`
  }

  /**
   * Resolve schema type by analyzing imports and schema definitions
   */
  private resolveSchemaType(schemaName: string): string | null {
    // Find which file imports this schema
    const importInfo = this.findSchemaImport(schemaName)
    if (!importInfo) {
      return null
    }

    // Analyze the schema file to extract the actual type definition
    const typeDefinition = this.extractSchemaDefinition(importInfo.filePath, schemaName)
    return typeDefinition
  }

  /**
   * Find where a schema type is imported from
   */
  private findSchemaImport(schemaName: string): { filePath: string; importPath: string } | null {
    for (const func of this.functions) {
      const functionFile = path.join(this.convexDir, func.filePath)

      try {
        const content = fs.readFileSync(functionFile, 'utf-8')

        // Look for import statements that include this schema
        const importRegex = new RegExp(`import\\s*{[^}]*\\b${schemaName}\\b[^}]*}\\s*from\\s*['"]([^'"]+)['"]`, 'g')
        const match = importRegex.exec(content)

        if (match) {
          const importPath = match[1]
          // Resolve relative import path
          const resolvedPath = this.resolveImportPath(functionFile, importPath)
          return { filePath: resolvedPath, importPath }
        }
      } catch (error) {
        // Continue searching in other files
      }
    }

    return null
  }

  /**
   * Resolve relative import path to absolute file path
   */
  private resolveImportPath(fromFile: string, importPath: string): string {
    const fromDir = path.dirname(fromFile)

    if (importPath.startsWith('.')) {
      // Relative import
      const resolved = path.resolve(fromDir, importPath)
      // Try .ts extension if file doesn't exist
      if (fs.existsSync(resolved + '.ts')) {
        return resolved + '.ts'
      }
      return resolved
    } else {
      // Absolute import - assume it's in the same directory for now
      return path.join(fromDir, importPath + '.ts')
    }
  }

  /**
   * Extract schema definition from TypeScript file
   */
  private extractSchemaDefinition(filePath: string, schemaName: string): string | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')

      // Parse TypeScript to find the schema definition
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      )

      // Find the export that matches our schema name
      const definition = this.findSchemaDefinitionInAST(sourceFile, schemaName)
      return definition
    } catch (error) {
      console.warn(`Could not analyze schema file ${filePath}: ${error}`)
      return null
    }
  }

  /**
   * Find schema definition in TypeScript AST
   */
  private findSchemaDefinitionInAST(sourceFile: ts.SourceFile, schemaName: string): string | null {
    let result: string | null = null

    const visit = (node: ts.Node) => {
      // Look for variable declarations like: export const InsertTodosResult = Schema.String
      if (ts.isVariableStatement(node)) {
        const declaration = node.declarationList.declarations[0]
        if (declaration && ts.isIdentifier(declaration.name) && declaration.name.text === schemaName) {
          if (declaration.initializer) {
            result = this.convertSchemaExpressionToType(declaration.initializer)
            return
          }
        }
      }

      ts.forEachChild(node, visit)
    }

    visit(sourceFile)
    return result
  }

  /**
   * Convert Schema expression to TypeScript type
   */
  private convertSchemaExpressionToType(expression: ts.Expression): string {
    const text = expression.getText()

    // Handle common Schema patterns
    if (text.includes('Schema.String')) return 'string'
    if (text.includes('Schema.Number')) return 'number'
    if (text.includes('Schema.Boolean')) return 'boolean'
    if (text.includes('Schema.Null')) return 'null'
    if (text.includes('Schema.Void')) return 'void'
    // Handle Id function calls - convert to generic type
    if (text.includes('Id(')) {
      const match = text.match(/Id\(['"]([^'"]+)['"]\)/)
      if (match) {
        return `Id<'${match[1]}'>`
      }
    }

    if (text.includes('GenericId')) {
      const match = text.match(/GenericId\(['"]([^'"]+)['"]\)/)
      if (match) {
        return `Id<'${match[1]}'>`
      }
    }
    if (text.includes('Schema.Array')) {
      // Extract inner type - this is simplified, could be more sophisticated
      const match = text.match(/Schema\.Array\(([^)]+)\)/)
      if (match) {
        const innerType = this.convertSchemaExpressionToType({ getText: () => match[1] } as ts.Expression)
        return `${innerType}[]`
      }
    }
    if (text.includes('Schema.Option')) {
      const match = text.match(/Schema\.Option\(([^)]+)\)/)
      if (match) {
        const innerType = this.convertSchemaExpressionToType({ getText: () => match[1] } as ts.Expression)
        return `Option<${innerType}>`
      }
    }

    // Handle confectSchema table references
    if (text.includes('confectSchema.tableSchemas.')) {
      const match = text.match(/confectSchema\.tableSchemas\.(\w+)\.withSystemFields/)
      if (match) {
        const tableName = match[1]
        // Find the actual type name from schema imports
        const actualTypeName = this.findTableTypeName(tableName)
        return actualTypeName || tableName
      }
    }

    // For complex schemas, return the text as-is for now
    return text
  }

  /**
   * Find the actual type name for a table by analyzing imports in schema files
   */
  private findTableTypeName(tableName: string): string | null {
    // Check if we already have a type registered for this table
    for (const [typeName, definitionFile] of this.typeDefinitions) {
      if (definitionFile.includes('schema') && typeName.toLowerCase().includes(tableName.slice(0, -1))) {
        // Found a type that matches the table name (removing plural 's')
        return typeName
      }
    }

    // Fallback: convert table name to singular type name
    // todos -> Todo, users -> User, etc.
    if (tableName.endsWith('s')) {
      return tableName.charAt(0).toUpperCase() + tableName.slice(1, -1)
    }

    return tableName.charAt(0).toUpperCase() + tableName.slice(1)
  }

  /**
   * Register types that need to be imported based on schema content
   */
  private registerTypeImports(schema: string): void {
    // Register Id type from dataModel
    if (schema.includes('Id<')) {
      if (!this.typeDefinitions.has('Id')) {
        this.typeDefinitions.set('Id', 'EXTERNAL:../_generated/dataModel')
      }
    }

    // Register Todo type from schema
    if (schema.includes('Todo')) {
      if (!this.typeDefinitions.has('Todo')) {
        this.typeDefinitions.set('Todo', 'EXTERNAL:./convex/schema')
      }
    }

    // Register Option type from effect
    if (schema.includes('Option<')) {
      if (!this.typeDefinitions.has('Option')) {
        this.typeDefinitions.set('Option', 'EXTERNAL:effect')
      }
    }

    // Register Array type (built-in, no import needed)
    // Array is a global type in TypeScript
  }

  /**
   * Convert error schema to TypeScript type definition
   */
  private convertSchemaToType(schema: string): string {
    // Register types that need to be imported
    this.registerTypeImports(schema)
    if (schema.includes('Schema.Union')) {
      const match = schema.match(/Schema\.Union\((.*)\)/)
      if (match) {
        const unionContent = match[1]
        const types = unionContent.split(',').map(type => {
          const trimmed = type.trim()
          if (trimmed.includes('Schema.Number')) return 'number'
          if (trimmed.includes('Schema.String')) return 'string'
          return trimmed
        })
        return types.join(' | ')
      }
    }

    // Handle basic Schema types
    if (schema.includes('Schema.Number')) return 'number'
    if (schema.includes('Schema.String')) return 'string'
    if (schema.includes('Schema.Void')) return 'void'
    if (schema.includes('Schema.Null')) return 'null'
    if (schema.includes('Schema.Boolean')) return 'boolean'

    // Handle Id function calls - convert to generic type
    if (schema.includes('Id(')) {
      const match = schema.match(/Id\(['"]([^'"]+)['"]\)/)
      if (match) {
        return `Id<'${match[1]}'>`
      }
    }

    // Handle GenericId types
    if (schema.includes('GenericId')) {
      const match = schema.match(/GenericId\(['"]([^'"]+)['"]\)/)
      if (match) {
        return `Id<'${match[1]}'>`
      }
    }

    // Handle confectSchema table references
    if (schema.includes('confectSchema.tableSchemas.')) {
      const match = schema.match(/confectSchema\.tableSchemas\.(\w+)\.withSystemFields/)
      if (match) {
        const tableName = match[1]
        // Find the actual type name from schema imports
        const actualTypeName = this.findTableTypeName(tableName)
        return actualTypeName || tableName
      }
    }

    // Handle imported schema types - resolve dynamically
    const resolvedType = this.resolveSchemaType(schema)
    if (resolvedType) {
      return resolvedType
    }

    return schema
  }

  /**
   * Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
}

/**
 * Main function
 */
export async function generateErrorTypes(convexDir: string, outputPath: string): Promise<void> {
  try {
    const extractor = new ConfectTypeExtractor(convexDir)
    const result = await extractor.extract()

    const generator = new ErrorTypesGenerator(result.functions, outputPath, result.typeDefinitions, convexDir)
    generator.generate()

    console.log('✅ Error types generation completed')
  } catch (error) {
    console.error('❌ Error during generation:', error)
    process.exit(1)
  }
}

// Execute if called directly
const convexDir = process.argv[2] || './convex'
const outputPath = process.argv[3] || './convex/_generated-types/confect-error-types.d.ts'

generateErrorTypes(convexDir, outputPath)
