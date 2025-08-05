import { query } from './_generated/server'

// Simple Convex query to test if the module system works
export const hello = query({
  handler: async () => {
    return "Hello from test module!"
  },
})

// Another simple function
export const getNumber = query({
  handler: async () => {
    return 42
  },
})
