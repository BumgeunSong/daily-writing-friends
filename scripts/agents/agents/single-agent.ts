// scripts/agents/agents/single-agent.ts

import { query } from "@anthropic-ai/claude-agent-sdk";
import type { ErrorContext, AnalysisResult, ImplementationPlan, ReviewChecks } from "../types";
import { AGENT_CONFIG } from "../config";
import { extractJSON } from "../json-utils";
import { globalTokenTracker } from "../token-tracker";

// ============================================
// Types
// ============================================

export interface SingleAgentResult {
  analysis: {
    shouldFix: boolean;
    priority: "high" | "medium" | "low" | "skip";
    reason: string;
    rootCause?: string;
    suggestedApproach?: string;
  };
  plan: {
    summaryEn: string;
    summaryKo: string;
    steps: Array<{
      step: number;
      description: string;
      files: string[];
      action: "modify" | "create" | "delete";
    }>;
  };
  verification: {
    typeCheck: boolean;
    lint: boolean;
    unitTests: boolean;
    build: boolean;
    allPassed: boolean;
  };
  success: boolean;
}

// ============================================
// Type Guard
// ============================================

function isSingleAgentResponse(obj: unknown): obj is SingleAgentResult {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    "analysis" in o &&
    "plan" in o &&
    "verification" in o &&
    "success" in o &&
    typeof o.success === "boolean"
  );
}

// ============================================
// Prompt
// ============================================

function buildSingleAgentPrompt(context: ErrorContext): string {
  return `You are a BUG FIXER for daily-writing-friends (React + Firebase + TypeScript).
Your task is to analyze, plan, implement, and verify a fix for this error IN A SINGLE SESSION.

ERROR CONTEXT:
- Type: ${context.errorType}
- Message: ${context.errorMessage}
- Occurrences: ${context.occurrences}
- Users affected: ${context.usersAffected}
- Sentry link: ${context.sentryLink}

STACK TRACE:
${context.stackSummary}

================================================================================
PHASE 1: ANALYSIS
================================================================================
First, determine if this error should be fixed with code changes.

FIX these (code bugs):
- null/undefined errors
- Logic bugs
- Missing error handling
- Type errors

SKIP these (not code issues):
- Network/connection errors
- Timeout errors
- Quota exceeded
- Browser-specific issues

If this should be SKIPPED, output the final JSON with shouldFix: false and stop.

================================================================================
PHASE 2: EXPLORATION & PLANNING
================================================================================
If fixable, explore the codebase to understand the issue:

1. Start with files mentioned in the stack trace
2. Use Grep to find specific functions/variables
3. Read only necessary files (MAX 10 reads)

Then create a minimal fix plan with specific steps.

================================================================================
PHASE 3: IMPLEMENTATION
================================================================================
Implement the fix following these rules:

1. Make MINIMAL changes - only what's needed
2. Keep existing code style
3. Add error handling where appropriate
4. Do NOT add unnecessary comments or logging
5. Do NOT refactor unrelated code

================================================================================
PHASE 4: VERIFICATION
================================================================================
Run these checks in order:

1. Type check: npx tsc --noEmit
2. Lint: npm run lint
3. Unit tests: npm test -- --run
4. Build: npm run build

================================================================================
FINAL OUTPUT
================================================================================
After completing all phases, output this JSON:

{
  "analysis": {
    "shouldFix": true/false,
    "priority": "high|medium|low|skip",
    "reason": "One sentence explanation",
    "rootCause": "What causes this error (if fixable)",
    "suggestedApproach": "How to fix it (if fixable)"
  },
  "plan": {
    "summaryEn": "One sentence describing the fix in English",
    "summaryKo": "Same summary in Korean",
    "steps": [
      {"step": 1, "description": "What was done", "files": ["src/path/file.ts"], "action": "modify"}
    ]
  },
  "verification": {
    "typeCheck": true/false,
    "lint": true/false,
    "unitTests": true/false,
    "build": true/false,
    "allPassed": true/false
  },
  "success": true/false
}

IMPORTANT: Output the JSON only AFTER you have completed implementation and verification.
If shouldFix is false, set success to false and skip plan/verification phases.`;
}

// ============================================
// Default Results
// ============================================

