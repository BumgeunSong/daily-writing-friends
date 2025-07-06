import DOMPurify from 'dompurify';

// 게시글 본문용 DOMPurify 설정
const sanitizePostContent = (content: string): string => {
  // 가장 기본적인 설정만 유지
  const sanitizedContent = DOMPurify.sanitize(content, {
    USE_PROFILES: { html: true }
  });

  // HTML 문자열을 DOM 요소로 변환하고 글머리 기호 목록 변환 적용
  return convertQuillBulletListsInHtml(sanitizedContent);
};

/**
 * HTML 문자열에서 Quill 에디터의 글머리 기호 목록을 의미적으로 올바른 HTML로 변환
 * 
 * @param html - 변환할 HTML 문자열
 * @returns 변환된 HTML 문자열
 */
const convertQuillBulletListsInHtml = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html;
  
  convertQuillBulletLists(div);
  
  return div.innerHTML;
};

/**
 * Quill 에디터의 글머리 기호 목록을 의미적으로 올바른 HTML로 변환
 * 
 * Quill 에디터는 글머리 기호 목록(bullet list)을 <ol> 태그와 data-list="bullet" 속성을 사용하여 표현합니다.
 * 이는 시맨틱하지 않으며, 에디터 외부에서 렌더링할 때 번호 매기기 목록으로 표시되는 문제가 있습니다.
 * 이 함수는 해당 마크업을 찾아 <ul> 태그로 변환하여 시맨틱하게 올바른 HTML을 생성합니다.
 * 
 * @param element - 변환할 DOM 요소
 */
const convertQuillBulletLists = (element: HTMLElement): void => {
  // 모든 data-list="bullet" 속성을 가진 li 요소 찾기
  const bulletLists = element.querySelectorAll('li[data-list="bullet"]');
  
  // 이미 처리된 ol 요소를 추적하기 위한 Set
  const processedOls = new Set<Element>();

  bulletLists.forEach(li => {
    const parentOl = li.closest('ol');
    
    // 부모 ol이 존재하고 아직 처리되지 않았는지 확인
    if (parentOl && !processedOls.has(parentOl)) {
      // 해당 ol의 모든 자식이 bullet 타입인지 확인
      const allBullets = isAllChildrenBulletType(parentOl);
      
      if (allBullets) {
        // ol을 ul로 변환
        const ul = createUlFromOl(parentOl);
        
        // ol을 ul로 교체
        parentOl.replaceWith(ul);
        
        // 처리된 ol 추적
        processedOls.add(parentOl);
      }
    }
  });
};

/**
 * ol 요소의 모든 자식이 글머리 기호 타입(data-list="bullet")인지 확인
 * 
 * @param ol - 확인할 ol 요소
 * @returns 모든 자식이 글머리 기호 타입이면 true, 아니면 false
 */
const isAllChildrenBulletType = (ol: Element): boolean => {
  return Array.from(ol.children).every(
    child => child.tagName === 'LI' && child.getAttribute('data-list') === 'bullet'
  );
};

/**
 * ol 요소로부터 동일한 속성과 내용을 가진 ul 요소 생성
 * 순수 함수로 구현하여 원본 요소를 변경하지 않음
 * 
 * @param ol - 변환할 ol 요소
 * @returns 생성된 ul 요소
 */
const createUlFromOl = (ol: Element): HTMLUListElement => {
  // 새 ul 요소 생성
  const ul = document.createElement('ul');
  
  // ol의 모든 속성을 ul로 복사
  Array.from(ol.attributes).forEach(attr => {
    ul.setAttribute(attr.name, attr.value);
  });
  
  // ol의 내용을 ul로 복사
  ul.innerHTML = ol.innerHTML;
  
  return ul;
};

/**
 * HTML 문자열에서 Quill 에디터의 글머리 기호 목록을 ul 태그로 변환
 * 
 * @param html - 변환할 HTML 문자열
 * @returns 변환된 HTML 문자열
 */
const convertBulletListToUl = (html: string): string => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  convertQuillBulletLists(tempDiv);
  
  return tempDiv.innerHTML;
};

/**
 * ">" 기호로 시작하는 라인들을 HTML blockquote로 변환
 * 
 * @param content - 변환할 텍스트 콘텐츠
 * @returns blockquote가 적용된 HTML 문자열
 */
const convertQuotesToBlockquotes = (content: string): string => {
  const lines = content.split('\n');
  const result: string[] = [];
  let quoteLines: string[] = [];
  
  const flushQuoteLines = () => {
    if (quoteLines.length > 0) {
      const quotedContent = quoteLines
        .map(line => line.replace(/^>\s*/, '')) // ">" 및 공백 제거
        .join('\n');
      result.push(`<blockquote>${quotedContent}</blockquote>`);
      quoteLines = [];
    }
  };
  
  lines.forEach((line) => {
    if (line.trim().startsWith('>')) {
      quoteLines.push(line);
    } else {
      flushQuoteLines();
      // blockquote 직후 텍스트인 경우 줄바꿈 제거해서 댓글이 불필요하게 길어지지 않게 함 
      if (result.length > 0 && result[result.length - 1].endsWith('</blockquote>') && line.trim() !== '') {
        result[result.length - 1] += line;
      } else {
        result.push(line);
      }
    }
  });
  
  // 마지막에 남은 인용문 처리
  flushQuoteLines();
  
  return result.join('\n');
};

