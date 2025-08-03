'use strict'
// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config')
const { FileStore } = require('metro-cache')
const { withNativeWind } = require('nativewind/metro')
const path = require('node:path')

const config = withNxManagedCache(
  withMonorepoPaths(
    withNativeWind(getDefaultConfig(__dirname), {
      input: './global.css',
      configPath: './tailwind.config.js',
    }),
  ),
)

config.resolver.unstable_enablePackageExports = true

config.resolver.disableHierarchicalLookup = true

// Add alias support for @ paths
config.resolver.alias = {
  '@': __dirname,
}

module.exports = config

/**
 * Add the monorepo paths to the Metro config.
 * This allows Metro to resolve modules from the monorepo.
 *
 * @see https://docs.expo.dev/guides/monorepos/#modify-the-metro-config
 * @param {import('expo/metro-config').MetroConfig} metroConfig
 * @returns {import('expo/metro-config').MetroConfig}
 */
function withMonorepoPaths(metroConfig) {
  const projectRoot = __dirname
  const workspaceRoot = path.resolve(projectRoot, '../..')

  // #1 - Watch all files in the monorepo
  metroConfig.watchFolders = [workspaceRoot]

  // #2 - Resolve modules within the project's `node_modules` first, then all monorepo modules
  metroConfig.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ]

  return metroConfig
}

/**
 * Move the Metro cache to the `.cache/metro` folder.
 * If you have any environment variables, you can configure NX to invalidate it when needed.
 *
 * @see https://nx.dev/concepts/how-caching-works
 * @param {import('expo/metro-config').MetroConfig} metroConfig
 * @returns {import('expo/metro-config').MetroConfig}
 */
function withNxManagedCache(metroConfig) {
  metroConfig.cacheStores = [new FileStore({ root: path.join(__dirname, '.cache/metro') })]
  return metroConfig
}
