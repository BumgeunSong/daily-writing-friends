import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';
import { PostVisibility } from './Post';

// Schema for ProseMirror Mark
const ProseMirrorMarkSchema = z.object({
  type: z.string(),
  attrs: z.record(z.unknown()).optional(),
});

// ProseMirror Node type for recursive schema
interface ProseMirrorNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ProseMirrorNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
}

// Schema for ProseMirror Node (recursive)
const ProseMirrorNodeSchema: z.ZodType<ProseMirrorNode> = z.lazy(() =>
  z.object({
    type: z.string(),
    attrs: z.record(z.unknown()).optional(),
    content: z.array(ProseMirrorNodeSchema).optional(),
    marks: z.array(ProseMirrorMarkSchema).optional(),
    text: z.string().optional(),
  }),
);

// Schema for ProseMirror Document
const ContentJsonSchema = z.object({
  type: z.literal('doc'),
  content: z.array(ProseMirrorNodeSchema).optional(),
});

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
