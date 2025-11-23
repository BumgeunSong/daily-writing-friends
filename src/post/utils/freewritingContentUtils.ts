/**
 * Utility functions for handling freewriting content formatting
 */

/**
 * Prepends the freewriting topic to the content for storage
 *
 * Format: >> 프리라이팅 주제: {topic}\n\n{content}
 */
export function prependTopicToContent(content: string, topic?: string): string {
  if (!topic) {
    return content
  }

  const topicHeader = `>> 프리라이팅 주제: ${topic}`
  const contentWithTopic = `${topicHeader}\n\n${content}`

  return contentWithTopic
}
