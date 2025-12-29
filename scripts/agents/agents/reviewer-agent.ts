// scripts/agents/agents/reviewer-agent.ts

import { query } from "@anthropic-ai/claude-agent-sdk";
import type { AnalysisResult, ReviewResult, ReviewChecks } from "../types";

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

function identifyCheckType(command: string): string | null {
  if (command.includes("tsc")) return "type check";
  if (command.includes("lint")) return "lint";
  if (command.includes("test")) return "tests";
  if (command.includes("build")) return "build";
  return null;
}

function logCheckExecution(checkType: string): void {
  console.log(`   🔍 Running ${checkType}...`);
}

interface ContentBlock {
  type: string;
  name?: string;
  input?: { command?: string };
}

function processReviewerAssistantMessage(content: ContentBlock[]): void {
  for (const block of content) {
    if (block.type === "tool_use" && block.name === "Bash") {
      const command = block.input?.command || "";
      const checkType = identifyCheckType(command);
      if (checkType) {
        logCheckExecution(checkType);
      }
    }
  }
}

function extractReviewResultFromResponse(response: string): Partial<ReviewResult> | null {
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return null;
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
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

const REVIEWER_ALLOWED_TOOLS = ["Read", "Bash", "Grep", "Glob"];
const REVIEWER_MAX_TURNS = 15;

export async function reviewImplementedChanges(
  analysis: AnalysisResult
): Promise<ReviewResult> {
  logReviewerStart();

  const result = createDefaultReviewResult();
  const prompt = buildReviewerPrompt(analysis);

  for await (const message of query({
    prompt,
    options: {
      allowedTools: REVIEWER_ALLOWED_TOOLS,
      maxTurns: REVIEWER_MAX_TURNS,
    },
  })) {
    if (message.type === "assistant") {
      processReviewerAssistantMessage(message.message.content as ContentBlock[]);
    } else if (message.type === "result" && message.subtype === "success") {
      const parsedResult = extractReviewResultFromResponse(message.result);
      if (parsedResult) {
        return mergeReviewResult(result, parsedResult);
      }
    }
  }

  return result;
}
