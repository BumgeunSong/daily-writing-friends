import { describe, it, expect } from 'vitest'
import {
  countNonWhitespaceCharacters,
  isWithinCharacterLimit,
  truncateToNonWhitespaceLimit
} from './topicInputUtils'

describe('Topic Input Utilities', () => {
  describe('countNonWhitespaceCharacters', () => {
    describe('when given text with only non-whitespace characters', () => {
      it('returns the correct character count', () => {
        const text = 'hello'
        const result = countNonWhitespaceCharacters(text)
        expect(result).toBe(5)
      })
    })

    describe('when given text with mixed whitespace and non-whitespace', () => {
      it('counts only non-whitespace characters', () => {
        const text = 'hello   world'
        const result = countNonWhitespaceCharacters(text)
        expect(result).toBe(10)
      })
    })

    describe('when given text with leading and trailing whitespace', () => {
      it('excludes leading and trailing whitespace from count', () => {
        const text = '   hello   '
        const result = countNonWhitespaceCharacters(text)
        expect(result).toBe(5)
      })
    })

    describe('when given empty string', () => {
      it('returns zero', () => {
        const text = ''
        const result = countNonWhitespaceCharacters(text)
        expect(result).toBe(0)
      })
    })

    describe('when given only whitespace', () => {
      it('returns zero', () => {
        const text = '     '
        const result = countNonWhitespaceCharacters(text)
        expect(result).toBe(0)
      })
    })

    describe('when given Unicode characters', () => {
      it('correctly counts emoji and non-ASCII characters', () => {
        const text = '안녕하세요 👋'
        const result = countNonWhitespaceCharacters(text)
        expect(result).toBe(6)
      })
    })
  })

  describe('isWithinCharacterLimit', () => {
    describe('when character count is below limit', () => {
      it('returns true', () => {
        const text = 'hello'
        const result = isWithinCharacterLimit(text, 10)
        expect(result).toBe(true)
      })
    })

    describe('when character count equals limit', () => {
      it('returns true', () => {
        const text = 'hello'
        const result = isWithinCharacterLimit(text, 5)
        expect(result).toBe(true)
      })
    })

    describe('when character count exceeds limit', () => {
      it('returns false', () => {
        const text = 'hello world'
        const result = isWithinCharacterLimit(text, 5)
        expect(result).toBe(false)
      })
    })

    describe('when text has whitespace but non-whitespace count is within limit', () => {
      it('returns true', () => {
        const text = 'hello   world'
        const result = isWithinCharacterLimit(text, 10)
        expect(result).toBe(true)
      })
    })
  })

  describe('truncateToNonWhitespaceLimit', () => {
    describe('when text is within limit', () => {
      it('returns the original text unchanged', () => {
        const text = 'hello'
        const result = truncateToNonWhitespaceLimit(text, 10)
        expect(result).toBe('hello')
      })
    })

    describe('when text exceeds limit with no whitespace', () => {
      it('truncates to the specified character limit', () => {
        const text = 'abcdefghij'
        const result = truncateToNonWhitespaceLimit(text, 5)
        expect(result).toBe('abcde')
      })
    })

    describe('when text has whitespace before limit', () => {
      it('truncates after the last non-whitespace character at limit', () => {
        const text = 'hello   world'
        const result = truncateToNonWhitespaceLimit(text, 5)
        expect(result).toBe('hello')
      })
    })

    describe('when text has excessive trailing whitespace after limit', () => {
      it('prevents unlimited trailing whitespace', () => {
        const text = 'a'.repeat(50) + ' '.repeat(100)
        const result = truncateToNonWhitespaceLimit(text, 50)
        expect(result).toBe('a'.repeat(50))
      })
    })

    describe('when text has leading whitespace', () => {
      it('preserves leading whitespace but truncates trailing', () => {
        const text = '   hello world'
        const result = truncateToNonWhitespaceLimit(text, 5)
        expect(result).toBe('   hello')
      })
    })

    describe('when text has mixed whitespace and characters', () => {
      it('correctly handles interleaved whitespace', () => {
        const text = 'a b c d e f g h'
        const result = truncateToNonWhitespaceLimit(text, 5)
        expect(result).toBe('a b c d e')
      })
    })

    describe('when limit is zero', () => {
      it('returns empty string', () => {
        const text = 'hello'
        const result = truncateToNonWhitespaceLimit(text, 0)
        expect(result).toBe('')
      })
    })

    describe('when text contains Unicode characters', () => {
      it('correctly truncates emoji and non-ASCII characters', () => {
        const text = '안녕하세요 👋 반갑습니다'
        const result = truncateToNonWhitespaceLimit(text, 6)
        expect(result).toBe('안녕하세요 👋')
      })
    })
  })
})
