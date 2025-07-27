import { Contribution } from "@/stats/model/WritingStats"
import { CommentingContribution } from '@/stats/utils/commentingContributionUtils'

// Constants for grid layout
const WEEKS_TO_DISPLAY = 4
const WEEKDAYS_COUNT = 5  // Mon-Fri only
const DAYS_PER_WEEK = 7
const SUNDAY = 0
const SATURDAY = 6
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24

export type ContributionData = Contribution | CommentingContribution
export type ContributionMatrix = (number | null)[][]
export type ContributionDataMatrix = (ContributionData | null)[][]

export interface GridPosition {
  weekRow: number
  weekdayColumn: number
}

export interface GridResult {
  matrix: ContributionMatrix
  weeklyContributions: ContributionDataMatrix
  maxValue: number
}

// Grid calculation utilities
export function createEmptyMatrices(): { matrix: ContributionMatrix; weeklyContributions: ContributionDataMatrix } {
  return {
    matrix: Array.from({ length: WEEKS_TO_DISPLAY }, () => Array(WEEKDAYS_COUNT).fill(null)),
    weeklyContributions: Array.from({ length: WEEKS_TO_DISPLAY }, () => Array(WEEKDAYS_COUNT).fill(null))
  }
}

export function getTimeRange(): { weeksAgo: Date; today: Date } {
  // Normalize today to start of day (00:00:00)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Calculate the Monday of the week that's WEEKS_TO_DISPLAY weeks ago
  const daysAgo = WEEKS_TO_DISPLAY * DAYS_PER_WEEK - 1
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - daysAgo)
  
  // Find the Monday of that week
  const dayOfWeek = startDate.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1  // Sunday=0 needs 6 days back, others dayOfWeek-1
  const mondayStart = new Date(startDate)
  mondayStart.setDate(startDate.getDate() - daysToMonday)
  
  // Normalize to start of day (00:00:00)
  mondayStart.setHours(0, 0, 0, 0)
  
  return { weeksAgo: mondayStart, today }
}

export function filterContributionsInTimeRange<T extends { createdAt: any }>(
  contributions: T[],
  startDate: Date,
  endDate: Date
): T[] {
  return contributions.filter(c => {
    const contributionDate = new Date(c.createdAt)
    return contributionDate >= startDate && contributionDate <= endDate
  })
}

export function calculateGridPosition(date: Date, weeksAgo: Date): GridPosition | null {
  const dayOfWeek = date.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
  
  // Skip weekends
  if (dayOfWeek === SUNDAY || dayOfWeek === SATURDAY) {
    return null
  }
  
  // Convert to Monday=0, Tuesday=1, Wednesday=2, Thursday=3, Friday=4
  const weekdayColumn = dayOfWeek - 1
  
  const daysDifference = Math.floor((date.getTime() - weeksAgo.getTime()) / MILLISECONDS_PER_DAY)
  const weekRow = Math.floor(daysDifference / DAYS_PER_WEEK)
  
  // Ensure within bounds
  if (weekRow >= 0 && weekRow < WEEKS_TO_DISPLAY && weekdayColumn >= 0 && weekdayColumn < WEEKDAYS_COUNT) {
    return { weekRow, weekdayColumn }
  }
  
  return null
}

export function placeContributionInGrid(
  contribution: ContributionData,
  getValue: (contribution: ContributionData) => number,
  matrices: { matrix: ContributionMatrix; weeklyContributions: ContributionDataMatrix },
  weeksAgo: Date
): void {
  const date = new Date(contribution.createdAt)
  // Normalize to start of day for consistent calculations
  date.setHours(0, 0, 0, 0)
  
  const position = calculateGridPosition(date, weeksAgo)
  
  if (position) {
    const { weekRow, weekdayColumn } = position
    matrices.matrix[weekRow][weekdayColumn] = getValue(contribution)
    matrices.weeklyContributions[weekRow][weekdayColumn] = contribution
  }
}

// Type-specific contribution processing functions
export function processPostingContributions(contributions: Contribution[]): GridResult {
  const matrices = createEmptyMatrices()
  const { weeksAgo, today } = getTimeRange()

  const recentContributions = filterContributionsInTimeRange(contributions, weeksAgo, today)

  recentContributions.forEach((contribution) => {
    placeContributionInGrid(
      contribution,
      (c) => (c as Contribution).contentLength ?? 0,
      matrices,
      weeksAgo
    )
  })

  // Calculate maxValue only from contributions that actually get placed (weekdays only)
  const weekdayContributions = recentContributions.filter(c => {
    const date = new Date(c.createdAt)
    const dayOfWeek = date.getDay()
    return dayOfWeek !== 0 && dayOfWeek !== 6 // Exclude weekends
  })
  const maxValue = Math.max(...weekdayContributions.map((c) => c.contentLength ?? 0), 0)

  return {
    matrix: matrices.matrix,
    weeklyContributions: matrices.weeklyContributions,
    maxValue
  }
}

export function processCommentingContributions(contributions: CommentingContribution[]): GridResult {
  const matrices = createEmptyMatrices()
  const { weeksAgo, today } = getTimeRange()

  const recentContributions = filterContributionsInTimeRange(contributions, weeksAgo, today)

  recentContributions.forEach((contribution) => {
    placeContributionInGrid(
      contribution,
      (c) => (c as CommentingContribution).countOfCommentAndReplies ?? 0,
      matrices,
      weeksAgo
    )
  })

  // Calculate maxValue only from contributions that actually get placed (weekdays only)
  const weekdayContributions = recentContributions.filter(c => {
    const date = new Date(c.createdAt)
    const dayOfWeek = date.getDay()
    return dayOfWeek !== 0 && dayOfWeek !== 6 // Exclude weekends
  })
  const maxValue = Math.max(...weekdayContributions.map((c) => c.countOfCommentAndReplies ?? 0), 0)

  return {
    matrix: matrices.matrix,
    weeklyContributions: matrices.weeklyContributions,
    maxValue
  }
}

/**
 * Creates an empty grid result for when there are no contributions
 */
export function createEmptyGridResult(): GridResult {
  return {
    matrix: Array.from({ length: WEEKS_TO_DISPLAY }, () => Array(5).fill(null)),
    weeklyContributions: Array.from({ length: WEEKS_TO_DISPLAY }, () => Array(5).fill(null)),
    maxValue: 0
  }
}

// Export constants for use in other files
export { WEEKS_TO_DISPLAY }