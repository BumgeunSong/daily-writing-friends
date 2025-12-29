// scripts/agents/bug-fix-pipeline.ts

import "dotenv/config";
import type {
  ErrorContext,
  AnalysisResult,
  ImplementationPlan,
  MergedIssue,
  ReviewResult,
  AnalysisPriority,
} from "./types";
import {
  fetchUnresolvedIssuesFromLast24Hours,
  fetchStackTraceForIssue,
  groupAndMergeIssuesByPattern,
} from "./sentry-api";
import {
  analyzeErrorAndDeterminePriority,
  createImplementationPlan,
  implementFixFromPlan,
  reviewImplementedChanges,
} from "./agents";
import {
  readCache,
  writeCache,
  clearTodayCache,
  hasFreshFlag,
} from "./cache-utils";
import { PIPELINE_CONFIG } from "./config";

// ============================================
// Pipeline Logging
// ============================================

function logPipelineHeader(useCache: boolean): void {
  console.log("🚀 Bug Fix Pipeline");
  console.log("=".repeat(60));
  console.log("Stages: ANALYZER → PLANNER → CODER → REVIEWER");
  console.log("Max revision rounds:", PIPELINE_CONFIG.maxRevisionRounds);
  console.log("Cache:", useCache ? "enabled" : "disabled (--fresh)");
  console.log("=".repeat(60));
}

function logFetchingErrors(): void {
  console.log("\n📥 Fetching Sentry errors...");
}

function logIssueGroupingResult(totalIssues: number, patternCount: number): void {
  console.log(`   ${totalIssues} issues → ${patternCount} patterns`);
}

function logFixableIssuesCount(fixable: number, skipped: number): void {
  console.log(`\n✅ Fixable: ${fixable} | Skipped: ${skipped}`);
}

function logNoIssuesNeedFixing(): void {
  console.log("\n🎉 No issues need fixing. Pipeline complete.");
}

function logTargetSelection(analysis: AnalysisResult): void {
  const truncatedMessage = analysis.context.errorMessage.substring(0, 50);
  console.log("\n" + "=".repeat(60));
  console.log(`🎯 TARGET: ${truncatedMessage}`);
  console.log(`   Priority: ${analysis.priority}`);
  console.log(`   Root cause: ${analysis.rootCause}`);
  console.log("=".repeat(60));
}

function logPlanCreated(plan: ImplementationPlan): void {
  console.log("\n📋 Plan created:");
  console.log(`   Summary: ${plan.summary}`);
  for (const step of plan.steps) {
    console.log(`   ${step.step}. ${step.description}`);
  }
}

function logPlannerFailed(): void {
  console.log("❌ Planner failed to create plan. Exiting.");
}

function logRoundStart(round: number, maxRounds: number): void {
  console.log("\n" + "─".repeat(60));
  console.log(`📍 Round ${round}/${maxRounds}`);
  console.log("─".repeat(60));
}

function logCoderFailed(): void {
  console.log("❌ Coder failed. Exiting.");
}

function logReviewResult(review: ReviewResult): void {
  const approvalText = review.approved ? "✅ YES" : "❌ NO";
  const typeCheckIcon = review.checks.typeCheck ? "✅" : "❌";
  const lintIcon = review.checks.lint ? "✅" : "❌";
  const testIcon = review.checks.unitTests ? "✅" : "❌";
  const buildIcon = review.checks.build ? "✅" : "❌";

  console.log("\n📊 Review Result:");
  console.log(`   Approved: ${approvalText}`);
  console.log(`   Checks: Type ${typeCheckIcon} | Lint ${lintIcon} | Test ${testIcon} | Build ${buildIcon}`);

  if (review.issues.length > 0) {
    console.log(`   Issues:`);
    review.issues.forEach((issue) => console.log(`     - ${issue}`));
  }
  if (review.suggestions.length > 0) {
    console.log(`   Suggestions:`);
    review.suggestions.forEach((suggestion) => console.log(`     - ${suggestion}`));
  }
}

function logReviewPassed(): void {
  console.log("\n✅ Review PASSED!");
}

function logMaxRevisionsReached(): void {
  console.log("\n❌ Max revision rounds reached. Stopping.");
}

function logSendingFeedbackToCoder(): void {
  console.log("\n🔄 Sending feedback to Coder for revision...");
}

