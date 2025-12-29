// scripts/agents/error-analyzer.ts

import { query } from "@anthropic-ai/claude-agent-sdk";
import "dotenv/config";

const SENTRY_AUTH_TOKEN = process.env.SENTRY_READ_TOKEN;
const ORG_SLUG = "bumgeun-song";
const PROJECT_SLUG = "daily-writing-friends";

// ============================================
// Types
// ============================================

interface SentryIssue {
  id: string;
  title: string;
  level: string;
  count: number;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  permalink: string;
}

interface MergedIssue {
  pattern: string;
  issues: SentryIssue[];
  totalEvents: number;
  totalUsers: number;
  representativeIssue: SentryIssue;
}

interface MinimalErrorContext {
  errorType: string;
  errorMessage: string;
  occurrences: number;
  usersAffected: number;
  isRecurring: boolean;
  stackSummary: string;
  sentryLink: string;
}

interface AnalysisResult {
  context: MinimalErrorContext;
  shouldFix: boolean;
  priority: "high" | "medium" | "low" | "skip";
  reason: string;
  rootCause?: string;
  suggestedApproach?: string;
}

// ============================================
// Sentry API
// ============================================

async function fetchRecentErrors(): Promise<SentryIssue[]> {
  const response = await fetch(
    `https://sentry.io/api/0/projects/${ORG_SLUG}/${PROJECT_SLUG}/issues/?query=is:unresolved&statsPeriod=24h`,
    {
      headers: { Authorization: `Bearer ${SENTRY_AUTH_TOKEN}` },
    }
  );

  if (!response.ok) throw new Error(`Sentry API Error: ${response.status}`);
  return response.json();
}

async function fetchStackTrace(issueId: string): Promise<string> {
  const response = await fetch(
    `https://sentry.io/api/0/issues/${issueId}/events/latest/`,
    {
      headers: { Authorization: `Bearer ${SENTRY_AUTH_TOKEN}` },
    }
  );

  if (!response.ok) return "";

  const event = await response.json();
  let frames: string[] = [];

  if (event.entries) {
    for (const entry of event.entries) {
      if (entry.type === "exception") {
        for (const value of entry.data.values || []) {
          if (value.stacktrace?.frames) {
            for (const frame of value.stacktrace.frames) {
              if (frame.filename && !frame.filename.includes("node_modules")) {
                frames.push(`${frame.function || "anonymous"} (${frame.filename}:${frame.lineNo})`);
              }
            }
          }
        }
      }
    }
  }

  return frames.slice(-5).join("\n") || "No application frames";
}

// ============================================
// Issue Grouping
// ============================================

function extractErrorPattern(title: string): string {
  return title
    .replace(/users\/[^\s\/\)]+/g, "users/{id}")
    .replace(/boards\/[^\s\/\)]+/g, "boards/{id}")
    .replace(/posts\/[^\s\/\)]+/g, "posts/{id}")
    .replace(/drafts\/[^\s\/\)]+/g, "drafts/{id}")
    .replace(/[a-f0-9-]{36}/gi, "{uuid}")
    .replace(/[a-zA-Z0-9]{20,}/g, "{id}")
    .substring(0, 100);
}

function groupAndMergeIssues(issues: SentryIssue[]): MergedIssue[] {
  const groups = new Map<string, SentryIssue[]>();

  for (const issue of issues) {
    const pattern = extractErrorPattern(issue.title);
    if (!groups.has(pattern)) groups.set(pattern, []);
    groups.get(pattern)!.push(issue);
  }

  const merged: MergedIssue[] = [];
  for (const [pattern, groupIssues] of groups) {
    merged.push({
      pattern,
      issues: groupIssues,
      totalEvents: groupIssues.reduce((sum, i) => sum + i.count, 0),
      totalUsers: groupIssues.reduce((sum, i) => sum + i.userCount, 0),
      representativeIssue: groupIssues[0],
    });
  }

  return merged.sort((a, b) => b.totalEvents - a.totalEvents);
}

