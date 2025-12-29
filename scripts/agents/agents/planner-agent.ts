// scripts/agents/agents/planner-agent.ts

import { query } from "@anthropic-ai/claude-agent-sdk";
import type { AnalysisResult, ImplementationPlan } from "../types";
import { AGENT_CONFIG } from "../config";
import { extractJSON, isPlanResponse } from "../json-utils";

function buildPlannerPrompt(analysis: AnalysisResult): string {
  return `You are a PLANNER for daily-writing-friends (React + Firebase + TypeScript).

Create a step-by-step implementation plan to fix this error.

ERROR: ${analysis.context.errorMessage}
ROOT CAUSE: ${analysis.rootCause}
APPROACH: ${analysis.suggestedApproach}
STACK: ${analysis.context.stackSummary}

EXPLORATION RULES (IMPORTANT):
1. Be EFFICIENT - don't explore more than needed
2. Start with stack trace files first
3. Use Grep to find specific functions/variables, not Glob for all files
4. Read only the files you need to understand the fix
5. MAX 10 file reads - then create the plan

PLAN RULES:
1. Each step = ONE atomic, git-commit-ready change
2. Specify exact file paths to modify
3. Be specific about what code to change
4. Keep changes minimal - fix only what's needed

Output JSON when ready:
{
  "summary": "One sentence describing the fix",
  "steps": [
    {"step": 1, "description": "What to do", "files": ["src/path/file.ts"], "action": "modify"}
  ]
}`;
}

function logPlannerStart(): void {
  console.log(`\n📋 [PLANNER] Creating fix plan...`);
}

export async function createImplementationPlan(
  analysis: AnalysisResult
): Promise<ImplementationPlan | null> {
  logPlannerStart();

  const prompt = buildPlannerPrompt(analysis);
  let plan: ImplementationPlan | null = null;
  let rawResult = "";

  for await (const message of query({
    prompt,
    options: {
      allowedTools: AGENT_CONFIG.planner.allowedTools,
      maxTurns: AGENT_CONFIG.planner.maxTurns,
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
          console.log(`   [PLANNER] ${block.text.substring(0, 100)}...`);
        } else if (block.type === "tool_use") {
          console.log(`   [TOOL] ${block.name}: ${JSON.stringify(block.input).substring(0, 80)}...`);
        }
      }
    } else if (message.type === "result") {
      if (message.subtype === "success") {
        rawResult = message.result;
        console.log(`   [DEBUG] Raw result length: ${rawResult.length}`);
        console.log(`   [DEBUG] Raw result preview: ${rawResult.substring(0, 200)}...`);

        plan = extractJSON(rawResult, isPlanResponse) as ImplementationPlan | null;
        if (plan) {
          console.log(`   [DEBUG] JSON parsed successfully`);
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

  if (!plan) {
    console.log(`   [DEBUG] Final raw result:\n${rawResult}`);
  }

  return plan;
}