function logPipelineComplete(analysis: AnalysisResult, approved: boolean): void {
  const approvalText = approved ? "✅ APPROVED" : "❌ NOT APPROVED";
  const truncatedMessage = analysis.context.errorMessage.substring(0, 50);

  console.log("\n" + "=".repeat(60));
  console.log("📊 PIPELINE COMPLETE");
  console.log("=".repeat(60));
  console.log(`   Target: ${truncatedMessage}`);
  console.log(`   Result: ${approvalText}`);
  console.log(`   Sentry: ${analysis.context.sentryLink}`);

  if (approved) {
    console.log("\n🎉 Ready for Pull Request!");
    console.log("   Next step: PULL REQUESTER (not implemented yet)");
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
// Analysis Filtering
// ============================================

const PRIORITY_ORDER: Record<AnalysisPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
  skip: 3,
};

function sortAnalysesByPriority(analyses: AnalysisResult[]): AnalysisResult[] {
  return analyses.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

function filterFixableAnalyses(analyses: AnalysisResult[]): AnalysisResult[] {
  const fixable = analyses.filter((analysis) => analysis.shouldFix);
  return sortAnalysesByPriority(fixable);
}

function selectHighestPriorityTarget(fixableAnalyses: AnalysisResult[]): AnalysisResult {
  return fixableAnalyses[0];
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

async function analyzeTopIssues(mergedIssues: MergedIssue[]): Promise<AnalysisResult[]> {
  // Try to load from cache first
  const cachedAnalyses = readCache<AnalysisResult[]>("analyzer");
  if (cachedAnalyses) {
    console.log(`   [CACHE] Using ${cachedAnalyses.length} cached analysis results`);
    return cachedAnalyses;
  }

  const analyses: AnalysisResult[] = [];
  const issuesToAnalyze = mergedIssues.slice(0, PIPELINE_CONFIG.maxIssuesToAnalyze);

  for (const mergedIssue of issuesToAnalyze) {
    const stackTrace = await fetchStackTraceForIssue(mergedIssue.representativeIssue.id);
    const errorContext = buildErrorContextFromMergedIssue(mergedIssue, stackTrace);
    const analysis = await analyzeErrorAndDeterminePriority(errorContext);
    analyses.push(analysis);
  }

  // Save to cache
  writeCache("analyzer", analyses);

  return analyses;
}

interface CoderCacheEntry {
  round: number;
  succeeded: boolean;
  review: ReviewResult | null;
}

async function executeCodeReviewLoop(
  target: AnalysisResult,
  plan: ImplementationPlan
): Promise<boolean> {
  // Check for cached coder result
  const cachedCoder = readCache<CoderCacheEntry>("coder");
  let startRound = 1;
  let reviewFeedback: string | undefined;

  if (cachedCoder && cachedCoder.review && !cachedCoder.review.approved) {
    // Resume from cached round
    startRound = cachedCoder.round + 1;
    reviewFeedback = cachedCoder.review.issues.join("\n");
    console.log(`   [CACHE] Resuming from round ${startRound}`);
  }

  const totalRounds = PIPELINE_CONFIG.maxRevisionRounds + 1;

  for (let round = startRound; round <= totalRounds; round++) {
    logRoundStart(round, totalRounds);

    const coderSucceeded = await implementFixFromPlan(target, plan, reviewFeedback);
    if (!coderSucceeded) {
      logCoderFailed();
      writeCache("coder", { round, succeeded: false, review: null });
      return false;
    }

    const review = await reviewImplementedChanges(target);
    logReviewResult(review);

    // Cache the coder result
    writeCache("coder", { round, succeeded: true, review });

    if (review.approved) {
      logReviewPassed();
      return true;
    }

    const isLastRound = round > PIPELINE_CONFIG.maxRevisionRounds;
    if (isLastRound) {
      logMaxRevisionsReached();
      return false;
    }

    reviewFeedback = review.issues.join("\n");
    logSendingFeedbackToCoder();
  }

  return false;
}

// ============================================
// Main Pipeline
// ============================================

interface PipelineResult {
  target: AnalysisResult;
  plan: ImplementationPlan;
  approved: boolean;
}

interface CachedPlannerResult {
  target: AnalysisResult;
  plan: ImplementationPlan;
}

async function getOrCreatePlan(
  fixableAnalyses: AnalysisResult[]
): Promise<CachedPlannerResult | null> {
  // Try to load from cache first
  const cachedPlanner = readCache<CachedPlannerResult>("planner");
  if (cachedPlanner) {
    console.log(`   [CACHE] Using cached planner result`);
    return cachedPlanner;
  }

  const target = selectHighestPriorityTarget(fixableAnalyses);
  logTargetSelection(target);

  const plan = await createImplementationPlan(target);
  if (!plan) {
    return null;
  }

  const result = { target, plan };
  writeCache("planner", result);
  return result;
}

async function runBugFixPipeline(): Promise<PipelineResult | undefined> {
  const useCache = !hasFreshFlag();

  // Clear cache if --fresh flag is set
  if (!useCache) {
    clearTodayCache();
  }

  logPipelineHeader(useCache);

  const mergedIssues = await fetchAndGroupSentryIssues();
  const analyses = await analyzeTopIssues(mergedIssues);

  const fixableAnalyses = filterFixableAnalyses(analyses);
  const skippedCount = analyses.length - fixableAnalyses.length;
  logFixableIssuesCount(fixableAnalyses.length, skippedCount);

  if (fixableAnalyses.length === 0) {
    logNoIssuesNeedFixing();
    return;
  }

  const plannerResult = await getOrCreatePlan(fixableAnalyses);
  if (!plannerResult) {
    logPlannerFailed();
    return;
  }

  const { target, plan } = plannerResult;
  logPlanCreated(plan);

  const approved = await executeCodeReviewLoop(target, plan);
  logPipelineComplete(target, approved);

  // Cache the final result
  writeCache("reviewer", { target, plan, approved });

  return { target, plan, approved };
}

runBugFixPipeline().catch(console.error);