function createDefaultResult(context: ErrorContext): {
  analysisResult: AnalysisResult;
  plan: ImplementationPlan | null;
  checks: ReviewChecks;
  success: boolean;
} {
  return {
    analysisResult: {
      context,
      shouldFix: false,
      priority: "skip",
      reason: "Agent did not complete successfully",
    },
    plan: null,
    checks: {
      typeCheck: false,
      lint: false,
      unitTests: false,
      build: false,
    },
    success: false,
  };
}

// ============================================
// Logging
// ============================================

function logSingleAgentStart(context: ErrorContext): void {
  const truncatedMessage = context.errorMessage.substring(0, 50);
  console.log(`\n🤖 [SINGLE-AGENT] Starting bug fix for: ${truncatedMessage}...`);
}

function logPhase(phase: string): void {
  console.log(`   [PHASE] ${phase}`);
}

function logSuccess(): void {
  console.log(`   ✅ Single agent completed successfully`);
}

function logFailure(): void {
  console.log(`   ❌ Single agent failed`);
}

// ============================================
// Main Function
// ============================================

export async function runSingleAgentFix(context: ErrorContext): Promise<{
  analysisResult: AnalysisResult;
  plan: ImplementationPlan | null;
  checks: ReviewChecks;
  success: boolean;
}> {
  logSingleAgentStart(context);

  const defaultResult = createDefaultResult(context);
  const prompt = buildSingleAgentPrompt(context);
  let rawResult = "";

  for await (const message of query({
    prompt,
    options: {
      allowedTools: AGENT_CONFIG.singleAgent.allowedTools,
      maxTurns: AGENT_CONFIG.singleAgent.maxTurns,
    },
  })) {
    if (message.type === "system" && "session_id" in message) {
      console.log(`   [DEBUG] Session started: ${message.session_id}`);
      if ("tools" in message) {
        console.log(`   [DEBUG] Tools: ${(message as any).tools.join(", ")}`);
      }
    } else if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "text") {
          // Detect phase transitions
          const text = block.text;
          if (text.includes("PHASE 1") || text.includes("Analysis")) {
            logPhase("Analysis");
          } else if (text.includes("PHASE 2") || text.includes("Exploration")) {
            logPhase("Exploration & Planning");
          } else if (text.includes("PHASE 3") || text.includes("Implementation")) {
            logPhase("Implementation");
          } else if (text.includes("PHASE 4") || text.includes("Verification")) {
            logPhase("Verification");
          }
          console.log(`   [AGENT] ${text.substring(0, 100)}...`);
        } else if (block.type === "tool_use") {
          console.log(`   [TOOL] ${block.name}: ${JSON.stringify(block.input).substring(0, 80)}...`);
        }
      }
    } else if (message.type === "result") {
      globalTokenTracker.addFromMessage("SingleAgent", message);
      if (message.subtype === "success") {
        rawResult = message.result;
        console.log(`   [DEBUG] Raw result length: ${rawResult.length}`);
        console.log(`   [DEBUG] Raw result preview: ${rawResult.substring(0, 300)}...`);

        const parsed = extractJSON(rawResult, isSingleAgentResponse);
        if (parsed) {
          console.log(`   [DEBUG] JSON parsed successfully`);
          logSuccess();

          return {
            analysisResult: {
              context,
              shouldFix: parsed.analysis.shouldFix,
              priority: parsed.analysis.priority,
              reason: parsed.analysis.reason,
              rootCause: parsed.analysis.rootCause,
              suggestedApproach: parsed.analysis.suggestedApproach,
            },
            plan: parsed.analysis.shouldFix
              ? {
                  summaryEn: parsed.plan.summaryEn,
                  summaryKo: parsed.plan.summaryKo,
                  steps: parsed.plan.steps,
                }
              : null,
            checks: {
              typeCheck: parsed.verification.typeCheck,
              lint: parsed.verification.lint,
              unitTests: parsed.verification.unitTests,
              build: parsed.verification.build,
            },
            success: parsed.success,
          };
        } else {
          console.log(`   [DEBUG] No valid JSON found in result`);
          console.log(`   [DEBUG] Raw result: ${rawResult.substring(0, 500)}...`);
        }
      } else {
        console.log(`   [DEBUG] Result subtype: ${message.subtype}`);
        console.log(`   [DEBUG] Errors: ${JSON.stringify((message as any).errors)}`);
      }
    }
  }

  logFailure();
  if (rawResult) {
    console.log(`   [DEBUG] Final raw result:\n${rawResult}`);
  }

  return defaultResult;
}
