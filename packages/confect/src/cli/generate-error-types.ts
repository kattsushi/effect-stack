#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import * as Effect from "effect/Effect"
import * as Console from "effect/Console"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import * as ts from 'typescript'
import { ExtractedFunction } from './shared-types'
import { ConfectTypeExtractor } from './confect-type-extractor'


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
   * Get types that are actually used in the final interface
   */
  private getUsedTypesInInterface(): Set<string> {
    const usedTypes = new Set<string>()

    for (const func of this.functions) {
      // Check error types only
      for (const errorType of func.errorTypes) {
        usedTypes.add(errorType)
      }
    }

    return usedTypes
  }



  /**
   * Generate necessary imports
   */
  private generateImports(): string {
    const localImports = new Map<string, Set<string>>()
    const externalImports = new Map<string, Set<string>>()

    // First, scan all files to register available types
    this.scanAllFilesForTypes()

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
    }

    // Now collect only the types that are actually used in the final interface
    const usedTypes = this.getUsedTypesInInterface()

    for (const typeName of usedTypes) {
      const definitionFile = this.typeDefinitions.get(typeName)
      if (definitionFile && definitionFile.startsWith('EXTERNAL:')) {
        const moduleName = definitionFile.replace('EXTERNAL:', '')
        if (!externalImports.has(moduleName)) {
          externalImports.set(moduleName, new Set())
        }
        externalImports.get(moduleName)!.add(typeName)
      } else if (definitionFile) {
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
   * Generate module augmentation for Confect (both modules)
   */
  private generateModuleAugmentation(): string {
    // Generate interface content with only namespaced keys
    let interfaceContent = ''

    for (const func of this.functions) {
      if (func.errorSchema) {
        const typeDefinition = this.convertSchemaToType(func.errorSchema)

        // Add namespaced key only - always add with quotes for complex keys
        interfaceContent += `    "${func.fullKey}": ${typeDefinition}\n`
      }
    }

    // Generate for both modules
    let content = `// Module augmentation for main react module
declare module '@monorepo/confect/react' {
  interface ConfectErrorTypes {
${interfaceContent}  }
}

// Module augmentation for effect-atom module
declare module '@monorepo/confect/react/effect-atom' {
  interface ConfectErrorTypes {
${interfaceContent}  }
}
`
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

        // Generate namespaced helper type only
        const namespacedTypeName = this.generateNamespacedTypeName(func.moduleName, func.name) + 'Errors'
        content += `export type ${namespacedTypeName} = ${typeDefinition}\n`
      }
    }

    return content
  }

  /**
   * Generate a valid TypeScript type name from module name and function name
   */
  private generateNamespacedTypeName(moduleName: string, functionName: string): string {
    // Convert module path to PascalCase (e.g., "admin/functions" -> "AdminFunctions")
    const moduleNamePascal = moduleName
      .split('/')
      .map(part => this.capitalize(part))
      .join('')

    return moduleNamePascal + this.capitalize(functionName)
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
    // Search in all TypeScript files in the convex directory
    const filesToSearch = this.getAllTypeScriptFiles(this.convexDir)

    for (const functionFile of filesToSearch) {
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
   * Get all TypeScript files in a directory recursively
   */
  private getAllTypeScriptFiles(dir: string): string[] {
    const files: string[] = []

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          // Skip node_modules and other common directories to avoid
          if (!['node_modules', '.git', 'dist', 'build', '_generated'].includes(entry.name)) {
            files.push(...this.getAllTypeScriptFiles(fullPath))
          }
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          files.push(fullPath)
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible
    }

    return files
  }

  /**
   * Resolve import path (relative, absolute, or package import)
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
      if (fs.existsSync(resolved)) {
        return resolved
      }
      return resolved + '.ts'
    } else {
      // Package import or absolute import - keep as-is for external packages
      // This will be handled by the import generation logic
      return importPath
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

      // Also register any types found in this file for import
      this.registerTypesFromFile(filePath, content)

      return definition
    } catch (error) {
      console.warn(`Could not analyze schema file ${filePath}: ${error}`)
      return null
    }
  }

  /**
   * Scan all files to register available types
   */
  private scanAllFilesForTypes(): void {
    const allFiles = this.getAllTypeScriptFiles(this.convexDir)

    for (const filePath of allFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        this.registerTypesFromFile(filePath, content)
      } catch (error) {
        // Continue with other files
      }
    }
  }

  /**
   * Register types that are defined in a specific file
   */
  private registerTypesFromFile(filePath: string, content: string): void {
    // Find all exported types in this file
    const exportRegex = /export\s+(?:const|class)\s+([A-Z][a-zA-Z0-9]*(?:WithSystemFields)?)\b/g
    let match: RegExpExecArray | null

    while ((match = exportRegex.exec(content)) !== null) {
      const typeName = match[1]

      if (!this.typeDefinitions.has(typeName)) {
        // Calculate relative path from output directory to this file
        const outputDir = path.dirname(this.outputPath)
        const relativePath = path.relative(outputDir, filePath)
        const importPath = `./${relativePath.replace(/\.ts$/, '')}`

        this.typeDefinitions.set(typeName, `EXTERNAL:${importPath}`)
      }
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

    // Handle direct schema class references (e.g., TodoWithSystemFields)
    if (this.isSchemaClassName(text)) {
      return text.trim()
    }

    // For complex schemas, return the text as-is for now
    return text
  }

  /**
   * Check if a text represents a schema class name
   */
  private isSchemaClassName(text: string): boolean {
    const trimmed = text.trim()

    // Check if it's a simple identifier (likely a schema class)
    if (/^[A-Z][a-zA-Z0-9]*$/.test(trimmed)) {
      // Check if we can find an import for this name
      const importInfo = this.findSchemaImport(trimmed)
      return importInfo !== null
    }

    return false
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

    // Register Option type from effect
    if (schema.includes('Option<')) {
      if (!this.typeDefinitions.has('Option')) {
        this.typeDefinitions.set('Option', 'EXTERNAL:effect')
      }
    }

    // Auto-detect and register schema class names
    this.detectAndRegisterSchemaClasses(schema)

    // Register Array type (built-in, no import needed)
    // Array is a global type in TypeScript
  }

  /**
   * Detect and register schema classes automatically
   */
  private detectAndRegisterSchemaClasses(schema: string): void {
    // Look for potential schema class names (PascalCase identifiers)
    const classNameRegex = /\b([A-Z][a-zA-Z0-9]*(?:WithSystemFields)?)\b/g
    let match: RegExpExecArray | null

    while ((match = classNameRegex.exec(schema)) !== null) {
      const className = match[1]

      // Skip common TypeScript/JavaScript keywords and built-in types
      if (this.isBuiltInType(className)) {
        continue
      }

      if (!this.typeDefinitions.has(className)) {
        // Try to find where this class is imported from
        const importInfo = this.findSchemaImport(className)

        if (importInfo) {
          // Determine if it's a local file or external package
          const isLocalFile = importInfo.importPath.startsWith('.') ||
                             importInfo.filePath.endsWith('.ts')

          if (isLocalFile) {
            // Convert absolute path back to relative import for the generated file
            const relativeImport = this.getRelativeImportPath(importInfo.importPath, importInfo.filePath)
            this.typeDefinitions.set(className, `EXTERNAL:${relativeImport}`)
          } else {
            // External package import
            this.typeDefinitions.set(className, `EXTERNAL:${importInfo.importPath}`)
          }
        } else {
          // If not found as import, check if it's defined in the same file we're analyzing
          const definedInSameFile = this.isDefinedInCurrentFile(className)
          if (definedInSameFile) {
            this.typeDefinitions.set(className, `EXTERNAL:${definedInSameFile}`)
          }
        }
      }
    }
  }

  /**
   * Check if a type is defined in the current function files
   */
  private isDefinedInCurrentFile(typeName: string): string | null {
    // Check all TypeScript files in convex directory
    const allFiles = this.getAllTypeScriptFiles(this.convexDir)

    for (const functionFile of allFiles) {
      try {
        const content = fs.readFileSync(functionFile, 'utf-8')

        // Look for export declarations of this type
        const exportRegex = new RegExp(`export\\s+(?:const|class)\\s+${typeName}\\b`)
        if (exportRegex.test(content)) {
          // Return relative path from output directory to this file
          const outputDir = path.dirname(this.outputPath)
          const relativePath = path.relative(outputDir, functionFile)
          return `./${relativePath.replace(/\.ts$/, '')}`
        }
      } catch (error) {
        // Continue searching
      }
    }

    return null
  }

  /**
   * Get relative import path for the generated file
   */
  private getRelativeImportPath(originalImportPath: string, resolvedFilePath: string): string {
    // If it's already a relative path, use it as-is
    if (originalImportPath.startsWith('.')) {
      return originalImportPath
    }

    // If it's an absolute file path, convert to relative from output directory
    if (resolvedFilePath.endsWith('.ts')) {
      const outputDir = path.dirname(this.outputPath)
      const relativePath = path.relative(outputDir, resolvedFilePath)
      // Remove .ts extension and ensure it starts with ./
      const withoutExt = relativePath.replace(/\.ts$/, '')
      return withoutExt.startsWith('.') ? withoutExt : `./${withoutExt}`
    }

    // For package imports, return as-is
    return originalImportPath
  }

  /**
   * Check if a name is a built-in TypeScript type
   */
  private isBuiltInType(name: string): boolean {
    const builtInTypes = new Set([
      'String', 'Number', 'Boolean', 'Array', 'Object', 'Function', 'Date',
      'RegExp', 'Error', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet',
      'Symbol', 'BigInt', 'Uint8Array', 'Int8Array', 'Uint16Array', 'Int16Array',
      'Uint32Array', 'Int32Array', 'Float32Array', 'Float64Array', 'ArrayBuffer',
      'DataView', 'JSON', 'Math', 'Reflect', 'Proxy', 'Intl', 'Schema', 'Effect'
    ])

    return builtInTypes.has(name)
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

    // Handle Schema.Array() patterns
    if (schema.includes('Schema.Array(')) {
      const match = schema.match(/Schema\.Array\(([^)]+)\)/)
      if (match) {
        const innerType = match[1].trim()
        // Convert the inner type recursively
        const convertedInnerType = this.convertSchemaToType(innerType)
        return `${convertedInnerType}[]`
      }
    }

    // Handle Schema.Option() patterns
    if (schema.includes('Schema.Option(')) {
      const match = schema.match(/Schema\.Option\(([^)]+)\)/)
      if (match) {
        const innerType = match[1].trim()
        // Convert the inner type recursively
        const convertedInnerType = this.convertSchemaToType(innerType)
        return `Option<${convertedInnerType}>`
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
 * Confect Type Generator Service using Effect.Service with Effect-native FileSystem
 */
export class ConfectTypeGeneratorService extends Effect.Service<ConfectTypeGeneratorService>()("ConfectTypeGeneratorService", {
  effect: Effect.gen(function* () {
    return {
      generate: (convexDir: string, outputPath: string) =>
        Effect.gen(function* () {
          yield* Console.log('⚡ Generating types...')

          // Use Effect-native approach for type extraction
          const extractor = new ConfectTypeExtractor(convexDir)
          const result = yield* Effect.tryPromise({
            try: () => extractor.extract(),
            catch: (error) => new Error(`Failed to extract types: ${error}`)
          })

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
