# Bun Executable Build System

Confect now supports building the error types generator as a standalone executable using Bun, providing faster execution and eliminating runtime dependencies.

## 🚀 Benefits

- **Faster execution**: Bun is significantly faster than Node.js
- **No runtime dependencies**: Standalone executable doesn't require Node.js
- **TypeScript native**: Direct TypeScript compilation without transpilation
- **Automatic fallback**: Falls back to Node.js + tsx if Bun executable isn't available

## 🔧 How it works

### Automatic Detection

The CLI (`confect-generate`) automatically detects which system to use:

1. **If Bun executable exists** (`bin/confect-generate-bun`):
   ```bash
   ⚡ Generating types with Bun executable...
   ```

2. **If Bun executable doesn't exist** (fallback):
   ```bash
   ⚡ Generating types with Node.js + tsx...
   ```

### Build Process

#### Manual Build
```bash
# Build the Bun executable
pnpm build:executable

# Or build everything
pnpm build
```

#### Automatic Build
The executable is automatically built during package installation if Bun is available:

```bash
# During npm/pnpm install
pnpm postinstall
```

If Bun is not installed, it shows a warning and uses the Node.js fallback.

## 📁 File Structure

```
packages/confect/
├── bin/
│   ├── confect-generate.js      # CLI script (detects which system to use)
│   └── confect-generate-bun     # Compiled Bun executable (generated)
├── scripts/
│   └── generate-error-types.ts  # Source TypeScript file
└── package.json                 # Build scripts and dependencies
```

## 🛠️ Development

### Building the Executable

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Build the executable
cd packages/confect
pnpm build:executable
```

### Testing Both Systems

```bash
# Test with Bun executable (if available)
confect-generate --convex-dir ./convex --output ./test-output.d.ts

# Test Node.js fallback (rename/remove the Bun executable temporarily)
mv bin/confect-generate-bun bin/confect-generate-bun.backup
confect-generate --convex-dir ./convex --output ./test-output.d.ts
mv bin/confect-generate-bun.backup bin/confect-generate-bun
```

## 📦 Distribution

The compiled executable is included in the npm package:

```json
{
  "files": [
    "bin",
    "scripts",
    "src",
    "dist"
  ]
}
```

This ensures users get the performance benefits without needing to build it themselves.

## 🔄 Fallback Strategy

The system is designed to be robust:

1. **Primary**: Use Bun executable (fastest)
2. **Fallback**: Use Node.js + tsx (universal compatibility)
3. **Graceful degradation**: No breaking changes, just performance differences

## ⚡ Performance Comparison

Typical performance improvements with Bun:

- **Cold start**: ~2-3x faster
- **Type generation**: ~1.5-2x faster
- **Memory usage**: ~30-40% less

The exact improvements depend on project size and system specifications.