// 댓글/답글용 DOMPurify 설정 (게시글과 동일하게 적용)
const sanitizeCommentContent = (content: string): string => {
  // 1. 인용문 변환 적용
  const contentWithQuotes = convertQuotesToBlockquotes(content);
  
  // 2. URL을 링크로 변환하고 DOMPurify로 정제
  const sanitized = DOMPurify.sanitize(convertUrlsToLinks(contentWithQuotes), {
    USE_PROFILES: { html: true }
  });
  
  // 3. 댓글에도 글머리 기호 목록 변환 적용
  return convertQuillBulletListsInHtml(sanitized);
};

function convertUrlsToLinks(content: string): string {
  const urlRegex =
    /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\\/%?=~_|!:,.;]*[-A-Z0-9+&@#\\/%=~_|]|\bwww\.[-A-Z0-9+&@#\\/%?=~_|!:,.;]*[-A-Z0-9+&@#\\/%=~_|]|\b[-A-Z0-9+&@#\\/%?=~_|!:,.;]+\.[A-Z]{2,4}\b)/gi;
  return content.replace(urlRegex, (url) => {
    const href = url.startsWith('http') ? url : `http://${url}`;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
}

// 이미지 태그 제거
const removeImages = (element: HTMLElement): void => {
  const images = element.getElementsByTagName('img');
  while (images.length > 0) {
    images[0].parentNode?.removeChild(images[0]);
  }
};

// 제목 태그를 p 태그로 변환
const convertHeadingsToParagraphs = (element: HTMLElement): void => {
  ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
    const headings = element.getElementsByTagName(tag);
    while (headings.length > 0) {
      const heading = headings[0];
      const p = document.createElement('p');
      p.innerHTML = heading.innerHTML;
      heading.parentNode?.replaceChild(p, heading);
    }
  });
};

// 리스트 아이템을 텍스트로 변환
const convertListItemsToParagraphs = (element: HTMLElement): void => {
  const listItems = element.querySelectorAll('li');
  listItems.forEach(item => {
    const p = document.createElement('p');
    p.innerHTML = `- ${item.innerHTML}`;
    item.parentNode?.replaceChild(p, item);
  });
};

// 리스트 컨테이너 태그 제거
const removeListContainers = (element: HTMLElement): void => {
  ['ul', 'ol'].forEach(tag => {
    const lists = element.getElementsByTagName(tag);
    while (lists.length > 0) {
      const list = lists[0];
      const fragment = document.createDocumentFragment();
      while (list.firstChild) {
        fragment.appendChild(list.firstChild);
      }
      list.parentNode?.replaceChild(fragment, list);
    }
  });
};

// 빈 태그 제거
const removeEmptyTags = (element: HTMLElement): void => {
  const removeEmpty = (el: HTMLElement) => {
    // 모든 자식 요소에 대해 재귀적으로 처리
    Array.from(el.children).forEach(child => {
      if (child instanceof HTMLElement) {
        removeEmpty(child);
      }
    });

    // 텍스트 내용이 없고 이미지도 없는 빈 요소 제거
    if (
      el.textContent?.trim() === '' && 
      !el.querySelector('img') &&
      el !== element // 최상위 요소는 제거하지 않음
    ) {
      el.parentNode?.removeChild(el);
    }
  };

  removeEmpty(element);
};

// HTML 문자열을 DOM 요소로 변환
const createTempElement = (html: string): HTMLDivElement => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv;
};

const getContentPreview = (content: string): string => {
  // 1. XSS 방지를 위한 콘텐츠 정제
  const sanitizedContent = DOMPurify.sanitize(content);

  // 2. HTML 처리
  const tempDiv = createTempElement(sanitizedContent);
  
  // 3. 컨텐츠 변환 적용
  removeImages(tempDiv);
  convertHeadingsToParagraphs(tempDiv);
  convertListItemsToParagraphs(tempDiv);
  removeListContainers(tempDiv);
  removeEmptyTags(tempDiv);

  return tempDiv.innerHTML;
};

/**
 * HTML을 텍스트로 변환하는 함수 (복사-붙여넣기용)
 * 
 * @param html - 변환할 HTML 문자열
 * @returns 순수 텍스트 문자열
 */
const convertHtmlToText = (html: string): string => {
  // 임시 div 요소 생성하여 HTML 파싱 
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // <p> 태그를 줄바꿈으로 변환
  const paragraphs = tempDiv.querySelectorAll('p');
  paragraphs.forEach((p, index) => {
      if (index > 0) {
          p.insertAdjacentText('beforebegin', '\n');
      }
  });

  // <br> 태그를 줄바꿈으로 변환
  const breaks = tempDiv.querySelectorAll('br');
  breaks.forEach((br) => {
      br.insertAdjacentText('afterend', '\n');
  });
  
  return tempDiv.textContent || tempDiv.innerText || '';
};

export {
  convertUrlsToLinks,
  getContentPreview,
  sanitizePostContent,
  sanitizeCommentContent,
  convertHtmlToText
};