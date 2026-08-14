/**
 * ProseMirror content_json 트리를 순회하는 순수 함수 모음.
 *
 * Edge Function은 프런트엔드 타입에 의존할 수 없어 노드 형태를 느슨하게(unknown)
 * 받고 방어적으로 좁힌다. 멘션 노드는 attrs.id(대상 user_id)와 attrs.label(표시 이름)을
 * 담는다. 프런트엔드 렌더링과 동일하게 label이 없으면 id로 대체한다.
 */

interface MentionNode {
  type?: unknown;
  text?: unknown;
  attrs?: { id?: unknown; label?: unknown } | null;
  content?: unknown;
}

function asNode(value: unknown): MentionNode | null {
  return value && typeof value === 'object' ? (value as MentionNode) : null;
}

/**
 * content_json에서 멘션된 user_id를 중복 없이 수집한다.
 * 한 콘텐츠에서 같은 사람을 여러 번 멘션해도 한 번만 나온다.
 */
export function extractMentionUserIds(doc: unknown): string[] {
  const ids = new Set<string>();

  function walk(value: unknown): void {
    const node = asNode(value);
    if (!node) return;
    if (node.type === 'mention' && node.attrs?.id != null) {
      ids.add(String(node.attrs.id));
    }
    if (Array.isArray(node.content)) node.content.forEach(walk);
  }

  walk(doc);
  return [...ids];
}

/**
 * content_json을 알림 미리보기용 평문으로 만든다. 텍스트 노드는 이어붙이고,
 * 멘션 노드는 @label(없으면 @id)로 치환한다. 문단 사이는 공백으로 구분한다.
 * 평문화가 슬라이스보다 먼저 일어나므로 HTML 태그가 잘릴 일이 없다.
 */
export function extractPlainText(doc: unknown): string {
  const parts: string[] = [];

  function walk(value: unknown): void {
    const node = asNode(value);
    if (!node) return;

    if (node.type === 'mention' && node.attrs?.id != null) {
      const label = node.attrs.label != null ? node.attrs.label : node.attrs.id;
      parts.push(`@${String(label)}`);
      return;
    }
    if (node.type === 'text' && typeof node.text === 'string') {
      parts.push(node.text);
      return;
    }
    if (Array.isArray(node.content)) {
      const before = parts.length;
      node.content.forEach(walk);
      // 문단 등 블록 노드 사이를 공백으로 구분한다.
      if (node.type === 'paragraph' && parts.length > before) parts.push(' ');
    }
  }

  walk(doc);
  return parts.join('').trim().replace(/\s+/g, ' ');
}

/**
 * 레거시 HTML content(content_json이 없는 댓글/답글)를 알림 미리보기용 한 줄 평문으로
 * 만든다. 문단·줄바꿈 경계는 공백으로 합쳐 content_json 경로(extractPlainText)와 같은
 * 한 줄 형태를 낸다. DOM이 없는 Edge 런타임을 위해 정규식으로 태그를 제거한다.
 */
export function htmlToPlainText(html: unknown): string {
  if (typeof html !== 'string' || html === '') return '';

  return html
    // script/style은 본문 텍스트가 미리보기로 새지 않도록 요소째 제거한다.
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // &amp;는 마지막에 디코딩해야 &amp;lt; 같은 입력이 태그로 재해석되지 않는다.
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 알림 미리보기 평문을 만든다. content_json이 있으면 그 트리를 평문화하고, 없으면
 * 레거시 HTML content에서 태그를 벗긴다. 네 곳의 fallback이 이 함수를 거쳐 HTML
 * 태그가 미리보기로 새는 것을 한곳에서 막는다.
 */
export function contentPreviewText(
  contentJson: unknown,
  contentHtml: string | null | undefined,
): string {
  return contentJson ? extractPlainText(contentJson) : htmlToPlainText(contentHtml);
}
