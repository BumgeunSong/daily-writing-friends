-- Phase 8A: Remap user IDs from Firebase UID (TEXT) to Supabase Auth UUID
-- Run during maintenance window. Takes ~30 seconds for ~40k rows.
-- WARNING: This migration is NOT idempotent. Do NOT run it twice.
--
-- Applied via: supabase db push
-- The CLI wraps each migration in a transaction automatically.

-- Safety: force clean failure rather than hanging with triggers disabled
SET LOCAL lock_timeout = '30s';
SET LOCAL statement_timeout = '300s';

-- =============================================
-- 0. Create mapping table
-- =============================================
CREATE TABLE IF NOT EXISTS uid_mapping (
  firebase_uid TEXT PRIMARY KEY,
  supabase_uuid UUID NOT NULL UNIQUE
);

INSERT INTO uid_mapping (firebase_uid, supabase_uuid) VALUES
('17hhA7B1jQOTFXKHnBFkyakp09K2', 'e3f6d7b3-9609-4bc8-801b-5560f8096fec'),
('1IxdUtOSyGPCwFx531gOgNOC3a02', '85d6b828-2083-4fb2-baca-3833f03c2dca'),
('1y06BmkauwhIEwZm9LQmEmgl6Al1', 'dceb8561-3ca9-43ca-baf7-402f8ea44334'),
('2BcAwEMgIeTHsucmhD0B5BkBCJE2', 'fa91bc72-d986-48c0-87e3-08652acfa4da'),
('2CAyeu0XBcOmB2krfcRZPBQ1fOn1', '83546e56-5386-4160-b1bf-5276d8dd656e'),
('2I178pgpLeNjbUhMkWfzZcAh4I82', '43f97b6d-daaf-4567-b0ba-f4418d63cae5'),
('2kljgltAcyTAerOdF40NGCVSBWa2', 'fa587fa6-fba7-4d62-83d5-4238c2b9d6ad'),
('40HoMOZ6fAXlhvdc6U0nVHH1SU83', '239317d8-aa6a-41da-bb43-647bcf7aa255'),
('4EA9N43IMWU7IkQHbX0oJ84OKGH2', '56e0ba8f-0d3b-4212-9ecb-93d6aaf11359'),
('4ECERJJ6UreOkUOIvUxJTGbNDAk2', '101f6241-adc5-4846-bbf6-eeeb85dea9e0'),
('5E4kvnpNBGVVArUQ0EPfgSUQvKv2', '005752fd-f8e1-4d1c-9fd4-3b766b996bb1'),
('5kqwRtDFoRhYW9dINOMfGNEYnsr2', '967a836e-b06c-40fc-b9b2-37378f2e2ffe'),
('5rQeIUXCuEOUmtmHKCn0DlZIPcj1', '039af6e9-971d-41e1-ba31-fc05f99636bd'),
('7PPGhexdcyO1jzD4tdZJ9FTaF9c2', '15ddb50b-63af-443e-9662-68a3c64d9d08'),
('89kNbXuJwnbpDVjq9cKqRzha9HJ2', 'b090858b-d728-48e8-81b5-c9e1c001c4af'),
('8mROW2mdYjRUsYgdFC993OlmZTF3', '99b74c2f-2fa2-4412-8c67-5876b1a626c0'),
('8vLVbRCByvM8v8jyJSsi2pJZ6782', '3fdfdde9-5ad8-496b-87f5-8e2e21d9d97a'),
('91GeoYSMdCP3WI8rVDBR7xrxdlN2', '34587363-f680-49d2-ba5d-a0d47066100d'),
('97QMlG7o55cuN052x5Ak4RTo9ai2', 'a1272b37-0382-4db1-8fd4-b8bc19af8f41'),
('A2Lv3bvXiRaN89GL0J7uTL8tUT93', '2b08cfbc-408b-42f4-98a5-ebf3946bc91c'),
('CEvPWFWCo7fJtYBiAJosx7c2iBZ2', 'fbf9d793-9c43-45eb-961f-7a1635be3112'),
('CXPYcoruQ3cWkqaFx57rGSPQznk1', '2e46ecf9-f8c3-4c63-9d0a-27f68cdd9476'),
('Ci2vb8gz5sQV12isu4yGssPYRNU2', '3e6606e1-7a50-48f6-95c9-c741bbeea75b'),
('DtFCZJlxNWgWCR7Q0nZx87KNbHz2', 'e5c95ad5-0ee4-4b42-8919-56861a198fdd'),
('G0AuPmLnQ6SjCauTiwaDGygla3V2', '8cf27a96-3c1b-4853-9c8b-8431b59831b7'),
('GNFgpCWLqJMcyYZ32NecHALJpi72', 'de3ec3bd-a313-427b-b331-37c3ad3dceb3'),
('GrSgNFZgRyfXoH90u5ZF8D7jeJy1', '6444318d-4f39-42e8-9f5c-eed805e70bf9'),
('IFmtrsNyelRymdWTbWt2LWn1MfY2', '0ce1fca2-35c1-4f2c-badc-0c8b71a9d7d2'),
('J8Sfu0kIKOathGX5ulkReNzFz4J3', '14c66953-defe-4d58-9cf5-e6c2df0172ee'),
('KbEa1k7JzJWwMWSlBOx43Anfh6N2', '4058f7e9-8d26-4faf-86ab-215d66f29cf5'),
('L72hfiZmqRgmpBbJP9ubotGaBPu2', 'a964e734-f464-4091-acca-c143ef13de5c'),
('LDUZyVXSk3OBhMCnlAy2foKxo1G2', '835a8f0a-260b-4ff2-9830-94c889c28cf3'),
('Lly67ji6rhcRP4bklyNA1u84E643', '02a26d52-27a3-4a7a-bb6e-5ba290f5256c'),
('M6XoCv6iX4ObP6QFcMrngxqebHm1', '2ef142c2-e249-4b2d-b9c8-e14a4f13f298'),
('MAfOXCaGGUMpsvpcjZxRP5K0Xlg1', '0d11eec7-9626-4073-b5f6-268ffce58740'),
('MHGdl61BhjSZdMKPGhp34kIUhjg1', 'd83a6a45-60c0-4cbf-8a31-d52c4492dfc3'),
('MmCp2LRJKGdZTNBoYPlXE6uAZYu1', '578dc822-f614-44fa-932c-b5356bdccf60'),
('O3JEcEA5omRz8KFrQPBLMvp6KYg1', 'e63d8a8d-ac18-4b76-b6c8-2f91616916ae'),
('OmrlIo5VBFTZHMCGazRB6K9fqGH3', '7dbcb4c6-a69a-4477-bc4e-9f774d3646ca'),
('OugrpATfGlYCfiOziElZtNLze3q1', '89cb624d-4238-483a-83fd-a7bbfb07cc0e'),
('Px99aTDYcBN2A3imLFzamYQZVIL2', '084c918a-97ed-412a-978f-1660816950e5'),
('Q91Nc1j6cCbQTD6Iyjy2X71Nc3C3', '26616016-d8ff-437b-afec-6d6cb8dafc21'),
('QGaQkDr05GRU9CLRJfraFtImOHA2', '9d1219c3-f8a6-4921-9a27-d05a384a3d2c'),
('Qm9tn08XO6QR9H8nMRKyFPNF5Uu2', '0f0a9517-537d-4a63-bab0-1335f74217b0'),
('QqTLWRkKIKYYfZgPVJuiMAXR8152', '41907330-fcfa-4e83-9128-3025a366aef3'),
('R6CTrjRaofh4ySErio36kvktKUs1', '27c6bdb3-b928-44d4-a0ce-d5d1fce15057'),
('SyKdCi67lNcK2iBCkmrd3qweNyK2', 'd3d3e7b2-fc14-48d6-bc09-b63a370f7f39'),
('TKDkvTt3CvSsb0bnWPvR8wgC4H52', '2b86d62c-51d4-4b0a-9604-030316ae5972'),
('Thb4TOCtviQ14MrJIsKE11zD2612', '7e0efdd4-6c22-48f9-9c8c-7cd0c72a7c11'),
('UrmSfNkkWHYXeEFR4sqs4LUrdrw2', 'bdbeb62d-ec5c-44df-a88b-a478d21e969d'),
('VEUc2MBi43VN2yunHHk7rx0Gtlu2', '81ca2221-639a-4b83-8499-a166bf96b6c9'),
('VHGQxflntQRBO19mdoPr1paxQQr2', 'b4dc9a5b-b39d-4679-b6c3-3f09c3159f22'),
('VNhIxthT7WOeXfpaKq9jBgiKmhF2', '57a54b0d-677b-4057-b495-c28830ea9098'),
('VhpcE40HYSY0si4HddUeab4U1p92', '677977c8-f27d-4f30-9e99-ef211a303885'),
('WjUzRJwPAVOj3ZsVykJAHcGsA7r2', '27b1e5f1-d966-4871-984c-8e40802ff866'),
('XUgoonVKLRWO4eLcukl30Y0zkif2', 'be202035-db41-4a1c-9056-25093d9298ed'),
('Yd9HGraM1JOIltPcE8gA5iNORdH2', '46ec2260-ca1c-46e0-bbe9-786de8e4230b'),
('YhkJrnImFSVAp9xTkrRGQma5fll2', '83e64bce-01e4-4c21-83ac-ce76aa5fdcfd'),
('ZSjqfyBnosVxW7ulkY26Y0UOuYy1', '6fa48b1d-650e-4b89-92b4-698d93427ccf'),
('aE31LeTqgubOmyorchNs80RH13m1', '8b07a4e2-4983-4f95-81ea-eefa50ec48ec'),
('aNHKML3bLZaMiL1HJiyEQYUN9Yc2', '42ccf1bc-2aa3-4863-9a3a-a2c8db79831f'),
('aQDecLIoSNQ2hnjyYsuYLbyL6d32', 'abed7ce6-abf1-4184-bb12-704473e4d5fa'),
('aQtssYmMgyQcEfj8TrmhqL2TdCF2', '51f0aae5-2562-4a6d-809a-45ab8ff762cc'),
('aRBrbXOPLINVKJNaDF36vKjIO3w2', 'c19d50dc-0215-4e5d-a6ff-ca70f812e0bc'),
('aWQp7cVSgJdenThXQuMILXgpDWC3', 'fe31b42c-0b27-4e0f-a1e1-975f45bd07b0'),
('b3F3urnYfCUICQYXfAGpn9VDRDe2', 'ec5764be-f428-4047-bf93-3e2b6a95dfdc'),
('bhoYRqGCaxePznq4RxdKI3moGnL2', 'acaded20-20aa-4c11-b0b6-4bf88596204b'),
('biWnRO932YVPMmKwrL5KN7zWdo13', 'b1232477-d505-4e2a-b1d0-8a4cb74acac2'),
('bqcxZkUquocfy8sjG4kWDffUe293', '52191bc9-7a37-42f2-b998-936474549515'),
('cZmt7tZE9dQ5KRZQqyZ0N5Ir8dM2', '82b36bd6-1fc2-4971-bc7d-cbbb987333d4'),
('djyqpExmUVbkDtqNAZ6AWKapJJw2', '7446276e-9bbf-4df2-8018-e46d718d921c'),
('eNvCx1bhx7amyhZzfw4ZmQ8u9Ok1', 'cdcf0446-cafe-4ea1-b7d4-67c6894332ff'),
('eoVAyzulKeMCjNdtFCULj9Bzh8A2', '02ecd531-003e-4cfd-b9b8-869dfd03a87b'),
('gvJIWAiAE0YSHpNaofh2Co0NvcE2', 'c6ab10b7-c67e-4acb-a678-949375507f40'),
('hu8PZP5Q3KY9lxXN02Ea2sI8h6h1', 'b78e18a1-0674-469f-9794-e32290f23a0a'),
('jB2TGQWG7WgPpQTwhKhrsWFrQYG2', 'da0fff88-654c-485d-b87c-757aa0acd169'),
('jz8DNs9pvjapvWq6TXdrTO4H9bW2', 'ef8e0b5f-1cae-4630-8efa-941833e4f9d7'),
('k1QippxJsXXyxcqIw3StU3veBTo1', 'f6a77c88-19f3-43d8-8c80-925ba5fa8a3d'),
('keuHr2jhaqMzA1YifXDkIlfO7Sn2', 'd01590cc-a103-4c75-9edd-a0f182197e68'),
('kgu65M9zXxMg4wZi8t8oJKqr1Uz2', '6b588a77-736d-4dac-8301-590ff66d785f'),
('m4OxdTMziBVt5CAKQ0RDJZOZ66F2', 'f8dce28d-85e8-4c12-bebe-37f27d2e57ae'),
('mV7aDv4k2NVx7dsyhtWjkYnkxmA2', '129971a7-afb7-42b5-9177-58ab14e1b17d'),
('mW84y6POCJbvbJQS2hc4nLvW6Bp2', 'a11ebe03-a187-44e0-a6c8-9817f9dcfcef'),
('mgGewKFob6V0FizX6SXzyBfCC2m1', '1cd7a484-f491-41d4-92f2-2aa26f6a70de'),
('n3ay9f5MquNLp9gGIgL6hUliIZw2', 'ffbdd335-5dae-4205-b4a3-52fc5d0cbab3'),
('nMwDUS0ZOQdiPaOvA5KBZIWZgK72', 'e08f63f7-48a9-4514-9645-3a58ce212029'),
('nvlmbhXchuPKwPSh95EZrs2cIz92', '0bb3abed-e15b-4d18-85af-49a142c380e4'),
('o378Z10zoucNxa4QYqqoUJEeX0K3', 'e136976e-39af-4736-9cd3-f04cf584fbd7'),
('oyLM0SIgIdUTA0bpBID630cXkSd2', '91b8e85c-3508-49fd-941b-82c752f509cb'),
('pZNwXOefUGg4T825ux9qaL0V2P13', 'fad01cb8-816b-4689-9dd3-79f5aeb1fe6e'),
('prC9eqyrf1ds0psVfaQFWI1lrMf2', '30a79bc2-3a49-4940-861c-f016a41e38f8'),
('rq1DeaLVsZUwMX1azlX9wbYMjDn2', 'bebc38d3-eb03-460e-8b3f-8240037774dd'),
('sRcwyju3tvdXjqdmdSN9mJr6J2x1', 'ac5629b3-5443-4683-a3a4-921631d5a9ce'),
('scI2W3ng4PgzZiuTVbaYhAMBuft1', '2b676cd7-6d60-4b5a-aa83-910b7864ce57'),
('tc4Hw5PxByNOqRE9FB8aj3jaxPr2', '1c0b6222-7f52-4ac3-ac8b-2dc0bcdae638'),
('w1m9NCe8YdVeGtOMRYha8ZF8PuK2', 'da77a69f-4f6e-4c83-86c7-e0329c921b9a'),
('w3j3y0WAQrWJI0eX9QHcYTclbOn1', '010f9791-9972-4c3d-ac98-66025f030fc5'),
('wiqyV5FNrJN4ZixVc5FMuEDIsDi1', 'fa68f9e7-0086-4062-9643-d6048e2d3264'),
('kJtOzH0g2cYKKpnLMtNDw7sXDJh2', 'e24f91f1-7b8f-4f20-85fb-465787548fae'),
('xsGiUTUtQwTCJeEiWvD1j74Fuqm2', '34d5c706-c718-42f1-9bb6-6817590e3e8d'),
('zHRG7A9Iimg1Fjt6XTCAWYFjYKE2', '138e07a5-a7b5-4661-9f17-1fd973792631'),
('lA7xq98guQXC67z2f9XMWd8PInn2', '425f2d88-ae30-4bef-9cb4-f4d157e69ccb'),
('Xd3OO7HQasWQKgjhbZGDZV3Lawm2', '3daa82f8-5bf8-4535-ba59-915fef23d98c'),
('CAhqEqZaYAh8cMjQbpbiqHS4nLZ2', 'db5e4d94-a133-4f78-aadd-970a59ce5251'),
('TPr60SJCHtTR1jmnb4F3J66xjRy2', '447a876d-4522-4cc1-a5ef-f2de8e91564b'),
('0SJJB0N3QMMl8bCtkRHh3Ag0KNO2', '4084f1b1-cbd2-49ab-8a11-381177ef3c7f');

