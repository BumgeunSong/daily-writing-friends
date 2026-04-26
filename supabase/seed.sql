-- ================================================
-- SEED DATA FOR DAILY WRITING FRIENDS
-- Generated: 2026-02-21T10:12:41.654Z
-- ================================================
-- This seed file contains anonymized data extracted from production.
-- Test login: test@test.local / test1234
-- ================================================

-- ================================================
-- AUTH USER (test login)
-- ================================================
-- The auth user for test@test.local is NOT created by this seed script.
-- Create it via Supabase Dashboard or CLI so that:
--   * auth.users.id is a valid UUID
--   * auth.identities has a matching row for password sign-in
--
-- Example using supabase CLI (after supabase start):
--   curl -X POST 'http://localhost:54321/auth/v1/admin/users' \
--     -H 'Authorization: Bearer <service_role_key>' \
--     -H 'Content-Type: application/json' \
--     -d '{"email":"test@test.local","password":"test1234","email_confirm":true}'
--
-- Then update the first app user to link to the auth UUID:
--   UPDATE users SET id = '<auth-uuid>' WHERE id = 'a2ba1933-0738-54a8-88eb-4a0287ed717c';

-- ================================================
-- USERS
-- ================================================
INSERT INTO users (id, real_name, nickname, email, profile_photo_url, bio, phone_number, referrer, recovery_status, timezone, known_buddy_uid, created_at, updated_at) VALUES (
  'a2ba1933-0738-54a8-88eb-4a0287ed717c', 'Test User 1', 'TestUser1', 'test@test.local', NULL, 'Test bio for user 1', NULL, NULL, NULL, 'Asia/Seoul', NULL, '2026-01-15T12:40:07.896+00:00', '2025-08-07T05:07:31.881+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id, real_name, nickname, email, profile_photo_url, bio, phone_number, referrer, recovery_status, timezone, known_buddy_uid, created_at, updated_at) VALUES (
  'dceb8561-3ca9-43ca-baf7-402f8ea44334', 'Test User 2', 'TestUser2', 'user-2@test.local', NULL, 'Test bio for user 2', NULL, NULL, 'none', 'Asia/Seoul', NULL, '2026-01-15T12:40:07.895+00:00', '2025-07-18T03:04:47.317+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id, real_name, nickname, email, profile_photo_url, bio, phone_number, referrer, recovery_status, timezone, known_buddy_uid, created_at, updated_at) VALUES (
  '78d0d8f9-3686-5879-a1e8-af8d88969449', 'Test User 3', 'TestUser3', 'user-3@test.local', NULL, 'Test bio for user 3', NULL, NULL, NULL, 'Asia/Seoul', NULL, '2026-01-15T12:40:07.895+00:00', '2026-01-15T12:40:07.895+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id, real_name, nickname, email, profile_photo_url, bio, phone_number, referrer, recovery_status, timezone, known_buddy_uid, created_at, updated_at) VALUES (
  '88f5aa6e-3078-56ce-a117-42f1c5f4c399', 'Test User 4', 'TestUser4', 'user-4@test.local', NULL, 'Test bio for user 4', NULL, NULL, NULL, 'Asia/Seoul', NULL, '2026-01-15T12:40:07.896+00:00', '2026-01-15T12:40:07.896+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id, real_name, nickname, email, profile_photo_url, bio, phone_number, referrer, recovery_status, timezone, known_buddy_uid, created_at, updated_at) VALUES (
  'bc857a00-a843-5413-bd5d-4228813022aa', 'Test User 5', 'TestUser5', 'user-5@test.local', NULL, 'Test bio for user 5', NULL, NULL, NULL, 'Asia/Seoul', NULL, '2026-01-15T12:40:07.896+00:00', '2025-06-04T14:09:09.527+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id, real_name, nickname, email, profile_photo_url, bio, phone_number, referrer, recovery_status, timezone, known_buddy_uid, created_at, updated_at) VALUES (
  '1d7073a6-d31e-5ab8-8506-21df0fb85ed0', 'Test User 6', 'TestUser6', 'user-6@test.local', NULL, 'Test bio for user 6', NULL, NULL, NULL, 'Asia/Seoul', NULL, '2026-01-15T12:40:07.896+00:00', '2025-06-05T10:59:23.055+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id, real_name, nickname, email, profile_photo_url, bio, phone_number, referrer, recovery_status, timezone, known_buddy_uid, created_at, updated_at) VALUES (
  'ee412e4c-37a5-583b-a4db-69ff68d392ac', 'Test User 7', 'TestUser7', 'user-7@test.local', NULL, 'Test bio for user 7', NULL, NULL, NULL, 'Asia/Seoul', NULL, '2026-01-15T12:40:07.896+00:00', '2026-01-15T12:40:07.896+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id, real_name, nickname, email, profile_photo_url, bio, phone_number, referrer, recovery_status, timezone, known_buddy_uid, created_at, updated_at) VALUES (
  'ff644a98-e07e-58ce-afee-12a2f31fcce2', 'Test User 8', 'TestUser8', 'user-8@test.local', NULL, 'Test bio for user 8', NULL, NULL, NULL, 'Asia/Seoul', NULL, '2026-01-15T12:40:07.896+00:00', '2025-07-21T14:13:18.769+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id, real_name, nickname, email, profile_photo_url, bio, phone_number, referrer, recovery_status, timezone, known_buddy_uid, created_at, updated_at) VALUES (
  'd7c7f1f5-6d7d-5e99-b2ac-b6c20229c35b', 'Test User 9', 'TestUser9', 'user-9@test.local', NULL, 'Test bio for user 9', NULL, NULL, NULL, 'Asia/Seoul', NULL, '2026-01-15T12:40:07.896+00:00', '2026-01-15T12:40:07.896+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id, real_name, nickname, email, profile_photo_url, bio, phone_number, referrer, recovery_status, timezone, known_buddy_uid, created_at, updated_at) VALUES (
  '42d747cc-da70-5859-8e76-dac31f903e28', 'Test User 10', 'TestUser10', 'user-10@test.local', NULL, 'Test bio for user 10', NULL, NULL, 'none', 'Asia/Seoul', NULL, '2026-01-15T12:40:07.896+00:00', '2025-06-13T13:12:54.567+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id, real_name, nickname, email, profile_photo_url, bio, phone_number, referrer, recovery_status, timezone, known_buddy_uid, created_at, updated_at) VALUES (
  '8e90f340-b30a-5bee-8ba3-9f267bc4ffd9', 'Test User 11', 'TestUser11', 'user-11@test.local', NULL, 'Test bio for user 11', NULL, NULL, NULL, 'Asia/Seoul', NULL, '2026-01-15T12:40:07.896+00:00', '2026-01-15T12:40:07.896+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id, real_name, nickname, email, profile_photo_url, bio, phone_number, referrer, recovery_status, timezone, known_buddy_uid, created_at, updated_at) VALUES (
  'aeb7d8aa-0500-5797-be9a-14a65115292b', 'Test User 12', 'TestUser12', 'user-12@test.local', NULL, 'Test bio for user 12', NULL, NULL, NULL, 'Asia/Seoul', NULL, '2026-01-15T12:40:07.896+00:00', '2025-12-14T15:05:57.647+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id, real_name, nickname, email, profile_photo_url, bio, phone_number, referrer, recovery_status, timezone, known_buddy_uid, created_at, updated_at) VALUES (
  '6caf028e-0bc8-5577-896a-3993b93b1b5f', 'Test User 13', 'TestUser13', 'user-13@test.local', NULL, 'Test bio for user 13', NULL, NULL, NULL, 'Asia/Seoul', NULL, '2026-01-15T12:40:07.896+00:00', '2025-10-20T23:30:33.822+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id, real_name, nickname, email, profile_photo_url, bio, phone_number, referrer, recovery_status, timezone, known_buddy_uid, created_at, updated_at) VALUES (
  'b622ca12-56fa-5202-b8df-2c962808ff33', 'Test User 14', 'TestUser14', 'user-14@test.local', NULL, 'Test bio for user 14', NULL, NULL, NULL, 'Asia/Seoul', NULL, '2026-01-15T12:40:07.896+00:00', '2026-01-15T12:40:07.896+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id, real_name, nickname, email, profile_photo_url, bio, phone_number, referrer, recovery_status, timezone, known_buddy_uid, created_at, updated_at) VALUES (
  'a0eadc4e-c82d-5afb-a292-e7cc2b06d461', 'Test User 15', 'TestUser15', 'user-15@test.local', NULL, 'Test bio for user 15', NULL, NULL, NULL, 'Asia/Seoul', NULL, '2026-01-15T12:40:07.896+00:00', '2026-01-15T12:40:07.896+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id, real_name, nickname, email, profile_photo_url, bio, phone_number, referrer, recovery_status, timezone, known_buddy_uid, created_at, updated_at) VALUES (
  'a7dc4dc7-9d21-5dc6-960d-191739507c42', 'Test User 16', 'TestUser16', 'user-16@test.local', NULL, 'Test bio for user 16', NULL, NULL, NULL, 'Asia/Seoul', NULL, '2026-01-15T12:40:07.896+00:00', '2026-01-15T12:40:07.896+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO users (id, real_name, nickname, email, profile_photo_url, bio, phone_number, referrer, recovery_status, timezone, known_buddy_uid, created_at, updated_at) VALUES (
  '92bbbd24-00f2-5953-a25c-4f53f385e45f', 'Test User 17', 'TestUser17', 'user-17@test.local', NULL, 'Test bio for user 17', NULL, NULL, 'none', 'Asia/Seoul', NULL, '2026-01-15T12:40:07.896+00:00', '2025-07-23T01:52:12.229+00:00'
) ON CONFLICT (id) DO NOTHING;

