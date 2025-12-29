// scripts/agents/agents/reviewer-agent.ts

import { query } from "@anthropic-ai/claude-agent-sdk";
import type { AnalysisResult, ReviewResult, ReviewChecks } from "../types";
import { AGENT_CONFIG } from "../config";
import { extractJSON, isReviewResponse } from "../json-utils";
import { globalTokenTracker } from "../token-tracker";

function createDefaultReviewChecks(): ReviewChecks {
  return {
    unitTests: false,
    typeCheck: false,
    lint: false,
    build: false,
  };
}

function createDefaultReviewResult(): ReviewResult {
  return {
    approved: false,
    checks: createDefaultReviewChecks(),
    issues: [],
    suggestions: [],
  };
}

function buildReviewerPrompt(analysis: AnalysisResult): string {
  return `You are a CODE REVIEWER for daily-writing-friends (React + Firebase + TypeScript).

The CODER just made changes to fix this error:
ERROR: ${analysis.context.errorMessage}
ROOT CAUSE: ${analysis.rootCause}

YOUR TASKS:
1. Run these checks in order (stop if critical failure):
   a. Type check: npx tsc --noEmit
   b. Lint: npm run lint
   c. Unit tests: npm test -- --run
   d. Build: npm run build

2. Read the modified files and verify:
   - The fix addresses the root cause
   - No obvious regressions introduced
   - Code follows existing patterns

3. Output JSON:
{
  "approved": true/false,
  "checks": {
    "unitTests": true/false,
    "typeCheck": true/false,
    "lint": true/false,
    "build": true/false
  },
  "issues": ["Critical issues that MUST be fixed - be specific"],
  "suggestions": ["Optional improvements - non-blocking"]
}

IMPORTANT:
- Only add to "issues" if it's a CRITICAL problem
- Minor style issues go in "suggestions"
- If all checks pass and fix is correct, approve it`;
}

function logReviewerStart(): void {
  console.log(`\n🔎 [REVIEWER] Reviewing changes...`);
}

function mergeReviewResult(
  defaultResult: ReviewResult,
  parsedResult: Partial<ReviewResult>
): ReviewResult {
  return {
    approved: parsedResult.approved ?? defaultResult.approved,
    checks: parsedResult.checks ?? defaultResult.checks,
    issues: parsedResult.issues ?? defaultResult.issues,
    suggestions: parsedResult.suggestions ?? defaultResult.suggestions,
  };
}

export async function reviewImplementedChanges(
  analysis: AnalysisResult
): Promise<ReviewResult> {
  logReviewerStart();

  const result = createDefaultReviewResult();
  const prompt = buildReviewerPrompt(analysis);
  let rawResult = "";

  for await (const message of query({
    prompt,
    options: {
      allowedTools: AGENT_CONFIG.reviewer.allowedTools,
      maxTurns: AGENT_CONFIG.reviewer.maxTurns,
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
          console.log(`   [REVIEWER] ${block.text.substring(0, 100)}...`);
        } else if (block.type === "tool_use") {
          console.log(`   [TOOL] ${block.name}: ${JSON.stringify(block.input).substring(0, 80)}...`);
        }
      }
    } else if (message.type === "result") {
      globalTokenTracker.addFromMessage("Reviewer", message);
      if (message.subtype === "success") {
        rawResult = message.result;
        console.log(`   [DEBUG] Raw result length: ${rawResult.length}`);
        console.log(`   [DEBUG] Raw result preview: ${rawResult.substring(0, 200)}...`);

        const parsedResult = extractJSON(rawResult, isReviewResponse);
        if (parsedResult) {
          console.log(`   [DEBUG] JSON parsed successfully`);
          return mergeReviewResult(result, parsedResult);
        } else {
          console.log(`   [DEBUG] No valid JSON found`);
          console.log(`   [DEBUG] Raw result preview: ${rawResult.substring(0, 300)}...`);
        }
      } else {
        console.log(`   [DEBUG] Result subtype: ${message.subtype}`);
        console.log(`   [DEBUG] Errors: ${JSON.stringify((message as any).errors)}`);
      }
    }
  }

  if (rawResult) {
    console.log(`   [DEBUG] Final raw result:\n${rawResult}`);
  }

  return result;
}