-- =============================================
-- 0.5. Pre-flight check: abort if any user has no mapping
-- =============================================
DO $$
DECLARE unmapped_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unmapped_count
  FROM users u
  LEFT JOIN uid_mapping m ON u.id = m.firebase_uid
  WHERE m.firebase_uid IS NULL;

  IF unmapped_count > 0 THEN
    RAISE EXCEPTION 'ABORT: % users have no UID mapping. Fix before proceeding.', unmapped_count;
  END IF;
END $$;

-- =============================================
-- 1. Disable user triggers (notification/counter triggers)
--    System triggers (FK constraints) are dropped in step 2.
-- =============================================
ALTER TABLE users DISABLE TRIGGER USER;
ALTER TABLE posts DISABLE TRIGGER USER;
ALTER TABLE comments DISABLE TRIGGER USER;
ALTER TABLE replies DISABLE TRIGGER USER;
ALTER TABLE likes DISABLE TRIGGER USER;
ALTER TABLE reactions DISABLE TRIGGER USER;
ALTER TABLE notifications DISABLE TRIGGER USER;
ALTER TABLE drafts DISABLE TRIGGER USER;
ALTER TABLE user_board_permissions DISABLE TRIGGER USER;
ALTER TABLE board_waiting_users DISABLE TRIGGER USER;
ALTER TABLE blocks DISABLE TRIGGER USER;
ALTER TABLE reviews DISABLE TRIGGER USER;

