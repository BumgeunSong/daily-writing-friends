import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SQL string escaper
function escapeSql(value: string | null): string {
  if (value === null) return 'NULL';
  return `'${value.replace(/'/g, "''")}'`;
}

// Format timestamp for SQL
function formatTimestamp(date: string | null): string {
  if (!date) return 'NOW()';
  return `'${date}'`;
}

interface User {
  id: string;
  real_name: string | null;
  nickname: string | null;
  email: string | null;
  profile_photo_url: string | null;
  bio: string | null;
  phone_number: string | null;
  referrer: string | null;
  recovery_status: string | null;
  timezone: string | null;
  known_buddy_uid: string | null;
  created_at: string;
  updated_at: string;
}

interface Board {
  id: string;
  title: string;
  description: string | null;
  first_day: string | null;
  last_day: string | null;
  cohort: number | null;
  created_at: string;
  updated_at: string;
}

interface Post {
  id: string;
  board_id: string;
  author_id: string;
  author_name: string;
  title: string;
  content: string;
  content_json: any;
  thumbnail_image_url: string | null;
  visibility: string;
  count_of_comments: number;
  count_of_replies: number;
  count_of_likes: number;
  engagement_score: number;
  week_days_from_first_day: number | null;
  created_at: string;
  updated_at: string;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  user_profile_image: string | null;
  content: string;
  count_of_replies: number;
  created_at: string;
  updated_at: string;
}

interface Reply {
  id: string;
  comment_id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  user_profile_image: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

interface Reaction {
  id: string;
  comment_id: string | null;
  reply_id: string | null;
  user_id: string;
  reaction_type: string;
  user_name: string;
  user_profile_image: string | null;
  created_at: string;
}

interface UserBoardPermission {
  id: string;
  user_id: string;
  board_id: string;
  permission: string;
  created_at: string;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   - SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('🔌 Connecting to Supabase...');
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Step 1: Fetch one board
  console.log('📦 Fetching board...');
  const { data: boards, error: boardError } = await supabase
    .from('boards')
    .select('*')
    .limit(1);

  if (boardError || !boards || boards.length === 0) {
    console.error('❌ Failed to fetch board:', boardError);
    process.exit(1);
  }

  const board = boards[0] as Board;
  console.log(`✅ Fetched board: ${board.title} (${board.id})`);

  // Step 2: Fetch up to 15 posts from that board
  console.log('📝 Fetching posts...');
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('*')
    .eq('board_id', board.id)
    .limit(15);

  if (postsError || !posts) {
    console.error('❌ Failed to fetch posts:', postsError);
    process.exit(1);
  }

  console.log(`✅ Fetched ${posts.length} posts`);

  const postIds = posts.map((p: Post) => p.id);

  // Step 3: Fetch comments on those posts
  console.log('💬 Fetching comments...');
  const { data: comments, error: commentsError } = await supabase
    .from('comments')
    .select('*')
    .in('post_id', postIds);

  if (commentsError || !comments) {
    console.error('❌ Failed to fetch comments:', commentsError);
    process.exit(1);
  }

  console.log(`✅ Fetched ${comments.length} comments`);

  const commentIds = comments.map((c: Comment) => c.id);

  // Step 4: Fetch replies on those comments
  console.log('↩️  Fetching replies...');
  const { data: replies, error: repliesError } = await supabase
    .from('replies')
    .select('*')
    .in('comment_id', commentIds);

  if (repliesError || !replies) {
    console.error('❌ Failed to fetch replies:', repliesError);
    process.exit(1);
  }

  console.log(`✅ Fetched ${replies.length} replies`);

  // Step 5: Fetch reactions on comments and replies
  console.log('❤️  Fetching reactions...');
  const replyIds = replies.map((r: Reply) => r.id);
  
  let reactionsQuery = supabase.from('reactions').select('*');
  
  if (commentIds.length > 0 && replyIds.length > 0) {
    reactionsQuery = reactionsQuery.or(`comment_id.in.(${commentIds.join(',')}),reply_id.in.(${replyIds.join(',')})`);
  } else if (commentIds.length > 0) {
    reactionsQuery = reactionsQuery.in('comment_id', commentIds);
  } else if (replyIds.length > 0) {
    reactionsQuery = reactionsQuery.in('reply_id', replyIds);
  }

  const { data: reactions, error: reactionsError } = await reactionsQuery;

  if (reactionsError) {
    console.error('❌ Failed to fetch reactions:', reactionsError);
    process.exit(1);
  }

  console.log(`✅ Fetched ${reactions?.length || 0} reactions`);

  // Step 6: Collect all user IDs referenced
  const userIds = new Set<string>();
  posts.forEach((p: Post) => userIds.add(p.author_id));
  comments.forEach((c: Comment) => userIds.add(c.user_id));
  replies.forEach((r: Reply) => userIds.add(r.user_id));
  (reactions || []).forEach((r: Reaction) => userIds.add(r.user_id));

