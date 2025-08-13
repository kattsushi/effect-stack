#!/usr/bin/env bun

import * as fs from 'fs'
import * as path from 'path'
import * as chokidar from 'chokidar'
import { ConfectTypeExtractor, ErrorTypesGenerator } from './generate-error-types'

/**
 * CLI for generating Confect error types
 */
async function main() {
  const args = process.argv.slice(2)

  // Parse arguments
  let convexDir = './convex'
  let outputPath = './confect-generated-env.d.ts'
  let watch = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--convex-dir' && i + 1 < args.length) {
      convexDir = args[i + 1]
      i++
    } else if (arg === '--output' && i + 1 < args.length) {
      outputPath = args[i + 1]
      i++
    } else if (arg === '--watch') {
      watch = true
    } else if (arg === '--help') {
      showHelp()
      process.exit(0)
    }
  }

  // Validate that convex directory exists
  if (!fs.existsSync(convexDir)) {
    console.error(`❌ Error: Convex directory not found: ${convexDir}`)
    process.exit(1)
  }

  console.log('🚀 Confect Error Types Generator (Bun)')
  console.log(`📁 Convex directory: ${convexDir}`)
  console.log(`📄 Output file: ${outputPath}`)

  if (watch) {
    console.log('👀 Watch mode enabled...')
    await watchAndGenerate(convexDir, outputPath)
  } else {
    await generateOnce(convexDir, outputPath)
  }
}

/**
 * Generate types once
 */
async function generateOnce(convexDir: string, outputPath: string) {
  try {
    console.log('⚡ Generating types...')
    
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

/**
 * Generate types in watch mode
 */
async function watchAndGenerate(convexDir: string, outputPath: string) {
  // Generate once at startup
  await generateOnce(convexDir, outputPath)

  // Use chokidar for file watching

  // Watcher for function files AND api.d.ts
  const watcher = chokidar.watch([
    convexDir,
    path.join(convexDir, '_generated/api.d.ts')
  ], {
    ignored: [
      '**/node_modules/**',
      '**/confect-generated-env.d.ts', // Ignore our generated file
      '**/*.js',
      '**/*.map'
    ],
    persistent: true
  })

  let timeout: NodeJS.Timeout | null = null

  watcher.on('change', (filePath) => {
    if (filePath.endsWith('.ts')) {
      console.log(`📝 File modified: ${filePath}`)
      
      // Debounce rapid changes
      if (timeout) {
        clearTimeout(timeout)
      }
      
      timeout = setTimeout(async () => {
        await generateOnce(convexDir, outputPath)
      }, 500)
    }
  })

  console.log('👀 Watching for changes... Press Ctrl+C to stop.')
  
  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('\n👋 Stopping watcher...')
    watcher.close()
    process.exit(0)
  })
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
🚀 Confect Error Types Generator (Bun)

Generates TypeScript error types for Confect functions from Convex schema.

Usage:
  confect-generate [options]

Options:
  --convex-dir <path>    Convex functions directory (default: ./convex)
  --output <path>        Output file (default: ./confect-generated-env.d.ts)
  --watch               Watch mode - automatically regenerate on changes
  --help                Show this help

Examples:
  confect-generate
  confect-generate --watch
  confect-generate --convex-dir ./backend/convex --output ./types/errors.ts
  confect-generate --watch --convex-dir ./backend/convex
`)
}

// Execute if called directly
main().catch(error => {
  console.error('❌ Error:', error)
  process.exit(1)
})
