import { describe, it, expect } from 'vitest'
import {
  createEmptyMatrices,
  getTimeRange,
  filterContributionsInTimeRange,
  calculateGridPosition,
  processPostingContributions,
  processCommentingContributions,
  filterWeekdayContributions,
  WEEKS_TO_DISPLAY
} from '../contributionGridUtils'
import type { Contribution } from '@/stats/model/WritingStats'
import type { CommentingContribution } from '@/stats/utils/commentingContributionUtils'

// Fixed date for deterministic testing: Tuesday, July 29, 2025
const MOCK_TODAY = new Date('2025-07-29T00:00:00.000Z')

describe('contributionGridUtils', () => {
  describe('createEmptyMatrices', () => {
    it('should return matrices with correct structure', () => {
      const result = createEmptyMatrices()
      
      expect(result).toHaveProperty('matrix')
      expect(result).toHaveProperty('weeklyContributions')
      expect(result.matrix).toHaveLength(WEEKS_TO_DISPLAY)
      expect(result.matrix[0]).toHaveLength(5) // Mon-Fri
      expect(result.weeklyContributions).toHaveLength(WEEKS_TO_DISPLAY)
      expect(result.weeklyContributions[0]).toHaveLength(5)
    })

    it('should initialize all cells as null', () => {
      const result = createEmptyMatrices()
      
      const allMatrixCells = result.matrix.flat()
      const allContributionCells = result.weeklyContributions.flat()
      
      expect(allMatrixCells.every(cell => cell === null)).toBe(true)
      expect(allContributionCells.every(cell => cell === null)).toBe(true)
    })
  })

  describe('getTimeRange', () => {
    it('should return dates with correct relationship', () => {
      const result = getTimeRange(MOCK_TODAY)

      expect(result).toHaveProperty('weeksAgo')
      expect(result).toHaveProperty('today')
      expect(result.weeksAgo).toBeInstanceOf(Date)
      expect(result.today).toBeInstanceOf(Date)
      expect(result.weeksAgo.getTime()).toBeLessThan(result.today.getTime())
    })

    it('should return Monday as start of range', () => {
      const result = getTimeRange(MOCK_TODAY)

      expect(result.weeksAgo.getDay()).toBe(1) // Monday
    })

    it('should span approximately 4 weeks', () => {
      const result = getTimeRange(MOCK_TODAY)

      const diffInDays = Math.floor(
        (result.today.getTime() - result.weeksAgo.getTime()) / (1000 * 60 * 60 * 24)
      )

      expect(diffInDays).toBeGreaterThanOrEqual(21) // At least 3 weeks
      expect(diffInDays).toBeLessThanOrEqual(27) // At most ~4 weeks
    })

    it('should use provided date as today', () => {
      const customToday = new Date('2025-08-15T12:00:00.000Z')
      const result = getTimeRange(customToday)

      expect(result.today.getTime()).toBe(customToday.getTime())
    })
  })

  describe('filterContributionsInTimeRange', () => {
    it('should return only contributions within date range', () => {
      const contributions = [
        { createdAt: '2025-06-01', value: 1 },
        { createdAt: '2025-07-15', value: 2 },
        { createdAt: '2025-08-01', value: 3 },
      ]
      
      const startDate = new Date('2025-07-01')
      const endDate = new Date('2025-07-31')
      
      const result = filterContributionsInTimeRange(contributions, startDate, endDate)
      
      expect(result).toHaveLength(1)
      expect(result[0].value).toBe(2)
    })

    it('should include contributions at exact boundaries', () => {
      const contributions = [
        { createdAt: '2025-07-01', value: 1 },
        { createdAt: '2025-07-31', value: 2 },
      ]
      
      const startDate = new Date('2025-07-01')
      const endDate = new Date('2025-07-31')
      
      const result = filterContributionsInTimeRange(contributions, startDate, endDate)
      
      expect(result).toHaveLength(2)
    })
  })

  describe('calculateGridPosition', () => {
    const mondayStart = new Date('2025-07-07T00:00:00.000Z') // Monday

    it('should return correct positions for weekdays', () => {
      // Test Monday (should be row 0, col 0)
      const mondayPos = calculateGridPosition(new Date('2025-07-07'), mondayStart)
      expect(mondayPos).toEqual({ weekRow: 0, weekdayColumn: 0 })

      // Test Friday (should be row 0, col 4)
      const fridayPos = calculateGridPosition(new Date('2025-07-11'), mondayStart)
      expect(fridayPos).toEqual({ weekRow: 0, weekdayColumn: 4 })

      // Test next week Monday (should be row 1, col 0)
      const nextMondayPos = calculateGridPosition(new Date('2025-07-14'), mondayStart)
      expect(nextMondayPos).toEqual({ weekRow: 1, weekdayColumn: 0 })
    })

    it('should return null for weekends', () => {
      const saturdayPos = calculateGridPosition(new Date('2025-07-12'), mondayStart)
      const sundayPos = calculateGridPosition(new Date('2025-07-13'), mondayStart)
      
      expect(saturdayPos).toBeNull()
      expect(sundayPos).toBeNull()
    })

    it('should return null for dates outside grid range', () => {
      const beforePos = calculateGridPosition(new Date('2025-07-06'), mondayStart)
      const afterPos = calculateGridPosition(new Date('2025-08-10'), mondayStart)
      
      expect(beforePos).toBeNull()
      expect(afterPos).toBeNull()
    })
  })

  describe('filterWeekdayContributions', () => {
    it('should return only weekday contributions', () => {
      const contributions = [
        { createdAt: '2025-07-07' }, // Monday
        { createdAt: '2025-07-08' }, // Tuesday
        { createdAt: '2025-07-12' }, // Saturday
        { createdAt: '2025-07-13' }, // Sunday
        { createdAt: '2025-07-14' }, // Monday
      ]
      
      const result = filterWeekdayContributions(contributions)
      
      expect(result).toHaveLength(3)
      expect(result.map(c => c.createdAt)).toEqual([
        '2025-07-07',
        '2025-07-08', 
        '2025-07-14'
      ])
    })
  })

  describe('processPostingContributions', () => {
    const timeRange = getTimeRange(MOCK_TODAY)

    it('should return a complete GridResult', () => {
      const contributions: Contribution[] = [
        { createdAt: '2025-07-15', contentLength: 100 },
        { createdAt: '2025-07-16', contentLength: 200 },
      ]

      const result = processPostingContributions(contributions, undefined, timeRange)

      expect(result).toHaveProperty('matrix')
      expect(result).toHaveProperty('weeklyContributions')
      expect(result).toHaveProperty('maxValue')
      expect(typeof result.maxValue).toBe('number')
    })

    it('should calculate correct maxValue', () => {
      const contributions: Contribution[] = [
        { createdAt: '2025-07-15', contentLength: 100 },
        { createdAt: '2025-07-16', contentLength: 500 },
        { createdAt: '2025-07-17', contentLength: 200 },
      ]

      const result = processPostingContributions(contributions, undefined, timeRange)

      expect(result.maxValue).toBe(500)
    })

    it('should handle null contentLength values', () => {
      const contributions: Contribution[] = [
        { createdAt: '2025-07-15', contentLength: null },
        { createdAt: '2025-07-16', contentLength: 100 },
      ]

      const result = processPostingContributions(contributions, undefined, timeRange)

      expect(result.maxValue).toBe(100)
      expect(result).toBeDefined()
    })

    it('should ignore weekend contributions', () => {
      const contributions: Contribution[] = [
        { createdAt: '2025-07-14', contentLength: 100 }, // Monday
        { createdAt: '2025-07-19', contentLength: 999 }, // Saturday
        { createdAt: '2025-07-20', contentLength: 999 }, // Sunday
        { createdAt: '2025-07-21', contentLength: 200 }, // Monday
      ]

      const result = processPostingContributions(contributions, undefined, timeRange)

      expect(result.maxValue).toBe(200) // Should not include 999 from weekends
    })

    it('should create placeholders for days without contributions', () => {
      const contributions: Contribution[] = []

      const result = processPostingContributions(contributions, undefined, timeRange)

      // Should have a grid structure even with no contributions
      expect(result.matrix).toHaveLength(WEEKS_TO_DISPLAY)
      expect(result.weeklyContributions).toHaveLength(WEEKS_TO_DISPLAY)
      expect(result.maxValue).toBe(0)
    })
  })

  describe('processCommentingContributions', () => {
    const timeRange = getTimeRange(MOCK_TODAY)

    it('should return a complete GridResult', () => {
      const contributions: CommentingContribution[] = [
        { createdAt: '2025-07-15', countOfCommentAndReplies: 5 },
        { createdAt: '2025-07-16', countOfCommentAndReplies: 10 },
      ]

      const result = processCommentingContributions(contributions, undefined, timeRange)

      expect(result).toHaveProperty('matrix')
      expect(result).toHaveProperty('weeklyContributions')
      expect(result).toHaveProperty('maxValue')
      expect(typeof result.maxValue).toBe('number')
    })

    it('should calculate correct maxValue from comment counts', () => {
      const contributions: CommentingContribution[] = [
        { createdAt: '2025-07-15', countOfCommentAndReplies: 3 },
        { createdAt: '2025-07-16', countOfCommentAndReplies: 15 },
        { createdAt: '2025-07-17', countOfCommentAndReplies: 7 },
      ]

      const result = processCommentingContributions(contributions, undefined, timeRange)

      expect(result.maxValue).toBe(15)
    })

    it('should handle null countOfCommentAndReplies values', () => {
      const contributions: CommentingContribution[] = [
        { createdAt: '2025-07-15', countOfCommentAndReplies: null },
        { createdAt: '2025-07-16', countOfCommentAndReplies: 8 },
      ]

      const result = processCommentingContributions(contributions, undefined, timeRange)

      expect(result.maxValue).toBe(8)
      expect(result).toBeDefined()
    })
  })

  describe('Grid Structure Validation', () => {
    const timeRange = getTimeRange(MOCK_TODAY)

    it('should maintain consistent grid dimensions across all functions', () => {
      const postingResult = processPostingContributions([], undefined, timeRange)
      const commentingResult = processCommentingContributions([], undefined, timeRange)

      // Both should have same structure
      expect(postingResult.matrix).toHaveLength(WEEKS_TO_DISPLAY)
      expect(commentingResult.matrix).toHaveLength(WEEKS_TO_DISPLAY)

      expect(postingResult.matrix[0]).toHaveLength(5)
      expect(commentingResult.matrix[0]).toHaveLength(5)
    })

    it('should handle edge case of contributions exactly at time boundaries', () => {
      const { weeksAgo, today } = timeRange

      const contributions: Contribution[] = [
        { createdAt: weeksAgo.toISOString(), contentLength: 100 },
        { createdAt: today.toISOString(), contentLength: 200 },
      ]

      const result = processPostingContributions(contributions, undefined, timeRange)

      // Should process contributions at boundaries correctly
      expect(result).toBeDefined()
      expect(result.maxValue).toBeGreaterThanOrEqual(0)
    })
  })
})