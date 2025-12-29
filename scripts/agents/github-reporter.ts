// scripts/agents/github-reporter.ts

import { Octokit } from "@octokit/rest";
import { execSync } from "child_process";
import type { AnalysisResult, ImplementationPlan } from "./types";
import type { TokenUsage } from "./token-tracker";
import { GITHUB_CONFIG } from "./config";

function getOctokit(): Octokit | null {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  return new Octokit({ auth: token });
}

function getIssueNumber(): number | null {
  const issueNumber = process.env.ISSUE_NUMBER;
  if (!issueNumber) return null;
  return parseInt(issueNumber, 10);
}

function isRunningInCI(): boolean {
  return Boolean(process.env.GITHUB_ACTIONS);
}

function formatTokenUsage(usage: TokenUsage): string {
  const formatCount = (count: number) =>
    count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count.toString();
  return `${formatCount(usage.inputTokens)} input / ${formatCount(usage.outputTokens)} output`;
}

export async function commentOnIssue(message: string): Promise<void> {
  if (!isRunningInCI()) {
    console.log(`[GitHub Comment]\n${message}`);
    return;
  }

  const octokit = getOctokit();
  const issueNumber = getIssueNumber();

  if (!octokit || !issueNumber) {
    console.log(`[GitHub Comment - Missing credentials]\n${message}`);
    return;
  }

  try {
    await octokit.issues.createComment({
      owner: GITHUB_CONFIG.owner,
      repo: GITHUB_CONFIG.repo,
      issue_number: issueNumber,
      body: message,
    });
    console.log(`[GitHub] Commented on issue #${issueNumber}`);
  } catch (error) {
    console.error(`[GitHub] Failed to comment:`, error);
    console.log(`[Fallback Comment]\n${message}`);
  }
}

export async function reportAnalysisResult(
  analyses: AnalysisResult[],
  tokenUsage?: TokenUsage
): Promise<void> {
  const fixable = analyses.filter((a) => a.shouldFix);
  const skipped = analyses.filter((a) => !a.shouldFix);

  const priorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return "HIGH";
      case "medium":
        return "MEDIUM";
      case "low":
        return "LOW";
      default:
        return "SKIP";
    }
  };

  const fixableLines = fixable.map(
    (a) =>
      `- [${priorityIcon(a.priority)}] ${a.context.errorMessage.substring(0, 60)}`
  );
  const skippedLines = skipped.map(
    (a) => `- [SKIP] ${a.context.errorMessage.substring(0, 60)} - ${a.reason}`
  );

  const target = fixable[0];
  const targetLine = target
    ? `\n**Targeting:** ${target.context.errorMessage.substring(0, 80)}`
    : "";

  const tokenLine = tokenUsage
    ? `\n\n_Token usage: ${formatTokenUsage(tokenUsage)}_`
    : "";

  const message = `## Analysis Result

Found ${analyses.length} errors, ${fixable.length} fixable:

${[...fixableLines, ...skippedLines].join("\n")}${targetLine}${tokenLine}`;

  await commentOnIssue(message);
}

export async function reportPlanResult(
  plan: ImplementationPlan,
  tokenUsage?: TokenUsage
): Promise<void> {
  const stepsLines = plan.steps.map(
    (s) => `${s.step}. ${s.description} (${s.files.join(", ")})`
  );

  const tokenLine = tokenUsage
    ? `\n\n_Token usage: ${formatTokenUsage(tokenUsage)}_`
    : "";

  const message = `## Fix Plan

**Summary:** ${plan.summary}

**Steps:**
${stepsLines.join("\n")}${tokenLine}`;

  await commentOnIssue(message);
}

export async function reportError(
  stage: string,
  error: unknown,
  tokenUsage?: TokenUsage
): Promise<void> {
  const errorMessage =
    error instanceof Error ? error.message : String(error);
  const errorStack =
    error instanceof Error ? error.stack?.substring(0, 500) : "";

  const tokenLine = tokenUsage
    ? `\n\n_Token usage so far: ${formatTokenUsage(tokenUsage)}_`
    : "";

  const message = `## Pipeline Error

**Stage:** ${stage}
**Error:** ${errorMessage}

<details>
<summary>Details</summary>

\`\`\`
${errorStack}
\`\`\`
</details>${tokenLine}`;

  await commentOnIssue(message);
}