function buildMinimalContext(merged: MergedIssue, stackTrace: string): MinimalErrorContext {
  const issue = merged.representativeIssue;
  const firstSeen = new Date(issue.firstSeen);
  const isRecurring = Date.now() - firstSeen.getTime() > 7 * 24 * 60 * 60 * 1000;

  return {
    errorType: issue.title.split(":")[0].replace("Error", "").trim() || "Error",
    errorMessage: issue.title.substring(0, 150),
    occurrences: merged.totalEvents,
    usersAffected: merged.totalUsers,
    isRecurring,
    stackSummary: stackTrace,
    sentryLink: issue.permalink,
  };
}

// ============================================
// Analyzer Agent
// ============================================

async function analyzeError(context: MinimalErrorContext): Promise<AnalysisResult> {
  console.log(`\n🔍 Analyzing: ${context.errorMessage.substring(0, 50)}...`);

  const result: AnalysisResult = {
    context,
    shouldFix: false,
    priority: "skip",
    reason: "",
  };

  // Minimal prompt with only essential info
  const prompt = `Analyze this error. Should we fix it with code changes?

ERROR: ${context.errorType}
MESSAGE: ${context.errorMessage}
OCCURRENCES: ${context.occurrences}
USERS: ${context.usersAffected}
RECURRING: ${context.isRecurring ? "Yes (>7 days)" : "No (recent)"}
STACK (app code only):
${context.stackSummary}

RULES:
- Only fix if it's a CODE BUG (not network/infra/browser issues)
- Skip timeout errors, connection lost, quota exceeded
- Fix null/undefined errors, logic bugs, missing error handling

Reply JSON only:
{"shouldFix":bool,"priority":"high|medium|low|skip","reason":"1 sentence","rootCause":"if fixable","approach":"if fixable"}`;

  for await (const message of query({
    prompt,
    options: {
      allowedTools: [],
      maxTurns: 1,
    },
  })) {
    if (message.type === "result" && message.subtype === "success") {
      try {
        const jsonMatch = message.result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          result.shouldFix = analysis.shouldFix;
          result.priority = analysis.priority;
          result.reason = analysis.reason;
          result.rootCause = analysis.rootCause;
          result.suggestedApproach = analysis.approach;
        }
      } catch {
        result.reason = "Failed to parse analysis";
      }
    }
  }

  return result;
}

// ============================================
// Main
// ============================================

async function main() {
  console.log("🚀 Error Analyzer Pipeline\n");

  // 1. Fetch & group issues
  console.log("📥 Fetching Sentry errors...");
  const issues = await fetchRecentErrors();
  const merged = groupAndMergeIssues(issues);
  
  console.log(`   Found ${issues.length} issues → Grouped into ${merged.length} patterns\n`);

  // 2. Analyze top 5 merged groups (saves tokens!)
  const analyses: AnalysisResult[] = [];
  
  for (const group of merged.slice(0, 5)) {
    const stackTrace = await fetchStackTrace(group.representativeIssue.id);
    const context = buildMinimalContext(group, stackTrace);
    const result = await analyzeError(context);
    analyses.push(result);
  }

  // 3. Report
  console.log("\n" + "=".repeat(60));
  console.log("📊 RESULTS");
  console.log("=".repeat(60));

  const fixable = analyses.filter((a) => a.shouldFix);
  const skipped = analyses.filter((a) => !a.shouldFix);

  console.log(`\n✅ To Fix: ${fixable.length} | ⏭️ Skip: ${skipped.length}`);

  if (fixable.length > 0) {
    console.log("\n🔧 RECOMMENDED FIXES:");
    for (const a of fixable) {
      console.log(`\n[${a.priority.toUpperCase()}] ${a.context.errorMessage.substring(0, 60)}`);
      console.log(`   Events: ${a.context.occurrences} | Users: ${a.context.usersAffected}`);
      console.log(`   Reason: ${a.reason}`);
      if (a.rootCause) console.log(`   Root cause: ${a.rootCause}`);
      if (a.suggestedApproach) console.log(`   Approach: ${a.suggestedApproach}`);
      console.log(`   Link: ${a.context.sentryLink}`);
    }
  }

  if (skipped.length > 0) {
    console.log("\n⏭️ SKIPPED:");
    for (const a of skipped) {
      console.log(`   - ${a.context.errorMessage.substring(0, 50)}... (${a.reason})`);
    }
  }

  return fixable;
}

main().catch(console.error);