-- ================================================
-- BOARDS
-- ================================================
INSERT INTO boards (id, title, description, first_day, last_day, cohort, created_at, updated_at) VALUES (
  '3d7JCRSD3sOPEacdqg6y', '매일 글쓰기 프렌즈 7기', '2024.12.02 - 2024.12.27', '2024-12-01T15:00:00.256+00:00', '2024-12-27T15:00:00.675+00:00', 7, '2024-12-01T10:54:30.226+00:00', '2024-12-01T10:54:30.226+00:00'
) ON CONFLICT (id) DO NOTHING;

-- ================================================
-- USER BOARD PERMISSIONS
-- ================================================
INSERT INTO user_board_permissions (id, user_id, board_id, permission, created_at) VALUES (
  '396a8e0b-21ae-4ec0-a169-2d026c18b263', 'dceb8561-3ca9-43ca-baf7-402f8ea44334', '3d7JCRSD3sOPEacdqg6y', 'write', '2026-01-15T13:26:55.588623+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO user_board_permissions (id, user_id, board_id, permission, created_at) VALUES (
  '46409841-69e8-410c-8bf7-2aad986cded8', '78d0d8f9-3686-5879-a1e8-af8d88969449', '3d7JCRSD3sOPEacdqg6y', 'write', '2026-01-15T13:26:55.588623+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO user_board_permissions (id, user_id, board_id, permission, created_at) VALUES (
  'ff2df867-e65b-4b25-a87e-a81a71a1518b', 'bc857a00-a843-5413-bd5d-4228813022aa', '3d7JCRSD3sOPEacdqg6y', 'write', '2026-01-15T13:26:55.588623+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO user_board_permissions (id, user_id, board_id, permission, created_at) VALUES (
  '68343e67-8a28-4f2f-81f2-cabf39bb096b', 'ee412e4c-37a5-583b-a4db-69ff68d392ac', '3d7JCRSD3sOPEacdqg6y', 'write', '2026-01-15T13:26:55.588623+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO user_board_permissions (id, user_id, board_id, permission, created_at) VALUES (
  '9cf88890-f4ab-4051-855b-4c3c1b2b229a', 'd7c7f1f5-6d7d-5e99-b2ac-b6c20229c35b', '3d7JCRSD3sOPEacdqg6y', 'write', '2026-01-15T13:26:55.588623+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO user_board_permissions (id, user_id, board_id, permission, created_at) VALUES (
  '9f256968-0de9-401b-b74d-ecd1f11c593e', '42d747cc-da70-5859-8e76-dac31f903e28', '3d7JCRSD3sOPEacdqg6y', 'write', '2026-01-15T13:26:55.588623+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO user_board_permissions (id, user_id, board_id, permission, created_at) VALUES (
  '9cdb9136-6827-49e8-948e-b421dd0e1859', 'aeb7d8aa-0500-5797-be9a-14a65115292b', '3d7JCRSD3sOPEacdqg6y', 'write', '2026-01-15T13:26:55.588623+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO user_board_permissions (id, user_id, board_id, permission, created_at) VALUES (
  '8bf7e894-ce9f-420d-b057-5427c3542a38', '6caf028e-0bc8-5577-896a-3993b93b1b5f', '3d7JCRSD3sOPEacdqg6y', 'write', '2026-01-15T13:26:55.588623+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO user_board_permissions (id, user_id, board_id, permission, created_at) VALUES (
  'ba6bebc8-1611-4a47-87a7-b8ec84fe61e3', 'b622ca12-56fa-5202-b8df-2c962808ff33', '3d7JCRSD3sOPEacdqg6y', 'write', '2026-01-15T13:26:55.588623+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO user_board_permissions (id, user_id, board_id, permission, created_at) VALUES (
  '710a80da-f6bd-4388-a1cf-e97cc649495c', 'a0eadc4e-c82d-5afb-a292-e7cc2b06d461', '3d7JCRSD3sOPEacdqg6y', 'write', '2026-01-15T13:26:55.588623+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO user_board_permissions (id, user_id, board_id, permission, created_at) VALUES (
  'dcf95782-0c36-4b3a-9cce-1512ae4686dc', '88f5aa6e-3078-56ce-a117-42f1c5f4c399', '3d7JCRSD3sOPEacdqg6y', 'write', '2026-01-15T13:26:55.588623+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO user_board_permissions (id, user_id, board_id, permission, created_at) VALUES (
  'c9a6db9e-2d89-4a25-a5f6-7efe131bcb52', '1d7073a6-d31e-5ab8-8506-21df0fb85ed0', '3d7JCRSD3sOPEacdqg6y', 'write', '2026-01-15T13:26:55.588623+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO user_board_permissions (id, user_id, board_id, permission, created_at) VALUES (
  'e87f284b-3ce5-448e-9077-cf3f64347d92', 'ff644a98-e07e-58ce-afee-12a2f31fcce2', '3d7JCRSD3sOPEacdqg6y', 'write', '2026-01-15T13:26:55.588623+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO user_board_permissions (id, user_id, board_id, permission, created_at) VALUES (
  '9042ee70-6bef-42a9-926d-d86fabf9c6a4', '8e90f340-b30a-5bee-8ba3-9f267bc4ffd9', '3d7JCRSD3sOPEacdqg6y', 'write', '2026-01-15T13:26:55.588623+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO user_board_permissions (id, user_id, board_id, permission, created_at) VALUES (
  'c88406d0-6d95-42e7-b022-1ff0be126e8a', 'a2ba1933-0738-54a8-88eb-4a0287ed717c', '3d7JCRSD3sOPEacdqg6y', 'write', '2026-01-15T13:26:55.588623+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO user_board_permissions (id, user_id, board_id, permission, created_at) VALUES (
  '0a9523f0-7db1-427d-bca0-43137c3f36ba', 'a7dc4dc7-9d21-5dc6-960d-191739507c42', '3d7JCRSD3sOPEacdqg6y', 'write', '2026-01-15T13:26:55.588623+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO user_board_permissions (id, user_id, board_id, permission, created_at) VALUES (
  'fc02d37f-84fc-4645-b4c9-06e6f6594f53', '92bbbd24-00f2-5953-a25c-4f53f385e45f', '3d7JCRSD3sOPEacdqg6y', 'write', '2026-01-15T13:26:55.588623+00:00'
) ON CONFLICT (id) DO NOTHING;

