// scripts/agents/single-agent-pipeline.ts

import "dotenv/config";

// ============================================
// Environment Validation
// ============================================

const REQUIRED_ENV_VARS = ["ANTHROPIC_API_KEY", "SENTRY_READ_TOKEN"] as const;

function validateEnvironment(): void {
  const missing: string[] = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((v) => console.error(`   - ${v}`));
    console.error("\nSet these in .env file or CI secrets.");
    process.exit(1);
  }
}

validateEnvironment();

import type {
  ErrorContext,
  AnalysisResult,
  ImplementationPlan,
  MergedIssue,
  ReviewChecks,
} from "./types";
import {
  fetchUnresolvedIssuesFromLast24Hours,
  fetchStackTraceForIssue,
  groupAndMergeIssuesByPattern,
} from "./sentry-api";
import { runSingleAgentFix } from "./agents/single-agent";
import { PIPELINE_CONFIG } from "./config";
import {
  reportAnalysisResult,
  reportPlanResult,
  reportError,
  reportSuccess,
  createPullRequestWithChanges,
  getChangedFiles,
} from "./github-reporter";
import { globalTokenTracker } from "./token-tracker";

// ============================================
// Pipeline Logging
// ============================================

function logPipelineHeader(): void {
  console.log("🤖 Single-Agent Bug Fix Pipeline");
  console.log("=".repeat(60));
  console.log("Mode: SINGLE AGENT (analyze → plan → code → verify)");
  console.log("Revision: No (single pass)");
  console.log("=".repeat(60));
}

function logFetchingErrors(): void {
  console.log("\n📥 Fetching Sentry errors...");
}

function logIssueGroupingResult(totalIssues: number, patternCount: number): void {
  console.log(`   ${totalIssues} issues → ${patternCount} patterns`);
}

function logNoIssuesFound(): void {
  console.log("\n🎉 No issues found. Pipeline complete.");
}

function logTargetSelection(context: ErrorContext): void {
  const truncatedMessage = context.errorMessage.substring(0, 50);
  console.log("\n" + "=".repeat(60));
  console.log(`🎯 TARGET: ${truncatedMessage}`);
  console.log(`   Occurrences: ${context.occurrences}`);
  console.log(`   Users affected: ${context.usersAffected}`);
  console.log("=".repeat(60));
}

function logVerificationResult(checks: ReviewChecks): void {
  const typeCheckIcon = checks.typeCheck ? "✅" : "❌";
  const lintIcon = checks.lint ? "✅" : "❌";
  const testIcon = checks.unitTests ? "✅" : "❌";
  const buildIcon = checks.build ? "✅" : "❌";

  console.log("\n📊 Verification Result:");
  console.log(`   Type ${typeCheckIcon} | Lint ${lintIcon} | Test ${testIcon} | Build ${buildIcon}`);
}

function logPipelineComplete(success: boolean): void {
  const resultText = success ? "✅ SUCCESS" : "❌ FAILED";

  console.log("\n" + "=".repeat(60));
  console.log("📊 PIPELINE COMPLETE");
  console.log("=".repeat(60));
  console.log(`   Result: ${resultText}`);

  const tokenUsage = globalTokenTracker.getTotal();
  console.log(`   Token usage: ${tokenUsage.inputTokens} input / ${tokenUsage.outputTokens} output`);

  if (success) {
    console.log("\n🎉 Ready for Pull Request!");
  }
}

// ============================================
// Context Building
// ============================================

function buildErrorContextFromMergedIssue(
  mergedIssue: MergedIssue,
  stackTrace: string
): ErrorContext {
  const representativeIssue = mergedIssue.representativeIssue;
  const errorType = representativeIssue.title.split(":")[0].trim();
  const errorMessage = representativeIssue.title.substring(0, 150);

  return {
    errorType,
    errorMessage,
    occurrences: mergedIssue.totalEvents,
    usersAffected: mergedIssue.totalUsers,
    stackSummary: stackTrace,
    sentryLink: representativeIssue.permalink,
  };
}

// ============================================
// Pipeline Stages
// ============================================

async function fetchAndGroupSentryIssues(): Promise<MergedIssue[]> {
  logFetchingErrors();
  const issues = await fetchUnresolvedIssuesFromLast24Hours();
  const mergedIssues = groupAndMergeIssuesByPattern(issues);
  logIssueGroupingResult(issues.length, mergedIssues.length);
  return mergedIssues;
}

async function selectTopIssueContext(mergedIssues: MergedIssue[]): Promise<ErrorContext | null> {
  if (mergedIssues.length === 0) {
    return null;
  }

  // Select the top issue (same logic as multi-agent: first by occurrence)
  const topIssue = mergedIssues[0];
  const stackTrace = await fetchStackTraceForIssue(topIssue.representativeIssue.id);
  return buildErrorContextFromMergedIssue(topIssue, stackTrace);
}

// ============================================
// Main Pipeline
// ============================================

interface SingleAgentPipelineResult {
  analysisResult: AnalysisResult;
  plan: ImplementationPlan | null;
  checks: ReviewChecks;
  success: boolean;
}

async function runSingleAgentPipeline(): Promise<SingleAgentPipelineResult | undefined> {
  logPipelineHeader();

  const startTime = Date.now();

  try {
    // Fetch and group Sentry issues
    const mergedIssues = await fetchAndGroupSentryIssues();

    // Select top issue
    const targetContext = await selectTopIssueContext(mergedIssues);
    if (!targetContext) {
      logNoIssuesFound();
      return;
    }

    logTargetSelection(targetContext);

    // Run single agent fix
    const result = await runSingleAgentFix(targetContext);

    // Report analysis result
    await reportAnalysisResult(
      [result.analysisResult],
      globalTokenTracker.getTotal(),
      "single-agent"
    );

    // If not fixable, exit
    if (!result.analysisResult.shouldFix) {
      console.log(`\n⏭️ Skipping: ${result.analysisResult.reason}`);
      logPipelineComplete(false);
      return result;
    }

    // Report plan if exists
    if (result.plan) {
      await reportPlanResult(
        result.plan,
        globalTokenTracker.getTotal(),
        "single-agent"
      );
    }

    // Log verification result
    logVerificationResult(result.checks);

    // Calculate elapsed time
    const elapsedMs = Date.now() - startTime;
    const elapsedMin = (elapsedMs / 60000).toFixed(1);

    // Log completion
    logPipelineComplete(result.success);
    console.log(`   Elapsed time: ${elapsedMin} minutes`);

    // Create PR if successful
    if (result.success && result.plan) {
      const prUrl = await createPullRequestWithChanges(
        result.analysisResult,
        result.plan,
        "single-agent"
      );
      const changedFiles = getChangedFiles();
      await reportSuccess(
        prUrl,
        changedFiles,
        globalTokenTracker.getTotal(),
        "single-agent"
      );
    }

    return result;
  } catch (error) {
    await reportError(
      "SingleAgentPipeline",
      error,
      globalTokenTracker.getTotal(),
      "single-agent"
    );
    throw error;
  }
}

runSingleAgentPipeline().catch(console.error);
