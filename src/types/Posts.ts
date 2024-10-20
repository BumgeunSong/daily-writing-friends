// src/types/Post.ts
export interface Post {
    id: string;
    title: string;
    content: string;
    authorId: string;
    authorName: string;
    createdAt: Date;
    updatedAt?: Date;
}
