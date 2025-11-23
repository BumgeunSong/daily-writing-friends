import { describe, it, expect } from 'vitest'
import { prependTopicToContent } from './freewritingContentUtils'

describe('Freewriting Content Utilities', () => {
  describe('prependTopicToContent', () => {
    describe('when topic is provided', () => {
      it('prepends topic header with correct format', () => {
        const content = 'This is my freewriting content.'
        const topic = 'My favorite memory'

        const result = prependTopicToContent(content, topic)

        expect(result).toBe('>> 프리라이팅 주제: My favorite memory\n\nThis is my freewriting content.')
      })
    })

    describe('when topic is not provided', () => {
      it('returns content unchanged', () => {
        const content = 'This is my freewriting content.'

        const result = prependTopicToContent(content, undefined)

        expect(result).toBe('This is my freewriting content.')
      })
    })

    describe('when topic is empty string', () => {
      it('returns content unchanged', () => {
        const content = 'This is my freewriting content.'

        const result = prependTopicToContent(content, '')

        expect(result).toBe('This is my freewriting content.')
      })
    })

    describe('when content is empty but topic is provided', () => {
      it('prepends topic header to empty content', () => {
        const content = ''
        const topic = 'My topic'

        const result = prependTopicToContent(content, topic)

        expect(result).toBe('>> 프리라이팅 주제: My topic\n\n')
      })
    })

    describe('when content has leading newlines', () => {
      it('preserves content structure with topic header', () => {
        const content = '\n\nActual content starts here'
        const topic = 'Test topic'

        const result = prependTopicToContent(content, topic)

        expect(result).toBe('>> 프리라이팅 주제: Test topic\n\n\n\nActual content starts here')
      })
    })

    describe('when topic contains special characters', () => {
      it('preserves special characters in topic', () => {
        const content = 'Content'
        const topic = 'Topic with "quotes" & symbols!'

        const result = prependTopicToContent(content, topic)

        expect(result).toBe('>> 프리라이팅 주제: Topic with "quotes" & symbols!\n\nContent')
      })
    })

    describe('when topic contains Unicode characters', () => {
      it('correctly handles emoji and non-ASCII characters', () => {
        const content = '내용입니다'
        const topic = '좋아하는 음식 🍕'

        const result = prependTopicToContent(content, topic)

        expect(result).toBe('>> 프리라이팅 주제: 좋아하는 음식 🍕\n\n내용입니다')
      })
    })
  })
})