-- =============================================
-- 2a. Drop RLS policies (they reference column types)
-- =============================================
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;

DROP POLICY IF EXISTS "Comments are viewable by everyone" ON comments;
DROP POLICY IF EXISTS "Users can insert their own comments" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;

DROP POLICY IF EXISTS "Replies are viewable by everyone" ON replies;
DROP POLICY IF EXISTS "Users can insert their own replies" ON replies;
DROP POLICY IF EXISTS "Users can update their own replies" ON replies;
DROP POLICY IF EXISTS "Users can delete their own replies" ON replies;

DROP POLICY IF EXISTS "Likes are viewable by everyone" ON likes;
DROP POLICY IF EXISTS "Users can insert their own likes" ON likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON likes;

DROP POLICY IF EXISTS "Reactions are viewable by everyone" ON reactions;
DROP POLICY IF EXISTS "Users can insert their own reactions" ON reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON reactions;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

DROP POLICY IF EXISTS "Users can view their own drafts" ON drafts;
DROP POLICY IF EXISTS "Users can insert their own drafts" ON drafts;
DROP POLICY IF EXISTS "Users can update their own drafts" ON drafts;
DROP POLICY IF EXISTS "Users can delete their own drafts" ON drafts;

-- Disable RLS on tables (will be re-enabled by the RLS migration)
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE replies DISABLE ROW LEVEL SECURITY;
ALTER TABLE likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE drafts DISABLE ROW LEVEL SECURITY;

