import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createEmptyMatrices,
  getTimeRange,
  filterContributionsInTimeRange,
  calculateGridPosition,
  placeContributionInGrid,
  processPostingContributions,
  processCommentingContributions,
  WEEKS_TO_DISPLAY,
  type GridResult,
  type ContributionData
} from '../contributionGridUtils'
import type { Contribution } from '@/stats/model/WritingStats'
import type { CommentingContribution } from '@/stats/utils/commentingContributionUtils'

// Mock current date to ensure consistent test results
const MOCK_TODAY = new Date('2025-07-27T00:00:00.000Z') // Sunday

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(MOCK_TODAY)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('contributionGridUtils', () => {
  describe('getTimeRange', () => {
    it('should return today and Monday of 4 weeks ago', () => {
      const { weeksAgo, today } = getTimeRange()
      
      expect(today.getDay()).toBe(0) // Sunday
      expect(weeksAgo.getDay()).toBe(1) // Monday
      expect(weeksAgo.toDateString()).toBe('Mon Jun 30 2025')
      expect(today.toDateString()).toBe('Sun Jul 27 2025')
    })

    it('should normalize times to midnight', () => {
      const { weeksAgo, today } = getTimeRange()
      
      expect(today.getHours()).toBe(0)
      expect(today.getMinutes()).toBe(0)
      expect(today.getSeconds()).toBe(0)
      expect(today.getMilliseconds()).toBe(0)
      
      expect(weeksAgo.getHours()).toBe(0)
      expect(weeksAgo.getMinutes()).toBe(0)
      expect(weeksAgo.getSeconds()).toBe(0)
      expect(weeksAgo.getMilliseconds()).toBe(0)
    })
  })

  describe('createEmptyMatrices', () => {
    it('should create matrices with correct dimensions', () => {
      const { matrix, weeklyContributions } = createEmptyMatrices()
      
      expect(matrix).toHaveLength(WEEKS_TO_DISPLAY)
      expect(matrix[0]).toHaveLength(5) // Mon-Fri
      expect(weeklyContributions).toHaveLength(WEEKS_TO_DISPLAY)
      expect(weeklyContributions[0]).toHaveLength(5)
      
      // All cells should be null initially
      expect(matrix[0]).toEqual([null, null, null, null, null])
      expect(weeklyContributions[0]).toEqual([null, null, null, null, null])
    })
  })

  describe('filterContributionsInTimeRange', () => {
    it('should filter contributions within date range', () => {
      const contributions = [
        { createdAt: new Date('2025-06-29') }, // Before range
        { createdAt: new Date('2025-06-30') }, // Start of range
        { createdAt: new Date('2025-07-15') }, // Within range
        { createdAt: new Date('2025-07-28') }, // After range
      ]
      
      const startDate = new Date('2025-06-30')
      const endDate = new Date('2025-07-27')
      
      const filtered = filterContributionsInTimeRange(contributions, startDate, endDate)
      
      expect(filtered).toHaveLength(2)
      expect(filtered[0].createdAt.toDateString()).toBe('Mon Jun 30 2025')
      expect(filtered[1].createdAt.toDateString()).toBe('Tue Jul 15 2025')
    })
  })

  describe('calculateGridPosition', () => {
    const weeksAgo = new Date('2025-06-30T00:00:00.000Z') // Monday

    it('should calculate correct position for weekdays', () => {
      // Monday June 30th (Week 0, Col 0)
      const mondayPos = calculateGridPosition(new Date('2025-06-30'), weeksAgo)
      expect(mondayPos).toEqual({ weekRow: 0, weekdayColumn: 0 })

      // Tuesday July 1st (Week 0, Col 1)
      const tuesdayPos = calculateGridPosition(new Date('2025-07-01'), weeksAgo)
      expect(tuesdayPos).toEqual({ weekRow: 0, weekdayColumn: 1 })

      // Friday July 4th (Week 0, Col 4)
      const fridayPos = calculateGridPosition(new Date('2025-07-04'), weeksAgo)
      expect(fridayPos).toEqual({ weekRow: 0, weekdayColumn: 4 })

      // Monday July 7th (Week 1, Col 0)
      const nextMondayPos = calculateGridPosition(new Date('2025-07-07'), weeksAgo)
      expect(nextMondayPos).toEqual({ weekRow: 1, weekdayColumn: 0 })
    })

    it('should return null for weekends', () => {
      // Saturday
      const saturdayPos = calculateGridPosition(new Date('2025-07-05'), weeksAgo)
      expect(saturdayPos).toBeNull()

      // Sunday
      const sundayPos = calculateGridPosition(new Date('2025-07-06'), weeksAgo)
      expect(sundayPos).toBeNull()
    })

    it('should return null for out-of-bounds dates', () => {
      // Before range
      const beforePos = calculateGridPosition(new Date('2025-06-29'), weeksAgo)
      expect(beforePos).toBeNull()

      // After range (more than 4 weeks)
      const afterPos = calculateGridPosition(new Date('2025-08-01'), weeksAgo)
      expect(afterPos).toBeNull()
    })
  })

  describe('placeContributionInGrid', () => {
    it('should place contribution in correct grid position', () => {
      const matrices = createEmptyMatrices()
      const weeksAgo = new Date('2025-06-30T00:00:00.000Z')
      
      const contribution: ContributionData = {
        createdAt: new Date('2025-07-01T10:30:00.000Z').toISOString(), // Tuesday, should normalize to midnight
        contentLength: 500
      } as Contribution

      placeContributionInGrid(
        contribution,
        (c) => (c as Contribution).contentLength ?? 0,
        matrices,
        weeksAgo
      )

      // Should be placed at Week 0, Column 1 (Tuesday)
      expect(matrices.matrix[0][1]).toBe(500)
      expect(matrices.weeklyContributions[0][1]).toBe(contribution)
      
      // Other positions should remain null
      expect(matrices.matrix[0][0]).toBeNull()
      expect(matrices.matrix[0][2]).toBeNull()
    })

    it('should not place weekend contributions', () => {
      const matrices = createEmptyMatrices()
      const weeksAgo = new Date('2025-06-30T00:00:00.000Z')
      
      const weekendContribution: ContributionData = {
        createdAt: new Date('2025-07-05').toISOString(), // Saturday
        contentLength: 300
      } as Contribution

      placeContributionInGrid(
        weekendContribution,
        (c) => (c as Contribution).contentLength ?? 0,
        matrices,
        weeksAgo
      )

      // No position should be filled
      expect(matrices.matrix.flat().every(cell => cell === null)).toBe(true)
      expect(matrices.weeklyContributions.flat().every(cell => cell === null)).toBe(true)
    })
  })

  describe('Integration Test - Complete Grid Processing', () => {
    it('should create correct grid for posting contributions', () => {
      const contributions: Contribution[] = [
        // Week 0
        { createdAt: new Date('2025-06-30').toISOString(), contentLength: 100 }, // Mon
        { createdAt: new Date('2025-07-01').toISOString(), contentLength: 200 }, // Tue
        { createdAt: new Date('2025-07-03').toISOString(), contentLength: 300 }, // Thu
        // Week 1  
        { createdAt: new Date('2025-07-07').toISOString(), contentLength: 400 }, // Mon
        { createdAt: new Date('2025-07-11').toISOString(), contentLength: 500 }, // Fri
        // Weekends (should be ignored)
        { createdAt: new Date('2025-07-05').toISOString(), contentLength: 999 }, // Sat
        { createdAt: new Date('2025-07-06').toISOString(), contentLength: 999 }, // Sun
      ] as Contribution[]

      const result = processPostingContributions(contributions)

      // Expected matrix: [Mon, Tue, Wed, Thu, Fri]
      expect(result.matrix[0]).toEqual([100, 200, null, 300, null]) // Week 0
      expect(result.matrix[1]).toEqual([400, null, null, null, 500]) // Week 1
      expect(result.matrix[2]).toEqual([null, null, null, null, null]) // Week 2
      expect(result.matrix[3]).toEqual([null, null, null, null, null]) // Week 3
      
      expect(result.maxValue).toBe(500)
    })

    it('should create correct grid for commenting contributions', () => {
      const contributions: CommentingContribution[] = [
        { createdAt: new Date('2025-07-01').toISOString(), countOfCommentAndReplies: 5 }, // Tue
        { createdAt: new Date('2025-07-08').toISOString(), countOfCommentAndReplies: 10 }, // Tue next week
      ] as CommentingContribution[]

      const result = processCommentingContributions(contributions)

      expect(result.matrix[0]).toEqual([null, 5, null, null, null]) // Week 0
      expect(result.matrix[1]).toEqual([null, 10, null, null, null]) // Week 1
      expect(result.maxValue).toBe(10)
    })

    it('should handle edge case: contributions exactly at range boundaries', () => {
      const { weeksAgo, today } = getTimeRange()
      
      const contributions: Contribution[] = [
        { createdAt: new Date(weeksAgo).toISOString(), contentLength: 100 }, // Exactly at start
        { createdAt: new Date(today).toISOString(), contentLength: 200 }, // Exactly at end (Sunday, should be ignored)
      ] as Contribution[]

      const matrices = createEmptyMatrices()
      const recentContributions = filterContributionsInTimeRange(contributions, weeksAgo, today)

      recentContributions.forEach(contribution => {
        placeContributionInGrid(
          contribution,
          (c) => (c as Contribution).contentLength ?? 0,
          matrices,
          weeksAgo
        )
      })

      // Only Monday (start) should be placed, Sunday should be ignored
      expect(matrices.matrix[0][0]).toBe(100) // Monday
      expect(matrices.matrix.flat().filter(cell => cell !== null)).toHaveLength(1)
    })
  })
})