  // Step 7: Fetch users
  console.log(`👤 Fetching ${userIds.size} users...`);
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .in('id', Array.from(userIds));

  if (usersError || !users) {
    console.error('❌ Failed to fetch users:', usersError);
    process.exit(1);
  }

  console.log(`✅ Fetched ${users.length} users`);

  // Step 8: Fetch user_board_permissions for the board
  console.log('🔐 Fetching user board permissions...');
  const { data: permissions, error: permissionsError } = await supabase
    .from('user_board_permissions')
    .select('*')
    .eq('board_id', board.id);

  if (permissionsError || !permissions) {
    console.error('❌ Failed to fetch permissions:', permissionsError);
    process.exit(1);
  }

  console.log(`✅ Fetched ${permissions.length} permissions`);

  // Step 9: Anonymize data
  console.log('🎭 Anonymizing data...');

  const userMapping = new Map<string, number>();
  const anonymizedUsers: User[] = [];

  // Map the first user as test@test.local (test login user)
  let userCounter = 1;
  users.forEach((user: User, index: number) => {
    userMapping.set(user.id, userCounter);

    const anonymizedUser: User = {
      ...user,
      email: index === 0 ? 'test@test.local' : `user-${userCounter}@test.local`,
      real_name: `Test User ${userCounter}`,
      nickname: `TestUser${userCounter}`,
      profile_photo_url: null,
      phone_number: null,
      bio: `Test bio for user ${userCounter}`,
      referrer: null,
    };

    anonymizedUsers.push(anonymizedUser);
    userCounter++;
  });

  const testUserId = users[0].id;

  // Anonymize posts (update author_name)
  const anonymizedPosts = posts.map((post: Post) => ({
    ...post,
    author_name: `TestUser${userMapping.get(post.author_id)}`,
  }));

  // Anonymize comments
  const anonymizedComments = comments.map((comment: Comment) => ({
    ...comment,
    user_name: `TestUser${userMapping.get(comment.user_id)}`,
    user_profile_image: null,
  }));

  // Anonymize replies
  const anonymizedReplies = replies.map((reply: Reply) => ({
    ...reply,
    user_name: `TestUser${userMapping.get(reply.user_id)}`,
    user_profile_image: null,
  }));

  // Anonymize reactions
  const anonymizedReactions = (reactions || []).map((reaction: Reaction) => ({
    ...reaction,
    user_name: `TestUser${userMapping.get(reaction.user_id)}`,
    user_profile_image: null,
  }));

  console.log('✅ Anonymization complete');

  // Step 10: Generate SQL
  console.log('📄 Generating SQL...');

  let sql = `-- ================================================
-- SEED DATA FOR DAILY WRITING FRIENDS
-- Generated: ${new Date().toISOString()}
-- ================================================
-- This seed file contains anonymized data extracted from production.
-- Test login: test@test.local / test1234
-- ================================================

`;

  // Insert test user into auth.users
  sql += `-- ================================================
-- AUTH USER (test login)
-- ================================================
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  role, aud, created_at, updated_at, confirmation_token, recovery_token
) VALUES (
  ${escapeSql(testUserId)}, '00000000-0000-0000-0000-000000000000', 'test@test.local',
  '$2a$10$PwGmm3MvJ8rHGjJuVVlC7.YoxvlLVw/9ZYKyBqQiYy7K0KuKY.TKK',
  now(), 'authenticated', 'authenticated', now(), now(), '', ''
) ON CONFLICT (id) DO NOTHING;

`;

  // Insert users
  sql += `-- ================================================
-- USERS
-- ================================================
`;
  anonymizedUsers.forEach((user) => {
    sql += `INSERT INTO users (id, real_name, nickname, email, profile_photo_url, bio, phone_number, referrer, recovery_status, timezone, known_buddy_uid, created_at, updated_at) VALUES (
  ${escapeSql(user.id)}, ${escapeSql(user.real_name)}, ${escapeSql(user.nickname)}, ${escapeSql(user.email)}, ${escapeSql(user.profile_photo_url)}, ${escapeSql(user.bio)}, ${escapeSql(user.phone_number)}, ${escapeSql(user.referrer)}, ${escapeSql(user.recovery_status)}, ${escapeSql(user.timezone)}, ${escapeSql(user.known_buddy_uid)}, ${formatTimestamp(user.created_at)}, ${formatTimestamp(user.updated_at)}
) ON CONFLICT (id) DO NOTHING;
`;
  });

  // Insert board
  sql += `
-- ================================================
-- BOARDS
-- ================================================
INSERT INTO boards (id, title, description, first_day, last_day, cohort, created_at, updated_at) VALUES (
  ${escapeSql(board.id)}, ${escapeSql(board.title)}, ${escapeSql(board.description)}, ${formatTimestamp(board.first_day)}, ${formatTimestamp(board.last_day)}, ${board.cohort || 'NULL'}, ${formatTimestamp(board.created_at)}, ${formatTimestamp(board.updated_at)}
) ON CONFLICT (id) DO NOTHING;

`;