-- =============================================
-- 2b. Drop FK constraints
-- =============================================
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_author_id_fkey;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE replies DROP CONSTRAINT IF EXISTS replies_user_id_fkey;
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_user_id_fkey;
ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_user_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_actor_id_fkey;
ALTER TABLE drafts DROP CONSTRAINT IF EXISTS drafts_user_id_fkey;
ALTER TABLE user_board_permissions DROP CONSTRAINT IF EXISTS user_board_permissions_user_id_fkey;
ALTER TABLE board_waiting_users DROP CONSTRAINT IF EXISTS board_waiting_users_user_id_fkey;
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_blocker_id_fkey;
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_blocked_id_fkey;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_known_buddy_uid_fkey;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_reviewer_id_fkey;

-- =============================================
-- 3. Drop indexes on affected columns
-- =============================================
DROP INDEX IF EXISTS idx_posts_author_created;
DROP INDEX IF EXISTS idx_comments_user_created;
DROP INDEX IF EXISTS idx_replies_user_created;
DROP INDEX IF EXISTS idx_notifications_recipient_created;
DROP INDEX IF EXISTS idx_notifications_recipient_unread;
DROP INDEX IF EXISTS idx_notifications_idempotency;
DROP INDEX IF EXISTS idx_likes_user;
DROP INDEX IF EXISTS idx_permissions_user;
DROP INDEX IF EXISTS idx_board_waiting_users_user;
DROP INDEX IF EXISTS idx_reactions_user;
DROP INDEX IF EXISTS idx_drafts_user_board;
DROP INDEX IF EXISTS idx_blocks_blocker;
DROP INDEX IF EXISTS idx_blocks_blocked;
DROP INDEX IF EXISTS idx_reviews_reviewer;