-- ================================================
-- POSTS
-- ================================================
INSERT INTO posts (id, board_id, author_id, author_name, title, content, content_json, thumbnail_image_url, visibility, count_of_comments, count_of_replies, count_of_likes, engagement_score, week_days_from_first_day, created_at, updated_at) VALUES (
  'VPzZCwBOj6mrcyf5HYxa', '3d7JCRSD3sOPEacdqg6y', 'a2ba1933-0738-54a8-88eb-4a0287ed717c', 'TestUser1', '두근', '<p>(속닥) 내일부터 꽃을 배우러 학원에 갑니다. </p><p>화훼장식기능사를 준비해보려고 해요.</p><p>대학생때부터 꽃을 좋아해서 도매시장에서 몇번 사다가 주위 사람들에게 나눠준 기억이 있는데요.</p><p>그 이후로 내가 해선 원하는 퀄리티가 안나온다는 생각에 꽃을 사길 즐겼었어요.</p><p>그러다가 작년 어버이날에 정말 오랜만에 카네이션 다발을 만들었었는데, 숙련도를 배워볼까? 란 생각이 들더라구요. </p><p>저에게 깨달음이나 결정들은 어느 순간 불현듯 찾아오는 것 같아요. </p><p>새로운 것을 도전해볼 준비가 됐다는 생각이 들었었거든요! </p><p>토요일 늦잠을 뒤로 미뤄두고 오랜만에 새로운 것을 배워보려 합니다. 신나네요!</p>', NULL, NULL, 'public', 0, 0, 0, 0, 24, '2025-01-03T14:12:13.494+00:00', '2025-01-03T14:12:13.494+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO posts (id, board_id, author_id, author_name, title, content, content_json, thumbnail_image_url, visibility, count_of_comments, count_of_replies, count_of_likes, engagement_score, week_days_from_first_day, created_at, updated_at) VALUES (
  'TByBn9SMN31pCRZEZ7Uj', '3d7JCRSD3sOPEacdqg6y', '8e90f340-b30a-5bee-8ba3-9f267bc4ffd9', 'TestUser11', '상징', '<p>연애 8년 만에 처음으로 여자친구와 커플링을 했습니다. 반지를 보며, 우리가 입는 것들은 대부분 사회적인 상징인 것이구나 싶었습니다.</p>', NULL, NULL, 'public', 0, 0, 0, 0, 23, '2025-01-02T14:57:44.398+00:00', '2025-01-02T14:57:44.398+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO posts (id, board_id, author_id, author_name, title, content, content_json, thumbnail_image_url, visibility, count_of_comments, count_of_replies, count_of_likes, engagement_score, week_days_from_first_day, created_at, updated_at) VALUES (
  'FrwXiPxZV6E0OAccAfYb', '3d7JCRSD3sOPEacdqg6y', 'a2ba1933-0738-54a8-88eb-4a0287ed717c', 'TestUser1', '새해 복 많이 받으세요!', '<p>새해 인사가 늦었네요.</p><p>벌써 12월이 다 가고 1월 하고도 3일을 앞뒀다는 사실이 믿기지 않아요.</p><p>운동을 한 시간은 더디게 가고, 운동을 쉬는 시간은 너무나 빨리 지나가는 것처럼,,</p><p>전 글을 쓰지 못했던 일주일동안 독감에 걸렸었고, 사이판으로 휴가를 다녀왔습니다!</p><p>겨울에 여름 나라를 처음 가봤는데 그래선지 새해가 아직 체감이 안되네요. 사이판의 바다와 물고기는 정말정말 예쁘더라구요 🐠</p><p>휴가 기간동안 하기 싫은 것에 하기 싫다고 저항하는 시간을 보냈던 것 같아요. </p><p>그래선지 쉼이 더 필요하다고 생각이 들지만, 운동을 하면 오히려 더 다른 것도 할 힘이 나는 것처럼 글쓰기부터 다시 시작해보려 합니다! 화이팅!</p>', NULL, NULL, 'public', 0, 0, 0, 0, 23, '2025-01-02T14:48:31.359+00:00', '2025-01-02T14:48:31.359+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO posts (id, board_id, author_id, author_name, title, content, content_json, thumbnail_image_url, visibility, count_of_comments, count_of_replies, count_of_likes, engagement_score, week_days_from_first_day, created_at, updated_at) VALUES (
  'lMpSD2p2cEgJPUSw5Jpo', '3d7JCRSD3sOPEacdqg6y', 'bc857a00-a843-5413-bd5d-4228813022aa', 'TestUser5', '재밌었어요', '<p>매글프 7기! 재밌었습니다!</p><p>오늘은 약주(?)도 한잔해서 알딸딸하다보니 짧게 적을게요. (항상 그랬던거 같긴한데)</p><p>다음 8기에서도 봐요 ㅎㅎ</p>', NULL, NULL, 'public', 1, 2, 0, 0, 20, '2024-12-30T14:13:30.264+00:00', '2024-12-30T14:13:30.264+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO posts (id, board_id, author_id, author_name, title, content, content_json, thumbnail_image_url, visibility, count_of_comments, count_of_replies, count_of_likes, engagement_score, week_days_from_first_day, created_at, updated_at) VALUES (
  'fOxFazI6PYah4UocZqPI', '3d7JCRSD3sOPEacdqg6y', '1d7073a6-d31e-5ab8-8506-21df0fb85ed0', 'TestUser6', '2024 🙋🏻‍♀️', '<p>24년도 안녕이네요. 올해는 제게 유독 의미있는 해였어요! 그래서인지 지나가는게 아쉽고 시원 섭섭한 마음이 들어요.</p><p>올해를 즐겁게 마무리 하고 있지만 한편으로는 최근 제주항공 사고로 마음이 무겁습니다. 인생이 참 순식간이고 허무한 것 같기도 해요. 그치만 그 순식간이고 허무한 마지막이 나에게는 언제 올지 모르는 일이기에 후회 없이 더 열심히 살아야겠다는 생각이 듭니다. 2024년도 모두 고생하셨습니다! </p><p>2025년도에 뵈어요 :)</p>', NULL, NULL, 'public', 1, 0, 0, 0, 20, '2024-12-30T14:11:19.864+00:00', '2024-12-30T14:11:58.634+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO posts (id, board_id, author_id, author_name, title, content, content_json, thumbnail_image_url, visibility, count_of_comments, count_of_replies, count_of_likes, engagement_score, week_days_from_first_day, created_at, updated_at) VALUES (
  'Sv7p7uDZNm5wt6B4jla5', '3d7JCRSD3sOPEacdqg6y', '88f5aa6e-3078-56ce-a117-42f1c5f4c399', 'TestUser4', '7기 마지막 글 저도 남깁니다', '<p>마지막 글을 빠뜨릴 수 없어서 저도 부리나케 남기러 왔습니다!</p><p><br></p><p>4주가 정말 후딱 지나갔군요.</p><p>매일 쓰기를 완벽하게 성공하지는 못했지만 끈을 아예 놓지 않으려 버둥대다 보니, 글쓰기는 어느새 하나의 습관이 되어있습니다. 언제 사라져버려도 이상하지 않을 엄청 약한 습관이지만요. 그래도 제가 원하는 글 잘쓰는 사람의 모습이 되기 위한 첫번째 걸음을 잘 뗀 것 같아 기분이 좋습니다.</p><p>그리고 열심히 따라와보니 자연스럽게 십수개의 저만의 글 조각들이 쌓여있는 것도 좋은 선물이네요. 얼마 되지 않았는데도 다시 읽으면 벌써 새롭게 느껴지는 것이 놀랍고, 나중에 읽을 때는 얼마나 더 새롭고 재미있을까 기대도 됩니다.</p><p><br></p><p>개인적으로 나름 성공적이었다고 느끼는 제 첫 매글프 시즌입니다!</p><p>다음 기수 때부터는 서서히 무게를 올리는 연습도 해야겠지요. 다른 분들처럼 한번씩은 특정 주제를 하나 잡고 풀어내는 글도 써보도록 해야겠습니다.</p><p><br></p><p>여러분 모두 바쁜 연말에 4주간 글 쓰시느라 고생 많으셨습니다! 가끔 글 읽어주시고 댓글 달아주셔서 감사했어요, 힘이 많이 됐습니다.</p><p>다음 기수, 그리고 2025년은 더 힘차게 보내봅시다. 다들 새해복 많이 받으세요!</p>', NULL, NULL, 'public', 1, 0, 0, 0, 20, '2024-12-27T16:15:49.179+00:00', '2024-12-27T16:17:56.955+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO posts (id, board_id, author_id, author_name, title, content, content_json, thumbnail_image_url, visibility, count_of_comments, count_of_replies, count_of_likes, engagement_score, week_days_from_first_day, created_at, updated_at) VALUES (
  'INHFISZdAcCiNz2qwtEt', '3d7JCRSD3sOPEacdqg6y', '6caf028e-0bc8-5577-896a-3993b93b1b5f', 'TestUser13', '마지막 글이라는 이야기듣고', '<p>적으러왔습니다.</p><p>벌써 크리스마스도 지났고 다음주는 새해군요. 항상 연말 분위기 나나 싶으면 바로 새해가 떡하니 등장하는 느낌이에요. 안그래도 짧게 느껴지는 연말연초인데 바쁘기까지하여 뭔가 그냥 평범한 평일같네요..  </p><p>그래도 매글프 하시는 분들 뵙고 글도 읽으면서 올해 마지막을 따뜻하게 보낸 것 같아 기분이 좋습니다. 감사해요!!! 모두 건강하시고 내년에 또 뵈어요🙇‍♂️</p>', NULL, NULL, 'public', 1, 0, 0, 0, 20, '2024-12-27T15:55:39.089+00:00', '2024-12-27T15:55:39.089+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO posts (id, board_id, author_id, author_name, title, content, content_json, thumbnail_image_url, visibility, count_of_comments, count_of_replies, count_of_likes, engagement_score, week_days_from_first_day, created_at, updated_at) VALUES (
  'TjFHAWFjAEMPc4cHbaxp', '3d7JCRSD3sOPEacdqg6y', '92bbbd24-00f2-5953-a25c-4f53f385e45f', 'TestUser17', '휴가 ', '<p>몇 분들이 휴가여서 글을 놓친다는 말을 하셨죠. 사실 그 때는 잘 이해가 가지 않았어요.</p><p>저는 어제부터 막 겨울방학을 시작했어요. 그랬더니 머리 속에 해야할 일 카테고리가 그냥 흔적도 없이 사라졌어요. 글 쓰기도..... 어 오늘 안 써도 되는 날 아닌가? 싶었는데 벌써 며칠을 놓쳤더라구요. 오늘은 7기의 마지막이라고 해서 부랴부랴 달려왔어요.</p><p>대신 오히려 안 해도 될 일, 굳이 안하던 일, 어쩌면 하고싶은데 시간이 없어 못했던 일들이 먼저 손에 잡히더라구요. 어느정도냐면요! 겨울방학 00시가 되자마자 방전 되어있던 예전 노트북을 꺼냈어요. 무려 매글프 사이트 개발을 하려구요! 처음보는 기술 환경이었지만 그래도 다 새롭고 재밌었어요. 어릴 때 하던 게임에 오랜만에 들어가 쪼렙 퀘스트를 깨는 느낌처럼요. 특히 나 때는 그런거 없었는데.. 코딩 도와주는 AI가 미쳤더라구요.</p><p>친구들과 나눌 연말 회고를 준비하면서 일 년을 되돌아봤어요. 아니 이게 작년 초가 아니라 올해라고? 싶을 정도로 까마득하더라구요. 일 년이라는 꽤 긴 시간을 지치지 않고 달려왔어요. 다른 동료분들처럼 멀리 여행을 가는 건 아니지만, 이번 겨울 방학은 제게 특히 더 달달할 것 같아요. 모두 연말 따스히 좋은 시간 되시길!</p>', NULL, NULL, 'public', 3, 0, 0, 0, 20, '2024-12-27T15:44:14.915+00:00', '2024-12-27T15:48:55.298+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO posts (id, board_id, author_id, author_name, title, content, content_json, thumbnail_image_url, visibility, count_of_comments, count_of_replies, count_of_likes, engagement_score, week_days_from_first_day, created_at, updated_at) VALUES (
  'WXOsF5yz3t6moOB1RmsS', '3d7JCRSD3sOPEacdqg6y', 'dceb8561-3ca9-43ca-baf7-402f8ea44334', 'TestUser2', '즐거운 코딩생활', '<p><img src="https://firebasestorage.googleapis.com/v0/b/artico-app-4f9d4.firebasestorage.app/o/postImages%2F20241228%2F001144_IMG_9379.jpeg?alt=media&amp;token=0649183a-5c33-4b5b-abd7-c38cb5fb7487">휴가다. 아무런 약속도 없다. 평화로운 집돌이 생활이다.</p><p><br></p><p>하루종일 코딩을 했다. 왜인지 몰라도 몰입이 엄청 잘됐다.</p><p><br></p><p>에디터 스타일이 늘 마음에 안 들었었는데 고쳤다. 이미지 기능 넣어달라고 후기에 쓰신 분이 있어서 필 받은 김에 이미지 기능도 넣었다.</p><p><br></p><p>이미지 처리 관련해서 몇가지 버그를 겪었지만 구글과 GPT-4 와 Claude 의 도움으로 잘 헤처나왔다.</p><p><br></p><p>오랜만에 거의 7시간 가까이를 일어나지도 않고 계속 집중했던 거 같다. 밥 먹는 시간 빼고 계속 코딩을 했다. 옛날에 취준하던 개발지망생 시절이 생각났다.</p><p><br></p><p>당장 눈에 보이는 기능들이 쑥쑥 생겨나서 몰입이 됐나보다. 그 느낌이 있다. 조금만 더 하면 될 것 같은데.. 될 것 같은데 하는 느낌. 화장실도 참았다가 이것만 하고 가야지 하고 못 간다.</p><p><br></p><p>또 하나 재밌었던 일은 DB 와 백엔드 로직을 짜는 일이었다. 사진 업로드 기능 다음으로 개인별 글쓰기 통계를 볼수 있는 기능을 넣을 예정이다. 어떤 통계들이 필요할지 지표들을 정의하고, 그것을 계산해내려면 어떤 식이 필요한지 공책에 썼다.</p><p><br></p><p>예를 들어 어떤 유저가 오늘 글을 썼는지 여부를 보여주려한다. 데이터는 어떤 형태로 저장돼야할까? 단순 맵이 좋을까 아니면 스케일러블한 서브콜렉션이 좋을까?</p><p><br></p><p>계산과 업데이트는 매일 밤 자정에 실행되어야할까? 아니면 글을 쓴 시점? 어떻게 조회해야 효율적일까? 여기 밑에다 넣어야하나? 바깥으로 꺼내야하나?</p><p><br></p><p>뭐 이런 것들을 쿰짝콩짝 머릿속에서 굴리다보니 재미있었다. 그 와중에 dB 와 관련된 지식들을 검색해서 보기도 하고. AI 한테 데이터 모델링을 추천해달라고도 했다.</p><p><br></p><p>결국 가장 괜찮은 안이 나왔고. 어떻게 기능을 구현하면 되겠다는 플랜이 머리에 섰다.</p><p><br></p><p>이런 일은 사실 클라이언트 개발자가 잘 하는 일은 아닌데, 이것도 꽤 재밌다는 걸 느꼈다. 어쩌면 백엔드도 적성에 맞을지도..? ㅋㅋ</p>', NULL, 'https://firebasestorage.googleapis.com/v0/b/artico-app-4f9d4.firebasestorage.app/o/postImages%2F20241228%2F001144_IMG_9379.jpeg?alt=media&token=0649183a-5c33-4b5b-abd7-c38cb5fb7487', 'public', 3, 0, 0, 0, 19, '2024-12-27T14:59:37.528+00:00', '2024-12-27T15:11:53.407+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO posts (id, board_id, author_id, author_name, title, content, content_json, thumbnail_image_url, visibility, count_of_comments, count_of_replies, count_of_likes, engagement_score, week_days_from_first_day, created_at, updated_at) VALUES (
  'QyNk8dvbdtTCxlkNcyul', '3d7JCRSD3sOPEacdqg6y', '78d0d8f9-3686-5879-a1e8-af8d88969449', 'TestUser3', '24년의 마지막 금요일', '<p>아직 며칠 남아서 그런가 2024년이 지나가고 있단게 실감이 나진 않는다.</p><p>그러다 오늘이 24년의 마지막 금요일이란 사실에 화들짝 놀랐다.</p><p>“마지막”이라는 단어가 주는 무게감이 사뭇 진지하게 다가온다.</p><p>마지막 주말, 마지막 월요일, 마지막 화요일. </p><p>그리고 새로운 해를 맞이하겠지.</p>', NULL, NULL, 'public', 2, 0, 0, 0, 19, '2024-12-27T14:21:37.681+00:00', '2024-12-27T14:21:37.681+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO posts (id, board_id, author_id, author_name, title, content, content_json, thumbnail_image_url, visibility, count_of_comments, count_of_replies, count_of_likes, engagement_score, week_days_from_first_day, created_at, updated_at) VALUES (
  '7uEFePdFBDIopCRmyHYT', '3d7JCRSD3sOPEacdqg6y', 'ff644a98-e07e-58ce-afee-12a2f31fcce2', 'TestUser8', '머니볼', '<p><strong>부제: 어떤 숫자를 볼 것인가, 그 지표를 믿을 것인가, 그 지표에 따라 행동할 것인가</strong></p><p>&lt;머니볼&gt;은 오클랜드 애틀레틱스의 불리하고 가난한 게임을 승리로 이끈 빌리 빈 단장과 오클랜드 프론트에 대한 이야기다. 내가 좋아하는 드라마 &lt;스토브리그&gt;의 아이디어 원천이 되었을만한 이야기인데, 드라마보다 더 손에 땀을 쥐게 하는 실화다.</p><p>오클랜드 프론트는 선수 출신의 일반적인 스카우터라면 꺼릴 만한 단점을 가진 (뚱뚱한 몸매, 좋지 않은 얼굴, 이상한 투구 자세 등) 낮은 가격의 선수를, 본인들이 가장 중요하게 여기는 특정 지표들에서 높은 점수를 달성할 경우 ''옳타쿠나'' 하면서 사와서 고예산 팀의 반절에 불과한 총 연봉으로도 2002년 정규시즌 서부 4개 팀 중 가장 우수한 성적을 기록했다. "저평가된, 그러나 잘 성과를 낼 수 있는 좋은 자산"을 매입한다는 측면에서 워런 버핏과도 통하는 결이 있어 빌리 빈 단장은 "좋은 투자처를 찾는 일이 가장 어렵다"는 워런 버핏의 말을 자주 인용하곤 했다. </p><p>이 팀의 대단한 점은 한 두 가지가 아니지만 - 전반부를 잘 플레이하지 못한 후의 여름 시즌에도 트레이드를 통해 포기하지 않는 끈질김, 다른 야구단과 대담하고 승부사적인 트레이딩을 하는 단장의 역량 등 - 가장 대단하다고 생각한 것은 <strong>자신들만의 관점을 끝까지 관철시킨 실험적인 프론트의 일하는 방식</strong>이었다.</p><p>오클랜드 프론트는 통계적이고 과학적으로 "플레이오프에 가기 위한 이긴 게임 수 (95게임) &gt; 필요한 승점 차이 (135점) &gt; 승점을 내기 위한 핵심 지표 (출루율, 장타율)" 의 순으로 당시 누구도 출루율, 장타율 같은 것을 중요시하지 않을 때에 두 지표를 가장 중요한 스카우트 지표로 내세웠다.  이를 위해 포기해야 했던 것은 출루와 장타를 만드는 타자를 스카우트 하기 위해 수비와 투수에서 돈을 가장 적게 쓰는 것이었으며, 충분한 통계 데이터가 모인 선수들이 의미 있었기 때문에 여러 게임 끝에 충분한 데이터가 쌓인 대학 선수들을 스카우트 함으로써 보통 선호되는 ''루키'' 고교 선수를 스카우트하지 않는 것이었다.</p><p>''무슨 지표가 가장 중요한가?'' 통계적인 분석으로 이럴 것 같다 이야기하는 것은 가능한데, 그에 맞춰서 모든 스카우터들의 ''직감''을 버리고, 기자와 팬들의 야유를 들으면서 자신들의 기준에 맞는 선수를 지명한다는 것은 ''고된 실험 끝에 진짜 진실이 저기 있다''는 믿음이 있어야만 가능한 것이므로 그 결단과 그를 가능하게 한 오클랜드 프론트와 빌리 빈 단장의 태도는 애플의 광고 슬로건인 ''Think Different''를 떠오르게 한다. </p><p>나아가, 한 번 경기가 시작되면 그 결과를 숨죽이며 지켜보고 드라마로 생각하기보다, 선수들이 어떤 환경에서 어떻게 반응하는지, 진짜 팀플레이를 위해 주문한 것 - 볼넷을 해서 1루로 옮겨가는 것, 실점 가능성 있는 도루를 하지 말 것, 별로인 공을 치지 말 것 - 을 해내는지를 실험적으로 살펴보고 면밀하게 관찰하는 것 또한 이들이 다르게 생각한 부분이다. (그러니까 Output이 아닌 Input을 관측하는 것.)</p><p>어쩌면 낮은 예산의 구단이라는 한계가 이들로 하여금 창의적으로 생각하게 만들었는지도 모르겠다. 여하튼, 배울 것이 정말 많고, 또, 아주 재미있게 읽은 책이었다. VC나 스타트업의 관점에서 어떤 것들이 데이터화 될 수 있을지, 무엇이 ''저평가된 우량주''를 발견하게 될 만한 키일지도 같이 고민할 수 있는 질문을 던져주었다. 과연 그러한 데이터가 있는가? 그리고 야구와 같은 Finite game이 아닌 기업과 같은 Infinite game을 어떻게 측정해서 어떻게 ''이 지표는 옳다''고 단정할 수 있겠는가?</p>', NULL, NULL, 'public', 1, 2, 0, 0, 19, '2024-12-27T12:19:38.075+00:00', '2024-12-27T12:19:38.075+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO posts (id, board_id, author_id, author_name, title, content, content_json, thumbnail_image_url, visibility, count_of_comments, count_of_replies, count_of_likes, engagement_score, week_days_from_first_day, created_at, updated_at) VALUES (
  'wqfdy0PDVvWmJxEQ0R83', '3d7JCRSD3sOPEacdqg6y', 'aeb7d8aa-0500-5797-be9a-14a65115292b', 'TestUser12', '새해 준비', '<p>감기기운은 잘 떨어지지 않고, 배도 아프고...</p><p>컨디션이 영 좋지 않은 연말입니다.</p><p><br></p><p>덕분에 침대와 한몸이 되어 느긋하게 책도 읽고, 새해 목표도 세우고 있어요.</p><p>쭉 적어 내려간 새해 목표를 보니까 기분만큼은 좋습니다.</p><p><br></p><p>모두 건강 조심하시고 행복한 연말 되세요!</p>', NULL, NULL, 'public', 2, 0, 0, 0, 19, '2024-12-27T10:35:42.531+00:00', '2024-12-27T10:35:42.531+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO posts (id, board_id, author_id, author_name, title, content, content_json, thumbnail_image_url, visibility, count_of_comments, count_of_replies, count_of_likes, engagement_score, week_days_from_first_day, created_at, updated_at) VALUES (
  'cAqsZQwgEjf1mYIJi23r', '3d7JCRSD3sOPEacdqg6y', 'b622ca12-56fa-5202-b8df-2c962808ff33', 'TestUser14', '아침이 밝았다', '<p>일본에서의 셋째날 아침이 밝았다.</p><p>뭔지 모를 업무 부채감에 슬랙부터 들어가 본다 ㅋㅋ 음.. 다행히 큰 일이 터진 것은 없군.</p><p><br></p><p>계획을 하는 것을 선호하지는 않지만, 도쿄의 연말은 식당을 예약하지않으면 식사를 하기 어렵다. 오늘은 장어 덮밥과 해산물 돈부리를 먹으러가는 날이다. 설렌다.</p><p><br></p><p>어렸을 때 보다 여행의 자극적인 맛은 떨어지지만 오히려 여행을 조금 일상처럼 보낼 수 있게 된 것 같다. 특히 일본은, 나와 좀 잘 맞는 곳인 것 같다. 내 얼굴은 왜색이 좀 있다.</p><p><br></p><p>어제도 글을 쓰지 못했다. 정말 글은 습관이라는 것을 깨닫는다. 안 쓰다보면 놓치게되는 것 같다. </p><p><br></p><p>스미마셍. 간바레! 앞으로 더 열심히.</p>', NULL, NULL, 'public', 1, 0, 0, 0, 19, '2024-12-27T00:17:54.899+00:00', '2024-12-27T00:17:54.899+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO posts (id, board_id, author_id, author_name, title, content, content_json, thumbnail_image_url, visibility, count_of_comments, count_of_replies, count_of_likes, engagement_score, week_days_from_first_day, created_at, updated_at) VALUES (
  'bCsbVjQkZZj8MIbjvuII', '3d7JCRSD3sOPEacdqg6y', '78d0d8f9-3686-5879-a1e8-af8d88969449', 'TestUser3', '산딸기 일화', '<p>어렸을 때 교보문고를 가면 엄마와 꼭 먹던 산딸기 무스케이크가 있었다. 산딸기 잼의 새큼상큼함과 부드러운 케익 무스가 한데 어우러진 맛이다. 이 맛은 내 향수를 자극한다. 엄마와의 소중한 시간 속엔 따뜻함, 위로, 격려, 믿음, 사랑이 있다.</p><p>이제 그 카페는 없어졌다. 그 맛을 찾으려고 여러 산딸기 무스케이크를 먹어봤다. 지금까진 한스케익의 산딸기무스가 제일 비슷하다. 이걸 찾았을 때 얼마나 안도감이 들었는지 모른다.</p><p>나와 엄마 사이엔 또 다른 산딸기 이야기가 있다. 엄마는 시골에서 자라서 산나무 열매나 풀들을 잘 안다. 어느 어린 날 외갓댁에서 엄마와 산책하다 산딸기를 발견했다. 약간의 비탈길에 산딸기가 맺혀있었는데 엄마가 성큼성큼 풀 더미를 헤쳐 산딸기를 따줬다. 그때가 아마 내 인생 첫 산딸기였을 것이다.</p><p>그때의 기억은 나에게도 엄마에게도 오래 남았다. 엄마는 여름에 산딸기가 마트에 등장하기 시작하면 꼭 나를 위해 한 통 사둔다. (산딸기 한 통은 꽤 비싸다.) 산딸기는 한 웅큼 쥐어 먹어야 맛있다. 특유의 씨앗이 과육과 함께 오독오독 씹히는 재미가 있다.</p><p>나는 산딸기 잼이 들어있는 디저트를 좋아하는데 맛도 맛이지만 이런 기억들이 있어서 더 좋게 느껴지는게 아닐까 싶다. 오늘은 프릳츠에서 산딸기 크루아상을 먹었다. 아주 만족스러운 맛이었기에 산딸기 일화를 글로 남겨본다.</p>', NULL, NULL, 'public', 3, 4, 0, 0, 19, '2024-12-26T15:58:00.794+00:00', '2024-12-26T16:00:50.854+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO posts (id, board_id, author_id, author_name, title, content, content_json, thumbnail_image_url, visibility, count_of_comments, count_of_replies, count_of_likes, engagement_score, week_days_from_first_day, created_at, updated_at) VALUES (
  'cHCCouxYOKl8os8lInKC', '3d7JCRSD3sOPEacdqg6y', 'd7c7f1f5-6d7d-5e99-b2ac-b6c20229c35b', 'TestUser9', '제주여행', '<p>크리스마스를 친구 부부와 보냈습니다!!</p><p><br></p><p>4박 5일의 여행이에요. 완전체는 세 부부지만 이번에는 두 부부만 함께했습니다. 이번에 여행에서는 각자의 새로운 면모를 만날수 있었어요.</p><p><br></p><p>특히 제 아내의 변화하는 모습에 놀랐습니다. 저는 못 먹는게 많은 스타일이에요. 특히 물컹물컹한 식감을 매우 싫어합니다. 아내도 못먹는 음식들이 많았는데 점점 먹기 시작했어요. 이번 여행에서 제가 못먹는 음식들에 모두 도전하더군요. </p><p><br></p><p>대단하다고 생각했어요. 음식뿐만 아니라 제가 제안하는 코칭이나 영어 같은 다양한 영역도 잘 받아드려요. 절대 못먹는 족발도 다음 모임에서는 먹자고 하네요..</p><p><br></p><p>저도 더 많은 것들은 경험하고 받아들이는 사람이 되고 싶습니다. 함께 영역을 넓혀나가볼게여..</p>', NULL, NULL, 'public', 1, 0, 0, 0, 19, '2024-12-26T15:21:42.4+00:00', '2024-12-26T15:21:42.4+00:00'
) ON CONFLICT (id) DO NOTHING;

