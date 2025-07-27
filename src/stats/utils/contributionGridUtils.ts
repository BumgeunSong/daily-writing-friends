import { Contribution } from "@/stats/model/WritingStats"
import { CommentingContribution } from '@/stats/utils/commentingContributionUtils'

// Constants for grid layout
const WEEKS_TO_DISPLAY = 4
const WEEKDAYS_COUNT = 5
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
  const today = new Date()
  const weeksAgo = new Date(today)
  weeksAgo.setDate(today.getDate() - (WEEKS_TO_DISPLAY * DAYS_PER_WEEK - 1))
  return { weeksAgo, today }
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
  const dayOfWeek = date.getDay()
  
  // Skip weekends
  if (dayOfWeek === SUNDAY || dayOfWeek === SATURDAY) {
    return null
  }
  
  const weekdayColumn = dayOfWeek - 1 // Convert to Monday=0, Tuesday=1, ..., Friday=4
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
  const position = calculateGridPosition(date, weeksAgo)
  
  if (position) {
    const { weekRow, weekdayColumn } = position
    matrices.matrix[weekRow][weekdayColumn] = getValue(contribution)
    matrices.weeklyContributions[weekRow][weekdayColumn] = contribution
  }
}

// Export constants for use in other files
export { WEEKS_TO_DISPLAY }