-- Also drop unique constraints that include user columns
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_post_id_user_id_key;
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_blocker_id_blocked_id_key;
ALTER TABLE user_board_permissions DROP CONSTRAINT IF EXISTS user_board_permissions_user_id_board_id_key;
ALTER TABLE board_waiting_users DROP CONSTRAINT IF EXISTS board_waiting_users_board_id_user_id_key;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_board_id_reviewer_id_key;
-- reactions unique indexes
DROP INDEX IF EXISTS idx_reactions_comment_user;
DROP INDEX IF EXISTS idx_reactions_reply_user;

-- =============================================
-- 4. UPDATE all FK columns (before altering types)
-- =============================================
UPDATE posts SET author_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE posts.author_id = m.firebase_uid;

UPDATE comments SET user_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE comments.user_id = m.firebase_uid;

UPDATE replies SET user_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE replies.user_id = m.firebase_uid;

UPDATE likes SET user_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE likes.user_id = m.firebase_uid;

UPDATE reactions SET user_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE reactions.user_id = m.firebase_uid;

UPDATE notifications SET recipient_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE notifications.recipient_id = m.firebase_uid;

UPDATE notifications SET actor_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE notifications.actor_id = m.firebase_uid;

UPDATE drafts SET user_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE drafts.user_id = m.firebase_uid;

