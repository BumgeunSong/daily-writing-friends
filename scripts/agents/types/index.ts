// scripts/agents/types/index.ts

export interface SentryIssue {
  id: string;
  title: string;
  level: string;
  count: number;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  permalink: string;
}

export interface MergedIssue {
  pattern: string;
  issues: SentryIssue[];
  totalEvents: number;
  totalUsers: number;
  representativeIssue: SentryIssue;
}

export interface ErrorContext {
  errorType: string;
  errorMessage: string;
  occurrences: number;
  usersAffected: number;
  stackSummary: string;
  sentryLink: string;
}

export type AnalysisPriority = "high" | "medium" | "low" | "skip";

export interface AnalysisResult {
  context: ErrorContext;
  shouldFix: boolean;
  priority: AnalysisPriority;
  reason: string;
  rootCause?: string;
  suggestedApproach?: string;
}

export type PlanStepAction = "modify" | "create" | "delete";

export interface PlanStep {
  step: number;
  description: string;
  files: string[];
  action: PlanStepAction;
}

export interface ImplementationPlan {
  /** English summary for coding agent */
  summaryEn: string;
  /** Korean summary for PR title and description */
  summaryKo: string;
  steps: PlanStep[];
}

export interface ReviewChecks {
  unitTests: boolean;
  typeCheck: boolean;
  lint: boolean;
  build: boolean;
}

export interface ReviewResult {
  approved: boolean;
  checks: ReviewChecks;
  issues: string[];
  suggestions: string[];
}
