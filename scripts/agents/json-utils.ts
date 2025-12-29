// scripts/agents/json-utils.ts

/**
 * Extract JSON from text that may contain code blocks or multiple JSON objects.
 * Handles:
 * - JSON in code blocks (```json ... ```)
 * - Raw JSON objects
 * - Multiple JSON objects (returns the one matching expected structure)
 */
export function extractJSON<T extends object>(
  text: string,
  validator?: (obj: unknown) => obj is T
): T | null {
  // Pattern 1: JSON in code block
  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1]);
      if (!validator || validator(parsed)) {
        return parsed as T;
      }
    } catch {
      // Continue to next pattern
    }
  }

  // Pattern 2: Find all JSON-like objects and try parsing
  const jsonMatches = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
  if (jsonMatches) {
    // Try from last match (most likely to be the final output)
    for (let i = jsonMatches.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(jsonMatches[i]);
        if (!validator || validator(parsed)) {
          return parsed as T;
        }
      } catch {
        // Continue to next match
      }
    }
  }

  // Pattern 3: Try the simple greedy match as fallback
  const greedyMatch = text.match(/\{[\s\S]*\}/);
  if (greedyMatch) {
    try {
      const parsed = JSON.parse(greedyMatch[0]);
      if (!validator || validator(parsed)) {
        return parsed as T;
      }
    } catch {
      // Failed to parse
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
  summary: string;
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
    "summary" in obj &&
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
