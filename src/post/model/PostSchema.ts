import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';
import { PostVisibility } from './Post';

// Schema for ProseMirror JSON content from TipTap
const ContentJsonSchema = z.any(); // For now, we'll allow any JSON structure

// Timestamp schema
const TimestampSchema = z.custom<Timestamp>((val) => val instanceof Timestamp);

// Post schema for validation
export const PostSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  title: z.string(),
  content: z.string(), // HTML content (required for backward compatibility)
  contentJson: ContentJsonSchema.optional(), // ProseMirror JSON (optional for new editor)
  thumbnailImageURL: z.string().nullable(),
  authorId: z.string(),
  authorName: z.string(),
  createdAt: TimestampSchema.optional(),
  countOfComments: z.number().default(0),
  countOfReplies: z.number().default(0),
  updatedAt: TimestampSchema.optional(),
  weekDaysFromFirstDay: z.number().optional(),
  visibility: z.nativeEnum(PostVisibility).optional(),
});

export type PostSchemaType = z.infer<typeof PostSchema>;