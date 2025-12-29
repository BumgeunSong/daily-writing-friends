// scripts/agents/agents/coder-agent.ts

import { query } from "@anthropic-ai/claude-agent-sdk";
import type { AnalysisResult, ImplementationPlan } from "../types";

function formatPlanStepsForPrompt(plan: ImplementationPlan): string {
  return plan.steps
    .map((step) => `Step ${step.step}: ${step.description}\n  Files: ${step.files.join(", ")}`)
    .join("\n\n");
}

function buildInitialImplementationPrompt(
  analysis: AnalysisResult,
  plan: ImplementationPlan
): string {
  return `You are a CODER for daily-writing-friends (React + Firebase + TypeScript).

Implement this fix plan step by step.

ERROR TO FIX: ${analysis.context.errorMessage}
ROOT CAUSE: ${analysis.rootCause}

PLAN:
${formatPlanStepsForPrompt(plan)}

RULES:
1. Follow the plan exactly
2. Make minimal changes - only what's needed
3. Keep existing code style
4. Add error handling where appropriate
5. Do NOT add unnecessary comments or logging

Implement each step now.`;
}

function buildRevisionPrompt(analysis: AnalysisResult, reviewFeedback: string): string {
  return `You are a CODER. Apply the reviewer's feedback to fix issues.

ORIGINAL ERROR: ${analysis.context.errorMessage}
ROOT CAUSE: ${analysis.rootCause}

REVIEWER FEEDBACK:
${reviewFeedback}

Fix the issues mentioned by the reviewer. Make minimal, targeted changes.`;
}

function logCoderStart(hasReviewFeedback: boolean): void {
  console.log(`\n💻 [CODER] Implementing fix...`);
  if (hasReviewFeedback) {
    console.log(`   (Applying reviewer feedback)`);
  }
}

function logImplementationSuccess(): void {
  console.log(`   ✅ Implementation complete`);
}

function logImplementationFailure(): void {
  console.log(`   ❌ Implementation failed`);
}

const CODER_ALLOWED_TOOLS = ["Read", "Edit", "Write", "Bash", "Glob", "Grep"];
const CODER_MAX_TURNS = 20;

export async function implementFixFromPlan(
  analysis: AnalysisResult,
  plan: ImplementationPlan,
  reviewFeedback?: string
): Promise<boolean> {
  logCoderStart(Boolean(reviewFeedback));

  const prompt = reviewFeedback
    ? buildRevisionPrompt(analysis, reviewFeedback)
    : buildInitialImplementationPrompt(analysis, plan);

  let implementationSucceeded = false;
  let rawResult = "";

  for await (const message of query({
    prompt,
    options: {
      allowedTools: CODER_ALLOWED_TOOLS,
      maxTurns: CODER_MAX_TURNS,
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
          console.log(`   [CODER] ${block.text.substring(0, 100)}...`);
        } else if (block.type === "tool_use") {
          console.log(`   [TOOL] ${block.name}: ${JSON.stringify(block.input).substring(0, 80)}...`);
        }
      }
    } else if (message.type === "result") {
      if (message.subtype === "success") {
        rawResult = message.result;
        console.log(`   [DEBUG] Raw result length: ${rawResult.length}`);
        console.log(`   [DEBUG] Raw result preview: ${rawResult.substring(0, 200)}...`);
        implementationSucceeded = true;
        logImplementationSuccess();
      } else {
        console.log(`   [DEBUG] Result subtype: ${message.subtype}`);
        console.log(`   [DEBUG] Errors: ${JSON.stringify((message as any).errors)}`);
        logImplementationFailure();
      }
    }
  }

  if (!implementationSucceeded && rawResult) {
    console.log(`   [DEBUG] Final raw result:\n${rawResult}`);
  }

  return implementationSucceeded;
}