UPDATE user_board_permissions SET user_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE user_board_permissions.user_id = m.firebase_uid;

UPDATE board_waiting_users SET user_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE board_waiting_users.user_id = m.firebase_uid;

UPDATE blocks SET blocker_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE blocks.blocker_id = m.firebase_uid;

UPDATE blocks SET blocked_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE blocks.blocked_id = m.firebase_uid;

UPDATE users SET known_buddy_uid = m.supabase_uuid::text
  FROM uid_mapping m WHERE users.known_buddy_uid = m.firebase_uid;

UPDATE reviews SET reviewer_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE reviews.reviewer_id = m.firebase_uid;

-- PK last (other FKs reference this)
UPDATE users SET id = m.supabase_uuid::text
  FROM uid_mapping m WHERE users.id = m.firebase_uid;

-- =============================================
-- 5. ALTER COLUMN types from TEXT to UUID
-- =============================================
ALTER TABLE users ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE users ALTER COLUMN known_buddy_uid TYPE UUID USING known_buddy_uid::uuid;
ALTER TABLE posts ALTER COLUMN author_id TYPE UUID USING author_id::uuid;
ALTER TABLE comments ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE replies ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE likes ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE reactions ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE notifications ALTER COLUMN recipient_id TYPE UUID USING recipient_id::uuid;
ALTER TABLE notifications ALTER COLUMN actor_id TYPE UUID USING actor_id::uuid;
ALTER TABLE drafts ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE user_board_permissions ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE board_waiting_users ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE blocks ALTER COLUMN blocker_id TYPE UUID USING blocker_id::uuid;
ALTER TABLE blocks ALTER COLUMN blocked_id TYPE UUID USING blocked_id::uuid;
ALTER TABLE reviews ALTER COLUMN reviewer_id TYPE UUID USING reviewer_id::uuid;

-- =============================================
-- 6. Recreate indexes
-- =============================================
CREATE INDEX idx_posts_author_created ON posts (author_id, created_at DESC);
CREATE INDEX idx_comments_user_created ON comments (user_id, created_at DESC);
CREATE INDEX idx_replies_user_created ON replies (user_id, created_at DESC);
CREATE INDEX idx_notifications_recipient_created ON notifications (recipient_id, created_at DESC);
CREATE INDEX idx_notifications_recipient_unread ON notifications (recipient_id, created_at DESC) WHERE read = FALSE;
CREATE UNIQUE INDEX idx_notifications_idempotency
  ON notifications(recipient_id, type, post_id, COALESCE(comment_id, ''), COALESCE(reply_id, ''), actor_id);
