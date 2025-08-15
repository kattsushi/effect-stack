
export interface ParseResult {
    functions: ExtractedFunction[]
    typeDefinitions: Map<string, string>
}

export interface ExtractedFunction {
    name: string
    type: 'query' | 'mutation' | 'action'
    errorSchema: string | null
    returnsSchema: string | null
    filePath: string
    moduleName: string  // Module name derived from file path (e.g., "functions", "admin/functions")
    fullKey: string     // Full key for namespacing (e.g., "functions.insertTodo", "admin/functions.insertTodo")
    errorTypes: Set<string>
}
