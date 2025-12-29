// scripts/agents/sentry-api.ts

import type { SentryIssue, MergedIssue } from "./types";

interface SentryEventEntry {
  type: string;
  data?: {
    values?: Array<{
      stacktrace?: {
        frames?: Array<{
          function?: string;
          filename?: string;
          lineNo?: number;
        }>;
      };
    }>;
  };
}

interface SentryEvent {
  entries?: SentryEventEntry[];
}

const SENTRY_AUTH_TOKEN = process.env.SENTRY_READ_TOKEN;
const ORG_SLUG = "bumgeun-song";
const PROJECT_SLUG = "daily-writing-friends";

function validateSentryToken(): void {
  if (!SENTRY_AUTH_TOKEN) {
    throw new Error(
      "[Sentry] SENTRY_READ_TOKEN is not set. Please configure it in environment variables or GitHub secrets."
    );
  }
}

function buildSentryApiHeaders(): HeadersInit {
  validateSentryToken();
  return { Authorization: `Bearer ${SENTRY_AUTH_TOKEN}` };
}

function buildUnresolvedIssuesUrl(): string {
  return `https://sentry.io/api/0/projects/${ORG_SLUG}/${PROJECT_SLUG}/issues/?query=is:unresolved&statsPeriod=24h`;
}

function buildLatestEventUrl(issueId: string): string {
  return `https://sentry.io/api/0/issues/${issueId}/events/latest/`;
}

export async function fetchUnresolvedIssuesFromLast24Hours(): Promise<SentryIssue[]> {
  const response = await fetch(buildUnresolvedIssuesUrl(), {
    headers: buildSentryApiHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Sentry API Error: ${response.status}`);
  }

  return response.json() as Promise<SentryIssue[]>;
}

function isApplicationFrame(frame: { filename?: string }): boolean {
  return Boolean(frame.filename && !frame.filename.includes("node_modules"));
}

function formatStackFrame(frame: {
  function?: string;
  filename?: string;
  lineNo?: number;
}): string {
  const functionName = frame.function || "anonymous";
  return `${functionName} (${frame.filename}:${frame.lineNo})`;
}

function extractApplicationFramesFromException(exceptionEntry: SentryEventEntry): string[] {
  const frames: string[] = [];

  const exceptionValues = exceptionEntry.data?.values || [];
  for (const exceptionValue of exceptionValues) {
    const stackFrames = exceptionValue.stacktrace?.frames || [];
    for (const frame of stackFrames) {
      if (isApplicationFrame(frame)) {
        frames.push(formatStackFrame(frame));
      }
    }
  }

  return frames;
}

function extractStackFramesFromEvent(event: SentryEvent): string[] {
  const frames: string[] = [];

  const entries = event.entries || [];
  for (const entry of entries) {
    if (entry.type === "exception") {
      frames.push(...extractApplicationFramesFromException(entry));
    }
  }

  return frames;
}

const MAX_STACK_FRAMES_TO_DISPLAY = 5;

export async function fetchStackTraceForIssue(issueId: string): Promise<string> {
  const response = await fetch(buildLatestEventUrl(issueId), {
    headers: buildSentryApiHeaders(),
  });

  if (!response.ok) {
    console.warn(`[Sentry] Failed to fetch stack trace for issue ${issueId}: ${response.status}`);
    return "";
  }

  const event = (await response.json()) as SentryEvent;
  const allFrames = extractStackFramesFromEvent(event);
  const recentFrames = allFrames.slice(-MAX_STACK_FRAMES_TO_DISPLAY);

  return recentFrames.length > 0 ? recentFrames.join("\n") : "No application frames";
}

function normalizeIdInPath(title: string): string {
  return title
    .replace(/users\/[^\s\/\)]+/g, "users/{id}")
    .replace(/boards\/[^\s\/\)]+/g, "boards/{id}")
    .replace(/posts\/[^\s\/\)]+/g, "posts/{id}")
    .replace(/drafts\/[^\s\/\)]+/g, "drafts/{id}");
}

function normalizeUuidsAndLongIds(title: string): string {
  return title
    .replace(/[a-f0-9-]{36}/gi, "{uuid}")
    .replace(/[a-zA-Z0-9]{20,}/g, "{id}");
}

const MAX_PATTERN_LENGTH = 100;

export function extractErrorPatternFromTitle(title: string): string {
  const normalizedPath = normalizeIdInPath(title);
  const normalizedIds = normalizeUuidsAndLongIds(normalizedPath);
  return normalizedIds.substring(0, MAX_PATTERN_LENGTH);
}

function groupIssuesByPattern(issues: SentryIssue[]): Map<string, SentryIssue[]> {
  const groups = new Map<string, SentryIssue[]>();

  for (const issue of issues) {
    const pattern = extractErrorPatternFromTitle(issue.title);
    const existingGroup = groups.get(pattern) || [];
    existingGroup.push(issue);
    groups.set(pattern, existingGroup);
  }

  return groups;
}

function calculateTotalEvents(issues: SentryIssue[]): number {
  return issues.reduce((sum, issue) => sum + issue.count, 0);
}

function calculateTotalUsers(issues: SentryIssue[]): number {
  return issues.reduce((sum, issue) => sum + issue.userCount, 0);
}

function createMergedIssue(pattern: string, issues: SentryIssue[]): MergedIssue {
  return {
    pattern,
    issues,
    totalEvents: calculateTotalEvents(issues),
    totalUsers: calculateTotalUsers(issues),
    representativeIssue: issues[0],
  };
}

function sortByTotalEventsDescending(mergedIssues: MergedIssue[]): MergedIssue[] {
  return mergedIssues.sort((a, b) => b.totalEvents - a.totalEvents);
}

export function groupAndMergeIssuesByPattern(issues: SentryIssue[]): MergedIssue[] {
  const groupedByPattern = groupIssuesByPattern(issues);

  const mergedIssues: MergedIssue[] = [];
  for (const [pattern, groupedIssues] of groupedByPattern) {
    mergedIssues.push(createMergedIssue(pattern, groupedIssues));
  }

  return sortByTotalEventsDescending(mergedIssues);
}