CREATE INDEX idx_likes_user ON likes (user_id);
CREATE INDEX idx_permissions_user ON user_board_permissions (user_id);
CREATE INDEX idx_board_waiting_users_user ON board_waiting_users (user_id);
CREATE INDEX idx_reactions_user ON reactions (user_id);
CREATE INDEX idx_drafts_user_board ON drafts (user_id, board_id, saved_at DESC);
CREATE INDEX idx_blocks_blocker ON blocks (blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks (blocked_id);
CREATE INDEX idx_reviews_reviewer ON reviews (reviewer_id);

-- Recreate unique constraints
ALTER TABLE likes ADD CONSTRAINT likes_post_id_user_id_key UNIQUE (post_id, user_id);
ALTER TABLE blocks ADD CONSTRAINT blocks_blocker_id_blocked_id_key UNIQUE (blocker_id, blocked_id);
ALTER TABLE user_board_permissions ADD CONSTRAINT user_board_permissions_user_id_board_id_key UNIQUE (user_id, board_id);
ALTER TABLE board_waiting_users ADD CONSTRAINT board_waiting_users_board_id_user_id_key UNIQUE (board_id, user_id);
ALTER TABLE reviews ADD CONSTRAINT reviews_board_id_reviewer_id_key UNIQUE (board_id, reviewer_id);
CREATE UNIQUE INDEX idx_reactions_comment_user ON reactions (comment_id, user_id) WHERE comment_id IS NOT NULL;
CREATE UNIQUE INDEX idx_reactions_reply_user ON reactions (reply_id, user_id) WHERE reply_id IS NOT NULL;

-- =============================================
-- 7. Re-add FK constraints
-- =============================================
-- Link users.id to Supabase Auth (canonical pattern)
ALTER TABLE users ADD CONSTRAINT users_id_auth_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE users ADD CONSTRAINT users_known_buddy_uid_fkey
  FOREIGN KEY (known_buddy_uid) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE posts ADD CONSTRAINT posts_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE comments ADD CONSTRAINT comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE replies ADD CONSTRAINT replies_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE likes ADD CONSTRAINT likes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE reactions ADD CONSTRAINT reactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT notifications_recipient_id_fkey
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT notifications_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE drafts ADD CONSTRAINT drafts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_board_permissions ADD CONSTRAINT user_board_permissions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE board_waiting_users ADD CONSTRAINT board_waiting_users_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE blocks ADD CONSTRAINT blocks_blocker_id_fkey
  FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE blocks ADD CONSTRAINT blocks_blocked_id_fkey
  FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE reviews ADD CONSTRAINT reviews_reviewer_id_fkey
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE;

-- =============================================
-- 8. Re-enable user triggers
-- =============================================
ALTER TABLE users ENABLE TRIGGER USER;
ALTER TABLE posts ENABLE TRIGGER USER;
ALTER TABLE comments ENABLE TRIGGER USER;
ALTER TABLE replies ENABLE TRIGGER USER;
ALTER TABLE likes ENABLE TRIGGER USER;
ALTER TABLE reactions ENABLE TRIGGER USER;
ALTER TABLE notifications ENABLE TRIGGER USER;
ALTER TABLE drafts ENABLE TRIGGER USER;
ALTER TABLE user_board_permissions ENABLE TRIGGER USER;
ALTER TABLE board_waiting_users ENABLE TRIGGER USER;
ALTER TABLE blocks ENABLE TRIGGER USER;
ALTER TABLE reviews ENABLE TRIGGER USER;

-- =============================================
-- 9. Verification queries (check before COMMIT)
-- =============================================

-- Row counts (compare with pre-migration-counts.json)
SELECT 'users' as tbl, count(*) FROM users
UNION ALL SELECT 'posts', count(*) FROM posts
UNION ALL SELECT 'comments', count(*) FROM comments
UNION ALL SELECT 'replies', count(*) FROM replies
UNION ALL SELECT 'likes', count(*) FROM likes
UNION ALL SELECT 'reactions', count(*) FROM reactions
UNION ALL SELECT 'notifications', count(*) FROM notifications
UNION ALL SELECT 'drafts', count(*) FROM drafts
UNION ALL SELECT 'blocks', count(*) FROM blocks
UNION ALL SELECT 'user_board_permissions', count(*) FROM user_board_permissions
UNION ALL SELECT 'board_waiting_users', count(*) FROM board_waiting_users
UNION ALL SELECT 'reviews', count(*) FROM reviews;

-- Column types (should all be 'uuid')
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE (column_name IN ('author_id', 'user_id', 'recipient_id', 'actor_id',
       'blocker_id', 'blocked_id', 'known_buddy_uid', 'reviewer_id')
       OR (table_name = 'users' AND column_name = 'id'))
  AND table_schema = 'public'
ORDER BY table_name, column_name;

-- FK constraints exist (should include users_id_auth_fkey)
SELECT conname FROM pg_constraint
WHERE contype = 'f' AND (confrelid = 'public.users'::regclass OR conrelid = 'public.users'::regclass)
ORDER BY conname;

-- NOTE: After confirming migration success, run VACUUM ANALYZE on all tables
-- separately in the SQL Editor (VACUUM cannot run inside a transaction).