  // Insert permissions
  sql += `-- ================================================
-- USER BOARD PERMISSIONS
-- ================================================
`;
  permissions.forEach((perm: UserBoardPermission) => {
    sql += `INSERT INTO user_board_permissions (id, user_id, board_id, permission, created_at) VALUES (
  ${escapeSql(perm.id)}, ${escapeSql(perm.user_id)}, ${escapeSql(perm.board_id)}, ${escapeSql(perm.permission)}, ${formatTimestamp(perm.created_at)}
) ON CONFLICT (id) DO NOTHING;
`;
  });

  // Insert posts
  sql += `
-- ================================================
-- POSTS
-- ================================================
`;
  anonymizedPosts.forEach((post: Post) => {
    const contentJson = post.content_json ? `'${JSON.stringify(post.content_json).replace(/'/g, "''")}'::jsonb` : 'NULL';
    sql += `INSERT INTO posts (id, board_id, author_id, author_name, title, content, content_json, thumbnail_image_url, visibility, count_of_comments, count_of_replies, count_of_likes, engagement_score, week_days_from_first_day, created_at, updated_at) VALUES (
  ${escapeSql(post.id)}, ${escapeSql(post.board_id)}, ${escapeSql(post.author_id)}, ${escapeSql(post.author_name)}, ${escapeSql(post.title)}, ${escapeSql(post.content)}, ${contentJson}, ${escapeSql(post.thumbnail_image_url)}, ${escapeSql(post.visibility)}, ${post.count_of_comments}, ${post.count_of_replies}, ${post.count_of_likes}, ${post.engagement_score}, ${post.week_days_from_first_day || 'NULL'}, ${formatTimestamp(post.created_at)}, ${formatTimestamp(post.updated_at)}
) ON CONFLICT (id) DO NOTHING;
`;
  });

  // Insert comments
  sql += `
-- ================================================
-- COMMENTS
-- ================================================
`;
  anonymizedComments.forEach((comment: Comment) => {
    sql += `INSERT INTO comments (id, post_id, user_id, user_name, user_profile_image, content, count_of_replies, created_at, updated_at) VALUES (
  ${escapeSql(comment.id)}, ${escapeSql(comment.post_id)}, ${escapeSql(comment.user_id)}, ${escapeSql(comment.user_name)}, ${escapeSql(comment.user_profile_image)}, ${escapeSql(comment.content)}, ${comment.count_of_replies}, ${formatTimestamp(comment.created_at)}, ${formatTimestamp(comment.updated_at)}
) ON CONFLICT (id) DO NOTHING;
`;
  });

  // Insert replies
  sql += `
-- ================================================
-- REPLIES
-- ================================================
`;
  anonymizedReplies.forEach((reply: Reply) => {
    sql += `INSERT INTO replies (id, comment_id, post_id, user_id, user_name, user_profile_image, content, created_at, updated_at) VALUES (
  ${escapeSql(reply.id)}, ${escapeSql(reply.comment_id)}, ${escapeSql(reply.post_id)}, ${escapeSql(reply.user_id)}, ${escapeSql(reply.user_name)}, ${escapeSql(reply.user_profile_image)}, ${escapeSql(reply.content)}, ${formatTimestamp(reply.created_at)}, ${formatTimestamp(reply.updated_at)}
) ON CONFLICT (id) DO NOTHING;
`;
  });

  // Insert reactions
  sql += `
-- ================================================
-- REACTIONS
-- ================================================
`;
  anonymizedReactions.forEach((reaction: Reaction) => {
    sql += `INSERT INTO reactions (id, comment_id, reply_id, user_id, reaction_type, user_name, user_profile_image, created_at) VALUES (
  ${escapeSql(reaction.id)}, ${escapeSql(reaction.comment_id)}, ${escapeSql(reaction.reply_id)}, ${escapeSql(reaction.user_id)}, ${escapeSql(reaction.reaction_type)}, ${escapeSql(reaction.user_name)}, ${escapeSql(reaction.user_profile_image)}, ${formatTimestamp(reaction.created_at)}
) ON CONFLICT (id) DO NOTHING;
`;
  });

  sql += `
-- ================================================
-- SEED COMPLETE
-- ================================================
`;

  // Step 11: Write to file
  const outputPath = path.join(path.dirname(__dirname), '..', 'supabase', 'seed.sql');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, sql, 'utf-8');

  console.log('✅ SQL seed file generated successfully!');
  console.log(`📁 Output: ${outputPath}`);
  console.log(`
📊 Summary:
   - Users: ${anonymizedUsers.length}
   - Boards: 1
   - Posts: ${anonymizedPosts.length}
   - Comments: ${anonymizedComments.length}
   - Replies: ${anonymizedReplies.length}
   - Reactions: ${anonymizedReactions.length}
   - Permissions: ${permissions.length}

🔐 Test login credentials:
   Email: test@test.local
   Password: test1234
`);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
