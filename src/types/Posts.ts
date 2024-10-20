// src/types/Post.ts
export interface Post {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    createdAt: Date;
    updatedAt?: Date;
}