// scripts/agents/agents/analyzer-agent.ts

import { query } from "@anthropic-ai/claude-agent-sdk";
import type { ErrorContext, AnalysisResult } from "../types";

function buildAnalyzerPrompt(context: ErrorContext): string {
  return `Analyze this error. Should we fix it with code changes?

ERROR: ${context.errorType}
MESSAGE: ${context.errorMessage}
OCCURRENCES: ${context.occurrences}
USERS: ${context.usersAffected}
STACK: ${context.stackSummary}

RULES:
- Only fix CODE BUGS (not network/infra/browser issues)
- Skip: timeout, connection lost, quota exceeded
- Fix: null/undefined, logic bugs, missing error handling

Reply JSON only:
{"shouldFix":bool,"priority":"high|medium|low|skip","reason":"1 sentence","rootCause":"if fixable","approach":"if fixable"}`;
}

function createDefaultAnalysisResult(context: ErrorContext): AnalysisResult {
  return {
    context,
    shouldFix: false,
    priority: "skip",
    reason: "",
  };
}

function extractJsonFromResponse(response: string): object | null {
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

function logAnalyzerStart(context: ErrorContext): void {
  const truncatedMessage = context.errorMessage.substring(0, 50);
  console.log(`\n🔍 [ANALYZER] ${truncatedMessage}...`);
}

export async function analyzeErrorAndDeterminePriority(
  context: ErrorContext
): Promise<AnalysisResult> {
  logAnalyzerStart(context);

  const result = createDefaultAnalysisResult(context);
  const prompt = buildAnalyzerPrompt(context);

  for await (const message of query({
    prompt,
    options: { allowedTools: [], maxTurns: 1 },
  })) {
    if (message.type === "result" && message.subtype === "success") {
      const parsedJson = extractJsonFromResponse(message.result);
      if (parsedJson) {
        Object.assign(result, parsedJson);
      }
    }
  }

  return result;
}