-- ================================================
-- COMMENTS
-- ================================================
INSERT INTO comments (id, post_id, user_id, user_name, user_profile_image, content, count_of_replies, created_at, updated_at) VALUES (
  'UyEkiKcopWQrka74yzkm', 'INHFISZdAcCiNz2qwtEt', '1d7073a6-d31e-5ab8-8506-21df0fb85ed0', 'TestUser6', NULL, '내년에 뵈어요 :) ', 0, '2024-12-30T14:13:09.564+00:00', '2024-12-30T14:13:09.564+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO comments (id, post_id, user_id, user_name, user_profile_image, content, count_of_replies, created_at, updated_at) VALUES (
  'Crp59Pc0zmyYaX8alLaU', 'QyNk8dvbdtTCxlkNcyul', '1d7073a6-d31e-5ab8-8506-21df0fb85ed0', 'TestUser6', NULL, '저도 이틀후가 새로운 해라는게 실감이 안나요 ㅎㅎ 가영님 이번기수에는 꼭 뵈어요!😆', 0, '2024-12-30T14:16:00.108+00:00', '2024-12-30T14:16:00.108+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO comments (id, post_id, user_id, user_name, user_profile_image, content, count_of_replies, created_at, updated_at) VALUES (
  'sNUQf4gOP9RwZaDvrFed', 'QyNk8dvbdtTCxlkNcyul', 'dceb8561-3ca9-43ca-baf7-402f8ea44334', 'TestUser2', NULL, '마지막 금요일에 뭐하셨나요-?', 0, '2024-12-27T15:04:55.608+00:00', '2024-12-27T15:04:55.608+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO comments (id, post_id, user_id, user_name, user_profile_image, content, count_of_replies, created_at, updated_at) VALUES (
  '4htukv8rAsgRY78qnZSL', 'Sv7p7uDZNm5wt6B4jla5', '1d7073a6-d31e-5ab8-8506-21df0fb85ed0', 'TestUser6', NULL, '찬희님 올해 고생하셨습니다. 내년에도 열심히 글 써봐요! ', 0, '2024-12-30T14:12:44.35+00:00', '2024-12-30T14:12:44.35+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO comments (id, post_id, user_id, user_name, user_profile_image, content, count_of_replies, created_at, updated_at) VALUES (
  'D88gMDxzAcTIWkubbRaX', 'TjFHAWFjAEMPc4cHbaxp', '88f5aa6e-3078-56ce-a117-42f1c5f4c399', 'TestUser4', NULL, '친구들과 연말 회고를 나누시는군요 멋지네요!', 0, '2024-12-27T16:19:01.865+00:00', '2024-12-27T16:19:01.865+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO comments (id, post_id, user_id, user_name, user_profile_image, content, count_of_replies, created_at, updated_at) VALUES (
  'MuBmruBuZaZrvreRspYx', 'TjFHAWFjAEMPc4cHbaxp', '1d7073a6-d31e-5ab8-8506-21df0fb85ed0', 'TestUser6', NULL, '친구들과 하는 연말 회고라니.. 색다르네요! 연말 잘보내세요 유진님🤗', 0, '2024-12-30T14:14:03.664+00:00', '2024-12-30T14:14:03.664+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO comments (id, post_id, user_id, user_name, user_profile_image, content, count_of_replies, created_at, updated_at) VALUES (
  'qc9XllqxQBMODDqluZ6H', 'TjFHAWFjAEMPc4cHbaxp', '6caf028e-0bc8-5577-896a-3993b93b1b5f', 'TestUser13', NULL, '연말 잘보내세요!!', 0, '2024-12-27T15:56:19.733+00:00', '2024-12-27T15:56:19.733+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO comments (id, post_id, user_id, user_name, user_profile_image, content, count_of_replies, created_at, updated_at) VALUES (
  'KugMU9IduVQEpzqcLfBI', 'WXOsF5yz3t6moOB1RmsS', '92bbbd24-00f2-5953-a25c-4f53f385e45f', 'TestUser17', NULL, '이야 ... 즐거운 시간 보내셨군요. 이것저것 삽질하고 머리 쓰다 지나간 시간을 보면 헉 벌써 시간이! 싶은데 이렇게 몰입해서 재미보는 게 또 어딘가 싶어요! ', 0, '2024-12-27T15:35:32.464+00:00', '2024-12-27T15:35:32.464+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO comments (id, post_id, user_id, user_name, user_profile_image, content, count_of_replies, created_at, updated_at) VALUES (
  'gFXKtRd9hQSOHUWbFEEp', 'WXOsF5yz3t6moOB1RmsS', '6caf028e-0bc8-5577-896a-3993b93b1b5f', 'TestUser13', NULL, '감사합니다 범근님.. 저도 얼른 조인하겠습니다', 0, '2024-12-27T15:57:21.2+00:00', '2024-12-27T15:57:21.2+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO comments (id, post_id, user_id, user_name, user_profile_image, content, count_of_replies, created_at, updated_at) VALUES (
  'oawemnfnNVZO6GW43aGG', 'WXOsF5yz3t6moOB1RmsS', '1d7073a6-d31e-5ab8-8506-21df0fb85ed0', 'TestUser6', NULL, 'ㅋㅋㅋㅋㅋ직장인에게 휴가란 집 그자체 인정입니다.. ', 0, '2024-12-30T14:14:37.162+00:00', '2024-12-30T14:14:37.162+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO comments (id, post_id, user_id, user_name, user_profile_image, content, count_of_replies, created_at, updated_at) VALUES (
  'fKoGpSSprQlqs5lONupJ', 'cAqsZQwgEjf1mYIJi23r', 'dceb8561-3ca9-43ca-baf7-402f8ea44334', 'TestUser2', NULL, '특히 일본은, 나와 좀 잘 맞는 곳인 것 같다. 내 얼굴은 왜색이 좀 있다.

>> ㅋㅋㅋㅋ 예..?', 0, '2024-12-27T15:09:08.929+00:00', '2024-12-27T15:09:08.929+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO comments (id, post_id, user_id, user_name, user_profile_image, content, count_of_replies, created_at, updated_at) VALUES (
  'Ta0IJQwq3x1UmZG7II6E', 'cHCCouxYOKl8os8lInKC', 'b622ca12-56fa-5202-b8df-2c962808ff33', 'TestUser14', NULL, '족발가자!', 0, '2024-12-27T00:00:36.18+00:00', '2024-12-27T00:00:36.18+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO comments (id, post_id, user_id, user_name, user_profile_image, content, count_of_replies, created_at, updated_at) VALUES (
  'tvmsOqHwu2PLaGPzh8QY', 'fOxFazI6PYah4UocZqPI', 'bc857a00-a843-5413-bd5d-4228813022aa', 'TestUser5', NULL, '고생했어요!', 0, '2024-12-30T14:12:15.816+00:00', '2024-12-30T14:12:15.816+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO comments (id, post_id, user_id, user_name, user_profile_image, content, count_of_replies, created_at, updated_at) VALUES (
  'kNhi8oPgHg5meOIRpwYf', 'wqfdy0PDVvWmJxEQ0R83', 'dceb8561-3ca9-43ca-baf7-402f8ea44334', 'TestUser2', NULL, '체력을 쌓는 중이시군요 b', 0, '2024-12-27T15:08:38.216+00:00', '2024-12-27T15:08:38.216+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO comments (id, post_id, user_id, user_name, user_profile_image, content, count_of_replies, created_at, updated_at) VALUES (
  '2e9fRR7BfAfoANDy3FlI', 'wqfdy0PDVvWmJxEQ0R83', '92bbbd24-00f2-5953-a25c-4f53f385e45f', 'TestUser17', NULL, '새로운 시작에 여유가 가득해서 좋네요 b', 0, '2024-12-27T15:50:12.419+00:00', '2024-12-27T15:50:12.419+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO comments (id, post_id, user_id, user_name, user_profile_image, content, count_of_replies, created_at, updated_at) VALUES (
  'YQB39iPNzfLw9bXK7cBj', '7uEFePdFBDIopCRmyHYT', 'dceb8561-3ca9-43ca-baf7-402f8ea44334', 'TestUser2', NULL, 'VC 가 봐야할 ’출루율‘ 지표는 무엇일까요? 그걸 어떻게 관철할 수 있을까요?', 2, '2024-12-27T15:08:12.799+00:00', '2024-12-27T15:08:12.799+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO comments (id, post_id, user_id, user_name, user_profile_image, content, count_of_replies, created_at, updated_at) VALUES (
  '58lM21ldgxkJ5PBRuFS3', 'bCsbVjQkZZj8MIbjvuII', '88f5aa6e-3078-56ce-a117-42f1c5f4c399', 'TestUser4', NULL, '마음이 몽글몽글해지는 너무 따뜻한 이야기네요! 추억 하나하나를 소중하게 여길 줄 아는 가영님과 어머님의 모습이 너무 좋게 느껴집니다. 이런 따뜻한 추억의 소재를 갖고 있다는 게 부럽고, 또 제게는 비슷한 게 뭐가 있을까 생각을 해보게 되네요', 1, '2024-12-27T16:27:01.11+00:00', '2024-12-27T16:27:01.11+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO comments (id, post_id, user_id, user_name, user_profile_image, content, count_of_replies, created_at, updated_at) VALUES (
  'PCfW0ixgSF6hTCRWtOrR', 'bCsbVjQkZZj8MIbjvuII', 'dceb8561-3ca9-43ca-baf7-402f8ea44334', 'TestUser2', NULL, '오 그냥 딸기가 아니라 산딸기는 안 먹어본 거 같아요', 2, '2024-12-27T15:09:54.416+00:00', '2024-12-27T15:09:54.416+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO comments (id, post_id, user_id, user_name, user_profile_image, content, count_of_replies, created_at, updated_at) VALUES (
  'e7M0LExIxSFLH5YYgZ29', 'bCsbVjQkZZj8MIbjvuII', '92bbbd24-00f2-5953-a25c-4f53f385e45f', 'TestUser17', NULL, '어떤 맛일지 너무 궁금해요.... 한 과일과 한 맛에 가영님의 일화가 녹여져 있는 것두 괜히 따뜻하고 좋네요!', 1, '2024-12-27T15:51:52.416+00:00', '2024-12-27T15:51:52.416+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO comments (id, post_id, user_id, user_name, user_profile_image, content, count_of_replies, created_at, updated_at) VALUES (
  'EsNnufuBv0JqBan4LDKf', 'lMpSD2p2cEgJPUSw5Jpo', 'dceb8561-3ca9-43ca-baf7-402f8ea44334', 'TestUser2', NULL, 'ㅋㅋ창회님 8기 오늘 시작했어요..', 2, '2024-12-30T14:25:57.221+00:00', '2024-12-30T14:25:57.221+00:00'
) ON CONFLICT (id) DO NOTHING;

-- ================================================
-- REPLIES
-- ================================================
INSERT INTO replies (id, comment_id, post_id, user_id, user_name, user_profile_image, content, created_at, updated_at) VALUES (
  'KlSrNpZHY5wbmtg4JXES', '58lM21ldgxkJ5PBRuFS3', 'bCsbVjQkZZj8MIbjvuII', '78d0d8f9-3686-5879-a1e8-af8d88969449', 'TestUser3', NULL, '찬희님 댓글을 보며 저도 마음이 따뜻해졌어요 ㅎㅎ', '2024-12-30T10:09:52.784+00:00', '2024-12-30T10:09:52.784+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO replies (id, comment_id, post_id, user_id, user_name, user_profile_image, content, created_at, updated_at) VALUES (
  '5LhMvDz8JpGJitJIKgCc', 'e7M0LExIxSFLH5YYgZ29', 'bCsbVjQkZZj8MIbjvuII', '78d0d8f9-3686-5879-a1e8-af8d88969449', 'TestUser3', NULL, '한스케익의 산딸기무스 케익은 꼭 한번 드셔보셔요..!', '2024-12-30T10:10:17.033+00:00', '2024-12-30T10:10:17.033+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO replies (id, comment_id, post_id, user_id, user_name, user_profile_image, content, created_at, updated_at) VALUES (
  'QkZv9OjlD6h8giYcmBUd', 'EsNnufuBv0JqBan4LDKf', 'lMpSD2p2cEgJPUSw5Jpo', '1d7073a6-d31e-5ab8-8506-21df0fb85ed0', 'TestUser6', NULL, 'ㅋㅋㅋㅋ나홀로 7기.. 약주하셨으니 봐드립시다요(?)', '2024-12-30T14:29:41.386+00:00', '2024-12-30T14:29:41.386+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO replies (id, comment_id, post_id, user_id, user_name, user_profile_image, content, created_at, updated_at) VALUES (
  'b4TFcJvwsZrFi2wpbT7M', 'EsNnufuBv0JqBan4LDKf', 'lMpSD2p2cEgJPUSw5Jpo', 'ff644a98-e07e-58ce-afee-12a2f31fcce2', 'TestUser8', NULL, 'ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ', '2024-12-30T23:12:21.61+00:00', '2024-12-30T23:12:21.61+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO replies (id, comment_id, post_id, user_id, user_name, user_profile_image, content, created_at, updated_at) VALUES (
  '0Athk6cAyMPAH5w8InEO', 'PCfW0ixgSF6hTCRWtOrR', 'bCsbVjQkZZj8MIbjvuII', '92bbbd24-00f2-5953-a25c-4f53f385e45f', 'TestUser17', NULL, '헉 진짜요?!', '2024-12-27T15:50:46.475+00:00', '2024-12-27T15:50:46.475+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO replies (id, comment_id, post_id, user_id, user_name, user_profile_image, content, created_at, updated_at) VALUES (
  'usg3lIvuT2IcghDWiiAy', 'PCfW0ixgSF6hTCRWtOrR', 'bCsbVjQkZZj8MIbjvuII', '78d0d8f9-3686-5879-a1e8-af8d88969449', 'TestUser3', NULL, '오..! 딱 여름의 맛이에요!', '2024-12-30T10:10:36.318+00:00', '2024-12-30T10:10:36.318+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO replies (id, comment_id, post_id, user_id, user_name, user_profile_image, content, created_at, updated_at) VALUES (
  '3Izwu09987TIjKRh13sx', 'YQB39iPNzfLw9bXK7cBj', '7uEFePdFBDIopCRmyHYT', 'ff644a98-e07e-58ce-afee-12a2f31fcce2', 'TestUser8', NULL, '글쎄요 ㅎㅎ 제가 질문 댓글을 좋아하긴 하지만 넘나 어려운 질문에 말문이 막혀버렸따... ㅋㅋㅋㅋ ', '2024-12-29T08:03:40.838+00:00', '2024-12-29T08:03:40.838+00:00'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO replies (id, comment_id, post_id, user_id, user_name, user_profile_image, content, created_at, updated_at) VALUES (
  'TS9Qefh7RnhUf63lgFjR', 'YQB39iPNzfLw9bXK7cBj', '7uEFePdFBDIopCRmyHYT', '92bbbd24-00f2-5953-a25c-4f53f385e45f', 'TestUser17', NULL, '이거에 대한 두 분의 대담이 궁금한데요 ㅋㅋㅋㅋ 담에 근성순대에서 얘기해보고 싶어요 (너무 일얘기인가)', '2025-01-08T01:27:11.206+00:00', '2025-01-08T01:27:11.206+00:00'
) ON CONFLICT (id) DO NOTHING;

-- ================================================
-- REACTIONS
-- ================================================

-- ================================================
-- SEED COMPLETE
-- ================================================