export async function reportSuccess(
  prUrl: string,
  changedFiles: string[],
  totalTokenUsage?: TokenUsage
): Promise<void> {
  const filesLines = changedFiles.map((f) => `- ${f}`).join("\n");

  const tokenLine = totalTokenUsage
    ? `\n\n_Total token usage: ${formatTokenUsage(totalTokenUsage)}_`
    : "";

  const message = `## Fix Ready!

**Created PR:** ${prUrl}

**Changed files:**
${filesLines}${tokenLine}`;

  await commentOnIssue(message);
}

function generateBranchName(errorMessage: string): string {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const sanitized = errorMessage
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .substring(0, 30)
    .replace(/-+$/, "");
  return `fix/sentry-${timestamp}-${sanitized}`;
}

function escapeForShell(str: string): string {
  return str.replace(/'/g, "'\\''");
}

function hasUncommittedChanges(): boolean {
  try {
    const status = execSync("git status --porcelain", { encoding: "utf-8" });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

function getCurrentBranch(): string {
  try {
    return execSync("git branch --show-current", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

export function createBranchAndCommit(
  errorMessage: string,
  summary: string
): string {
  const branchName = generateBranchName(errorMessage);
  const originalBranch = getCurrentBranch();

  // Pre-check: Ensure we have changes to commit
  if (!hasUncommittedChanges()) {
    throw new Error("[Git] No changes to commit. Coder may not have made any modifications.");
  }

  try {
    // Create and switch to new branch
    console.log(`[Git] Creating branch: ${branchName}`);
    execSync(`git checkout -b ${branchName}`, { stdio: "pipe" });

    // Stage all changes
    execSync("git add -A", { stdio: "pipe" });

    // Commit with properly escaped message (using single quotes)
    const escapedSummary = escapeForShell(summary);
    const commitMessage = `fix: ${escapedSummary}`;
    execSync(`git commit -m '${commitMessage}'`, { stdio: "pipe" });

    // Push to remote
    console.log(`[Git] Pushing to origin...`);
    execSync(`git push -u origin ${branchName}`, { stdio: "pipe" });

    console.log(`[Git] Created and pushed branch: ${branchName}`);
    return branchName;
  } catch (error) {
    // Attempt to restore original branch on failure
    try {
      execSync(`git checkout ${originalBranch}`, { stdio: "pipe" });
    } catch {
      // Ignore cleanup errors
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Git] Failed to create branch: ${errorMsg}`);
    throw new Error(`Git operation failed: ${errorMsg}`);
  }
}

export async function createPullRequest(
  branchName: string,
  title: string,
  body: string
): Promise<string> {
  const octokit = getOctokit();

  if (!octokit) {
    console.log(`[GitHub PR - No token] Would create PR: ${title}`);
    return `https://github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/compare/${branchName}?expand=1`;
  }

  try {
    const response = await octokit.pulls.create({
      owner: GITHUB_CONFIG.owner,
      repo: GITHUB_CONFIG.repo,
      title,
      body,
      head: branchName,
      base: "main",
    });

    console.log(`[GitHub] Created PR #${response.data.number}`);
    return response.data.html_url;
  } catch (error) {
    console.error(`[GitHub] Failed to create PR:`, error);
    throw error;
  }
}

export function getChangedFiles(): string[] {
  try {
    const output = execSync("git diff --name-only HEAD~1", {
      encoding: "utf-8",
    });
    return output.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

export async function createPullRequestWithChanges(
  analysis: AnalysisResult,
  plan: ImplementationPlan
): Promise<string> {
  const branchName = createBranchAndCommit(
    analysis.context.errorMessage,
    plan.summary
  );

  const issueNumber = getIssueNumber();
  const issueRef = issueNumber ? `\n\nCloses #${issueNumber}` : "";

  const body = `## Summary
${plan.summary}

## Changes
${plan.steps.map((s) => `- ${s.description}`).join("\n")}

## Sentry Issue
${analysis.context.sentryLink}${issueRef}

---
_Automated fix by Sentry Bug Fix Pipeline_`;

  const prUrl = await createPullRequest(
    branchName,
    `fix: ${plan.summary}`,
    body
  );

  return prUrl;
}
