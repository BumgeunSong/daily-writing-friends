// scripts/agents/json-utils.ts

import { extractJsonSync } from "@axync/extract-json";

/**
 * Extract JSON from text using @axync/extract-json library.
 * Handles code blocks, nested objects, and malformed JSON.
 */
export function extractJSON<T extends object>(
  text: string,
  validator?: (obj: unknown) => obj is T
): T | null {
  const results = extractJsonSync(text);

  if (results.length === 0) {
    return null;
  }

  // If validator provided, find first matching result
  if (validator) {
    for (const result of results) {
      if (validator(result)) {
        return result as T;
      }
    }
    return null;
  }

  // Return first object result (skip arrays/primitives)
  for (const result of results) {
    if (typeof result === "object" && result !== null && !Array.isArray(result)) {
      return result as T;
    }
  }

  return null;
}

// Type guards for each agent's expected response

export function isAnalysisResponse(obj: unknown): obj is {
  shouldFix: boolean;
  priority: string;
  reason: string;
  rootCause?: string;
  approach?: string;
} {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "shouldFix" in obj &&
    "priority" in obj
  );
}

export function isPlanResponse(obj: unknown): obj is {
  summaryEn: string;
  summaryKo: string;
  steps: Array<{
    step: number;
    description: string;
    files: string[];
    action: string;
  }>;
} {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "summaryEn" in obj &&
    "summaryKo" in obj &&
    "steps" in obj &&
    Array.isArray((obj as any).steps)
  );
}

export function isReviewResponse(obj: unknown): obj is {
  approved: boolean;
  checks: {
    unitTests: boolean;
    typeCheck: boolean;
    lint: boolean;
    build: boolean;
  };
  issues: string[];
  suggestions: string[];
} {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "approved" in obj &&
    "checks" in obj
  );
}
