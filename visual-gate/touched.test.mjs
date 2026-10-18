// parseTouched turns a `git diff --unified=0` body into the file+line-range set the
// judge crosses against DOM sourceIds. Run: node --test visual-gate/touched.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTouched, parseSourceId } from './touched.mjs';

const DIFF = `diff --git a/apps/web/src/comment/components/MentionableInput.tsx b/apps/web/src/comment/components/MentionableInput.tsx
index 1111111..2222222 100644
--- a/apps/web/src/comment/components/MentionableInput.tsx
+++ b/apps/web/src/comment/components/MentionableInput.tsx
@@ -134 +134 @@ export function MentionableInput() {
-  <button className="min-w-0">
+  <button className="min-w-[120px]">
@@ -200,0 +201,3 @@ function footer() {
+  const a = 1;
+  const b = 2;
+  const c = 3;
`;

test('parseSourceId peels file and line off the right (col dropped — line range is what matters)', () => {
  assert.deepEqual(parseSourceId('src/comment/components/MentionableInput.tsx:134:6'), {
    file: 'src/comment/components/MentionableInput.tsx',
    line: 134,
  });
  assert.equal(parseSourceId(undefined), null);
  assert.equal(parseSourceId('no-coords.tsx'), null);
});

test('hasLine matches a sourceId whose line falls in a touched range, across the path-prefix gap', () => {
  const t = parseTouched(DIFF);
  // sourceId is app-src-relative; git path carries the apps/web/ prefix.
  assert.ok(t.hasLine('src/comment/components/MentionableInput.tsx:134:6'), 'edited button line');
  assert.ok(t.hasLine('src/comment/components/MentionableInput.tsx:202:0'), 'inside the 201-203 range');
  assert.equal(t.hasLine('src/comment/components/MentionableInput.tsx:150:0'), false, 'untouched line');
});

test('hasFile is line-agnostic — the ancestor cascade only needs the file', () => {
  const t = parseTouched(DIFF);
  assert.ok(t.hasFile('src/comment/components/MentionableInput.tsx:9999:0'));
  assert.equal(t.hasFile('src/comment/components/CommentList.tsx:1:0'), false);
});

test('a pure-deletion hunk (+n,0) touches no new-side line', () => {
  const delOnly = `--- a/apps/web/src/x.tsx
+++ b/apps/web/src/x.tsx
@@ -10,3 +9,0 @@
-a
-b
-c
`;
  const t = parseTouched(delOnly);
  assert.ok(t.hasFile('src/x.tsx:1:0'), 'file registered as touched');
  assert.equal(t.hasLine('src/x.tsx:9:0'), false, 'but no new-side line is in range');
});

test('empty diff yields an empty touched set', () => {
  const t = parseTouched('');
  assert.equal(t.size, 0);
  assert.equal(t.hasFile('src/x.tsx:1:0'), false);
});
