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

function logToolUse(toolName: string, filePath: string): void {
  console.log(`   ✏️  ${toolName}: ${filePath}`);
}

function logTextOutput(text: string): void {
  const truncatedText = text.substring(0, 100);
  console.log(`   ${truncatedText}...`);
}

function logImplementationSuccess(): void {
  console.log(`   ✅ Implementation complete`);
}

function logImplementationFailure(): void {
  console.log(`   ❌ Implementation failed`);
}

interface ContentBlock {
  type: string;
  text?: string;
  name?: string;
  input?: { file_path?: string };
}

function isFileModificationTool(toolName: string): boolean {
  return toolName === "Edit" || toolName === "Write";
}

function processAssistantMessage(content: ContentBlock[]): void {
  for (const block of content) {
    if (block.type === "text" && block.text) {
      logTextOutput(block.text);
    } else if (block.type === "tool_use" && block.name) {
      if (isFileModificationTool(block.name)) {
        const filePath = block.input?.file_path || "file";
        logToolUse(block.name, filePath);
      }
    }
  }
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

  for await (const message of query({
    prompt,
    options: {
      allowedTools: CODER_ALLOWED_TOOLS,
      maxTurns: CODER_MAX_TURNS,
    },
  })) {
    if (message.type === "assistant") {
      processAssistantMessage(message.message.content as ContentBlock[]);
    } else if (message.type === "result") {
      implementationSucceeded = message.subtype === "success";
      if (implementationSucceeded) {
        logImplementationSuccess();
      } else {
        logImplementationFailure();
      }
    }
  }

  return implementationSucceeded;
}
