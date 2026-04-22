/** All supported formatting types */
export const FIXTURE_ALL_FORMATS = `
<h1>Heading 1</h1>
<h2>Heading 2</h2>
<p><strong>Bold text</strong> and <em>italic text</em> and <u>underlined text</u> and <s>strikethrough text</s></p>
<ul><li>Bullet item 1</li><li>Bullet item 2</li></ul>
<ol><li>Ordered item 1</li><li>Ordered item 2</li></ol>
<blockquote>A blockquote paragraph</blockquote>
<p>A <a href="https://example.com" target="_blank" rel="noopener noreferrer">link</a> in text</p>
`.trim();

/** Content with inline images */
export const FIXTURE_WITH_IMAGES = `
<p>Text before image</p>
<p><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="" class="max-w-full h-auto rounded-lg"></p>
<p>Text after image</p>
`.trim();

/** Mixed Korean and English with punctuation */
export const FIXTURE_KOREAN_MIXED = `
<p>오늘의 글쓰기 주제는 "행복"입니다.</p>
<p>Writing about happiness (행복) is therapeutic.</p>
<p>특수문자 테스트: 괄호() 슬래시/ 마침표... 쉼표, 느낌표! 물음표?</p>
<p><strong>볼드 한글</strong> and <em>이탤릭 한글</em></p>
`.trim();

/** Empty content */
export const FIXTURE_EMPTY = '';

/** Real production post HTML (sanitized) - represents typical user content */
export const FIXTURE_REAL_POST = `
<h2>오늘 하루를 돌아보며</h2>
<p>아침에 눈을 떴을 때, 창밖으로 봄 햇살이 들어왔다. 이런 날은 글을 쓰고 싶어진다.</p>
<p><strong>감사한 것들:</strong></p>
<ul>
<li>따뜻한 커피 한 잔</li>
<li>좋은 음악과 함께한 출근길</li>
<li>동료와 나눈 짧은 대화</li>
</ul>
<blockquote>글쓰기는 생각을 정리하는 가장 좋은 방법이다.</blockquote>
<p>내일은 어떤 글을 쓸 수 있을까? 기대가 된다 :)</p>
<p>참고 링크: <a href="https://example.com/writing-tips" target="_blank" rel="noopener noreferrer">글쓰기 팁 모음</a></p>
`.trim();

/** Map of fixture names to HTML content for URL param lookup */
export const FIXTURES: Record<string, string> = {
  'all-formats': FIXTURE_ALL_FORMATS,
  'with-images': FIXTURE_WITH_IMAGES,
  'korean-mixed': FIXTURE_KOREAN_MIXED,
  'empty': FIXTURE_EMPTY,
  'real-post': FIXTURE_REAL_POST,
};
