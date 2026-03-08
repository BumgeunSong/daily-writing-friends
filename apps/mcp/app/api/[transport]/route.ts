import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { resolveUserId } from '@/lib/app/user-lookup';
import { getMyPosts, getPostContent, getBestPosts, searchPosts } from '@/lib/app/queries';
import { stripHtml } from '@/lib/app/preview';

// Cache resolved userId per authorName for the server lifetime
const userIdCache = new Map<string, string>();

async function getUserId(authorName: string): Promise<string> {
  const cached = userIdCache.get(authorName);
  if (cached) return cached;

  const result = await resolveUserId(authorName);
  if ('error' in result) {
    throw new Error(result.error);
  }

  userIdCache.set(authorName, result.userId);
  return result.userId;
}

function formatPostList(
  posts: { id: string; title: string; preview: string; boardTitle: string; createdAt: string; engagementScore: number }[]
): string {
  if (posts.length === 0) return 'No posts found.';

  return posts
    .map(
      (p, i) =>
        `${i + 1}. **${p.title}**\n` +
        `   Board: ${p.boardTitle} | Date: ${p.createdAt.slice(0, 10)} | Engagement: ${p.engagementScore}\n` +
        `   ${p.preview}\n` +
        `   [postId: ${p.id}]`
    )
    .join('\n\n');
}

const handler = createMcpHandler(
  (server) => {
    server.tool(
      'get_my_posts',
      'List my posts with metadata and preview. Use this to browse writing history before reading full content.',
      {
        authorName: z.string().describe('Display name of the user (set in MCP config)'),
        board: z.string().optional().describe('Filter by board title (partial match)'),
        limit: z.number().int().min(1).max(50).default(20).describe('Number of posts to return'),
        offset: z.number().int().min(0).default(0).describe('Pagination offset'),
      },
      async ({ authorName, board, limit, offset }) => {
        const userId = await getUserId(authorName);
        const posts = await getMyPosts(userId, { board, limit, offset });
        return {
          content: [{ type: 'text', text: formatPostList(posts) }],
        };
      }
    );

    server.tool(
      'get_post_content',
      'Read the full content of a specific post. Use postId from get_my_posts or search_posts results.',
      {
        postId: z.string().describe('The post ID to read'),
      },
      async ({ postId }) => {
        const post = await getPostContent(postId);
        if (!post) {
          return {
            content: [{ type: 'text', text: `Post not found: ${postId}` }],
          };
        }
        return {
          content: [
            {
              type: 'text',
              text:
                `# ${post.title}\n\n` +
                `**Author:** ${post.authorName}\n` +
                `**Board:** ${post.boardTitle}\n` +
                `**Date:** ${post.createdAt.slice(0, 10)}\n` +
                `**Engagement:** ${post.engagementScore}\n\n` +
                `---\n\n` +
                stripHtml(post.content),
            },
          ],
        };
      }
    );

    server.tool(
      'get_best_posts',
      'Get my highest-engagement posts. Great for finding my best writing.',
      {
        authorName: z.string().describe('Display name of the user (set in MCP config)'),
        board: z.string().optional().describe('Filter by board title (partial match)'),
        limit: z.number().int().min(1).max(50).default(10).describe('Number of posts to return'),
      },
      async ({ authorName, board, limit }) => {
        const userId = await getUserId(authorName);
        const posts = await getBestPosts(userId, { board, limit });
        return {
          content: [{ type: 'text', text: formatPostList(posts) }],
        };
      }
    );

    server.tool(
      'search_posts',
      'Search my posts by keyword. Searches in both title and content.',
      {
        authorName: z.string().describe('Display name of the user (set in MCP config)'),
        query: z.string().describe('Search keyword'),
        limit: z.number().int().min(1).max(50).default(10).describe('Number of results to return'),
      },
      async ({ authorName, query, limit }) => {
        const userId = await getUserId(authorName);
        const posts = await searchPosts(userId, query, { limit });
        return {
          content: [{ type: 'text', text: formatPostList(posts) }],
        };
      }
    );
  },
  {
    serverInfo: {
      name: 'daily-writing-friends',
      version: '1.0.0',
    },
    capabilities: {
      tools: {},
    },
  },
  {
    basePath: '/api',
    maxDuration: 30,
  }
);

export { handler as GET, handler as POST };
