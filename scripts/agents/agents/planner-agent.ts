// scripts/agents/agents/planner-agent.ts

import { query } from "@anthropic-ai/claude-agent-sdk";
import type { AnalysisResult, ImplementationPlan } from "../types";

function buildPlannerPrompt(analysis: AnalysisResult): string {
  return `You are a PLANNER for daily-writing-friends (React + Firebase + TypeScript).

Create a step-by-step implementation plan to fix this error.

ERROR: ${analysis.context.errorMessage}
ROOT CAUSE: ${analysis.rootCause}
APPROACH: ${analysis.suggestedApproach}
STACK: ${analysis.context.stackSummary}

RULES:
1. Each step = ONE atomic, git-commit-ready change
2. Specify exact file paths to modify
3. Be specific about what code to change
4. Keep changes minimal - fix only what's needed

First explore the codebase to find relevant files, then output JSON:
{
  "summary": "One sentence describing the fix",
  "steps": [
    {"step": 1, "description": "What to do", "files": ["src/path/file.ts"], "action": "modify"}
  ]
}`;
}

function extractPlanFromResponse(response: string): ImplementationPlan | null {
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return null;
  }

  try {
    return JSON.parse(jsonMatch[0]) as ImplementationPlan;
  } catch {
    return null;
  }
}

function logPlannerStart(): void {
  console.log(`\n📋 [PLANNER] Creating fix plan...`);
}

const PLANNER_ALLOWED_TOOLS = ["Glob", "Read", "Grep"];
const PLANNER_MAX_TURNS = 10;

export async function createImplementationPlan(
  analysis: AnalysisResult
): Promise<ImplementationPlan | null> {
  logPlannerStart();

  const prompt = buildPlannerPrompt(analysis);
  let plan: ImplementationPlan | null = null;

  for await (const message of query({
    prompt,
    options: {
      allowedTools: PLANNER_ALLOWED_TOOLS,
      maxTurns: PLANNER_MAX_TURNS,
    },
  })) {
    if (message.type === "result" && message.subtype === "success") {
      plan = extractPlanFromResponse(message.result);
    }
  }

  return plan;
}
