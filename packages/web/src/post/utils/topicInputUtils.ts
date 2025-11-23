/**
 * Utility functions for handling freewriting topic input with character limits
 */

/**
 * Counts the number of non-whitespace characters in a string
 */
export function countNonWhitespaceCharacters(text: string): number {
  const characters = [...text]
  const nonWhitespaceCharacters = characters.filter(character => character.trim() !== '')
  return nonWhitespaceCharacters.length
}

/**
 * Checks if the topic input is within the allowed character limit
 */
export function isWithinCharacterLimit(text: string, maxLength: number): boolean {
  const nonWhitespaceCount = countNonWhitespaceCharacters(text)
  return nonWhitespaceCount <= maxLength
}

/**
 * Truncates text to the specified non-whitespace character limit
 * while preserving whitespace that appears before the limit
 *
 * Example:
 * - Input: "hello   world" with limit 5
 * - Output: "hello   " (keeps whitespace after 'hello')
 *
 * - Input: "a".repeat(50) + " ".repeat(100) with limit 50
 * - Output: "a".repeat(50) (no trailing whitespace after limit)
 */
export function truncateToNonWhitespaceLimit(text: string, maxLength: number): string {
  const characters = [...text]
  let nonWhitespaceCharacterCount = 0

  const truncatedCharacters = characters.filter(character => {
    const isNonWhitespace = character.trim() !== ''

    if (isNonWhitespace) {
      const isWithinLimit = nonWhitespaceCharacterCount < maxLength
      if (isWithinLimit) {
        nonWhitespaceCharacterCount++
        return true
      }
      return false
    }

    const hasNotStartedCounting = nonWhitespaceCharacterCount === 0
    const isStillWithinLimit = nonWhitespaceCharacterCount < maxLength
    return hasNotStartedCounting || isStillWithinLimit
  })

  return truncatedCharacters.join('')
}
