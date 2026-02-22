import { useQuery } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore';

import { Post, PostVisibility, ProseMirrorDoc } from '@/post/model/Post';
import { getSupabaseClient, throwOnError } from '@/shared/api/supabaseClient';
import { mapRowToPost } from '@/shared/api/supabaseReads';

export const fetchPost = async (_boardId: string, postId: string): Promise<Post | null> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('posts')
    .select('*, boards(first_day), comments(count), replies(count), users!author_id(profile_photo_url)')
    .eq('id', postId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return mapRowToPost(data);
};

export const usePostTitle = (boardId: string, postId: string) => {
  return useQuery(['postTitle', boardId, postId], async () => {
    const post = await fetchPost(boardId, postId);
    return post?.title;
  });
};

export async function createPost(
  boardId: string,
  title: string,
  content: string,
  authorId: string,
  authorName: string,
  visibility?: PostVisibility,
  contentJson?: ProseMirrorDoc,
): Promise<Post> {
  const supabase = getSupabaseClient();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const insertData: Record<string, unknown> = {
    id,
    board_id: boardId,
    author_id: authorId,
    author_name: authorName,
    title,
    content,
    thumbnail_image_url: extractFirstImageUrl(content) || null,
    visibility: visibility || PostVisibility.PUBLIC,
    count_of_comments: 0,
    count_of_replies: 0,
    count_of_likes: 0,
    engagement_score: 0,
    created_at: createdAt,
  };

  if (contentJson !== undefined) {
    insertData.content_json = contentJson;
  }

  throwOnError(await supabase.from('posts').insert(insertData));

  const post: Post = {
    id,
    boardId,
    title,
    content,
    thumbnailImageURL: extractFirstImageUrl(content),
    authorId,
    authorName,
    countOfComments: 0,
    countOfReplies: 0,
    countOfLikes: 0,
    createdAt: Timestamp.fromDate(new Date(createdAt)),
    visibility: visibility || PostVisibility.PUBLIC,
  };

  if (contentJson !== undefined) {
    post.contentJson = contentJson;
  }

  return post;
}

export const updatePost = async (
  _boardId: string,
  postId: string,
  title: string,
  content: string,
  contentJson?: ProseMirrorDoc,
): Promise<void> => {
  const supabase = getSupabaseClient();
  const updatedAt = new Date().toISOString();

  const supabaseData: Record<string, unknown> = {
    title,
    content,
    thumbnail_image_url: extractFirstImageUrl(content) || null,
    updated_at: updatedAt,
  };

  if (contentJson !== undefined) {
    supabaseData.content_json = contentJson;
  }

  throwOnError(await supabase.from('posts').update(supabaseData).eq('id', postId));
};

export const fetchAdjacentPosts = async (boardId: string, currentPostId: string) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('posts')
    .select('id')
    .eq('board_id', boardId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching adjacent posts:', error);
    return { prevPost: null, nextPost: null };
  }

  const posts = data || [];
  const currentIndex = posts.findIndex((post) => post.id === currentPostId);

  return {
    prevPost: currentIndex < posts.length - 1 ? posts[currentIndex + 1].id : null,
    nextPost: currentIndex > 0 ? posts[currentIndex - 1].id : null,
  };
};

export const extractFirstImageUrl = (content: string): string | null => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const firstImage = doc.querySelector('img');
    return firstImage?.src || null;
  } catch (error) {
    console.error('Error extracting image URL:', error);
    return null;
  }
};
