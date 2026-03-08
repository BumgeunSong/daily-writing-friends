import { useQuery } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore';

import type { Post, ProseMirrorDoc } from '@/post/model/Post';
import { PostVisibility } from '@/post/model/Post';
import { getSupabaseClient, throwOnError } from '@/shared/api/supabaseClient';
import { mapRowToPost } from '@/shared/api/supabaseReads';

export const fetchPost = async (boardId: string, postId: string): Promise<Post | null> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('posts')
    .select('*, boards(first_day), comments(count), replies(count), users!author_id(profile_photo_url)')
    .eq('id', postId)
    .eq('board_id', boardId)
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

  const thumbnailImageURL = extractFirstImageUrl(content);

  const insertData: Record<string, unknown> = {
    id,
    board_id: boardId,
    author_id: authorId,
    author_name: authorName,
    title,
    content,
    thumbnail_image_url: thumbnailImageURL || null,
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
    thumbnailImageURL,
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

  const { data: currentPost, error: currentError } = await supabase
    .from('posts')
    .select('created_at')
    .eq('id', currentPostId)
    .single();

  if (currentError || !currentPost) {
    console.error('Error fetching current post for adjacent lookup:', currentError);
    return { prevPost: null, nextPost: null };
  }

  const [prevResult, nextResult] = await Promise.all([
    supabase
      .from('posts')
      .select('id')
      .eq('board_id', boardId)
      .lt('created_at', currentPost.created_at)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('posts')
      .select('id')
      .eq('board_id', boardId)
      .gt('created_at', currentPost.created_at)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    prevPost: prevResult.data?.id ?? null,
    nextPost: nextResult.data?.id ?? null,
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
