#!/usr/bin/env node

import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * CLI for generating Confect error types
 */
async function main() {
  const args = process.argv.slice(2)

  // Parse arguments
  let convexDir = './convex'
  let outputPath = './convex/_generated-types/confect-error-types.d.ts'
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
      return
    }
  }

  // Validate that convex directory exists
  if (!fs.existsSync(convexDir)) {
    console.error(`❌ Error: Convex directory not found: ${convexDir}`)
    process.exit(1)
  }

  console.log('🚀 Confect Error Types Generator')
  console.log(`📁 Convex directory: ${convexDir}`)
  console.log(`📄 Output file: ${outputPath}`)

  if (watch) {
    console.log('👀 Watch mode enabled...')
    await watchAndGenerate(convexDir, outputPath)
  } else {
    generateOnce(convexDir, outputPath)
  }
}

/**
 * Generate types once
 */
function generateOnce(convexDir, outputPath) {
  try {
    const scriptPath = path.join(__dirname, '../scripts/generate-error-types.ts')
    const command = `npx tsx "${scriptPath}" "${convexDir}" "${outputPath}"`

    console.log('⚡ Generating types...')
    execSync(command, { stdio: 'inherit' })

  } catch (error) {
    console.error('❌ Error during generation:', error.message)
    process.exit(1)
  }
}

/**
 * Generate types in watch mode
 */
async function watchAndGenerate(convexDir, outputPath) {
  // Generate once at startup
  generateOnce(convexDir, outputPath)

  // Setup watcher
  const { default: chokidar } = await import('chokidar')

  // Watcher for function files AND api.d.ts
  const watcher = chokidar.watch([
    convexDir,
    path.join(convexDir, '_generated/api.d.ts')
  ], {
    ignored: [
      '**/node_modules/**',
      '**/_generated/confect-error-types.d.ts', // Ignore our generated file
      '**/*.js',
      '**/*.map'
    ],
    persistent: true
  })

  let timeout = null

  watcher.on('change', (filePath) => {
    if (filePath.endsWith('.ts')) {
      console.log(`📝 File modified: ${filePath}`)

      // Debounce to avoid multiple regenerations
      if (timeout) clearTimeout(timeout)

      timeout = setTimeout(() => {
        console.log('🔄 Regenerating types...')
        generateOnce(convexDir, outputPath)
      }, 500)
    }
  })

  console.log('✅ Watcher configured. Press Ctrl+C to exit.')

  // Handle graceful shutdown
  const handleExit = () => {
    console.log('\n👋 Closing watcher...')
    watcher.close()
    process.exit(0)
  }

  process.on('SIGINT', handleExit)
  process.on('SIGTERM', handleExit)
  process.on('SIGHUP', handleExit)
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
🚀 Confect Error Types Generator

Usage:
  confect-generate [options]

Options:
  --convex-dir <path>    Convex functions directory (default: ./convex)
  --output <path>        Output file (default: ./convex/_generated-types/confect-error-types.d.ts)
  --watch               Watch mode - automatically regenerate on changes
  --help                Show this help

Examples:
  confect-generate
  confect-generate --watch
  confect-generate --convex-dir ./backend/convex --output ./types/errors.ts
  confect-generate --watch --convex-dir ./backend/convex
`)
}

// Execute
main().catch(error => {
  console.error('❌ Error:', error)
  process.exit(1)
})
