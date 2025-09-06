# Effect-Native CLI Refactor

## Current State

The `confect-generate` CLI currently uses a **hybrid approach**:

- ✅ **Non-watch mode**: Full `@effect/cli` implementation (works perfectly)
- ⚠️ **Watch mode**: Direct bypass using native `fs.watch` (pragmatic but not Effect-native)

## Goal: Full Effect-Native Implementation

### Target Architecture

```typescript
// Desired implementation structure
const program = Command.run(generateCommand, {
  name: "confect-generate",
  version: "1.0.0"
})(process.argv.slice(2))
.pipe(Effect.provide(NodeContext.layer)) // Use platform-node-shared
```

### Key Components to Use

1. **@effect/cli**
   - `Command.make()` for command definition
   - `Options.text()`, `Options.boolean()` for argument parsing
   - `Command.withHandler()` for execution logic

2. **@effect/platform**
   - `FileSystem.watch()` for file system monitoring
   - `FileSystem.FileSystem` service for file operations

3. **@effect/platform-node-shared**
   - Cross-platform compatibility layer
   - Better than platform-bun for broader support

4. **Effect Streams**
   - `Stream.async()` for file system events
   - `Stream.debounce()` for event throttling
   - `Stream.mapEffect()` for processing events
   - `Stream.runDrain()` for consuming streams

5. **Effect Concurrency**
   - `Effect.fork()` for background processes
   - `Effect.never` for keeping processes alive
   - Proper `Fiber` management

## Current Challenges

### 1. Stream Execution Model
```typescript
// This doesn't work as expected:
yield* fileChangeStream.pipe(
  Stream.debounce("500 millis"),
  Stream.mapEffect(regenerate),
  Stream.runDrain
)
// Process blocks and never continues
```

### 2. Long-Running Processes
```typescript
// Need to understand:
yield* Effect.fork(watcherEffect)
yield* Effect.never // Keep main process alive
```

### 3. Resource Management
```typescript
// Proper cleanup and scope management
const watcherEffect = Effect.acquireUseRelease(
  // acquire watcher
  // use watcher
  // release watcher
)
```

## Research Tasks

### Phase 1: Understanding Effect Fundamentals
- [ ] Study Effect documentation on long-running processes
- [ ] Understand `Effect.fork()` and `Fiber` lifecycle
- [ ] Learn `Effect.never` and process management
- [ ] Master `Stream.async()` for external events

### Phase 2: Platform Integration
- [ ] Research `@effect/platform-node-shared` capabilities
- [ ] Understand `FileSystem.watch()` API
- [ ] Learn cross-platform file watching patterns
- [ ] Study resource management with `Scope`

### Phase 3: Stream Processing
- [ ] Master `Stream.debounce()` for event throttling
- [ ] Understand `Stream.mapEffect()` for async processing
- [ ] Learn proper `Stream.runDrain()` usage
- [ ] Study stream error handling patterns

## Implementation Plan

### Step 1: Simple File Watcher
```typescript
const createFileWatcher = (path: string) =>
  Stream.async<string, never>((emit) => {
    const watcher = fs.watch(path, (_, filename) => {
      if (filename) emit.single(filename)
    })
    return Effect.sync(() => watcher.close())
  })
```

### Step 2: Debounced Processing
```typescript
const processChanges = (stream: Stream<string>) =>
  stream.pipe(
    Stream.debounce("500 millis"),
    Stream.mapEffect(regenerateTypes),
    Stream.runDrain
  )
```

### Step 3: Background Execution
```typescript
const watchMode = Effect.gen(function* () {
  yield* generateOnce()
  yield* Effect.fork(processChanges(createFileWatcher(convexDir)))
  yield* Effect.never
})
```

## Success Criteria

- [ ] Full `@effect/cli` for all modes
- [ ] Native `@effect/platform` file watching
- [ ] Proper `Stream` processing
- [ ] Clean resource management
- [ ] Cross-platform compatibility
- [ ] No hybrid/bypass code

## Notes

The current hybrid approach works and is production-ready. This refactor is about:
1. **Consistency**: Full Effect ecosystem usage
2. **Learning**: Better understanding of Effect patterns
3. **Scalability**: Easier to extend with Effect's powerful abstractions
4. **Best Practices**: Following Effect's recommended patterns

The refactor should be done when we have better understanding of Effect's execution model and stream processing patterns.
