// Shared type utilities for Confect React hooks

// Import generated types automatically
/// <reference path="../../../../apps/backend/confect-generated-env.d.ts" />

// Error types will be provided via declaration merging from generated files
export interface ConfectErrorTypes {}

// Extract error types from ConfectErrorTypes interface (declaration merging)
export type InferFunctionErrors<F extends string> = F extends keyof ConfectErrorTypes
  ? ConfectErrorTypes[F]
  : any

// Helper types for direct inference from Convex API functions
export type InferFunctionArgs<T> = T extends { _args: infer Args } ? Args : any
export type InferFunctionReturns<T> = T extends { _returnType: infer Return } ? Return : any
