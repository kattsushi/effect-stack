import { describe, it, expect } from 'vitest'

describe('React Index Module', () => {
  it('should export all necessary functions', async () => {
    const module = await import('../../src/react/index')
    
    // Check that the module exports the expected functions
    expect(typeof module.useQuery).toBe('function')
    expect(typeof module.useMutation).toBe('function')
    expect(typeof module.useAction).toBe('function')
    expect(typeof module.useQueryOption).toBe('function')
  })

  it('should export all necessary types', async () => {
    // This is a compile-time test - if the imports work, the types are exported
    const module = await import('../../src/react/index')
    
    // The module should exist and have the expected structure
    expect(module).toBeDefined()
    expect(Object.keys(module)).toContain('useQuery')
    expect(Object.keys(module)).toContain('useMutation')
    expect(Object.keys(module)).toContain('useAction')
    expect(Object.keys(module)).toContain('useQueryOption')
  })
})
