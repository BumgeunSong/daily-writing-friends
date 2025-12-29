// scripts/agents/agents/analyzer-agent.ts

import { query } from "@anthropic-ai/claude-agent-sdk";
import type { ErrorContext, AnalysisResult } from "../types";
import { AGENT_CONFIG } from "../config";
import { extractJSON, isAnalysisResponse } from "../json-utils";
import { globalTokenTracker } from "../token-tracker";

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
  let rawResult = "";

  for await (const message of query({
    prompt,
    options: {
      allowedTools: AGENT_CONFIG.analyzer.allowedTools,
      maxTurns: AGENT_CONFIG.analyzer.maxTurns,
    },
  })) {
    if (message.type === "system" && "session_id" in message) {
      console.log(`   [DEBUG] Session started: ${message.session_id}`);
      if ("tools" in message) {
        console.log(`   [DEBUG] Tools: ${(message as any).tools.join(", ") || "(none)"}`);
      }
    } else if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "text") {
          console.log(`   [ANALYZER] ${block.text.substring(0, 100)}...`);
        }
      }
    } else if (message.type === "result") {
      globalTokenTracker.addFromMessage("Analyzer", message);
      if (message.subtype === "success") {
        rawResult = message.result;
        console.log(`   [DEBUG] Raw result length: ${rawResult.length}`);
        console.log(`   [DEBUG] Raw result preview: ${rawResult.substring(0, 200)}...`);

        const parsedJson = extractJSON(rawResult, isAnalysisResponse);
        if (parsedJson) {
          console.log(`   [DEBUG] JSON parsed successfully`);
          Object.assign(result, parsedJson);
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

  if (!result.shouldFix && rawResult) {
    console.log(`   [DEBUG] Final raw result:\n${rawResult}`);
  }

  return result;
}
