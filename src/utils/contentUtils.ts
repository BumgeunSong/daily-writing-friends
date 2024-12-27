import DOMPurify from 'dompurify';

// 게시글 본문용 DOMPurify 설정
const sanitizePostContent = (content: string): string => {
  // DOMPurify 설정
  const config = {
    ADD_ATTR: ['target'],
    ADD_TAGS: ['a', 'ul', 'ol', 'li'], // ul 태그 허용
  };

  // HTML 정제 및 변환
  const sanitized = DOMPurify.sanitize(content, config);
  return convertBulletListToUl(sanitized);
};

// Quill에서 bullet list를 사용하는 경우, ol 태그를 사용하기 때문에 직접 ul 태그로 바꿔준다.
const convertBulletListToUl = (html: string): string => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const bulletLists = tempDiv.querySelectorAll('ol li[data-list="bullet"]');
  bulletLists.forEach(item => {
    const ul = document.createElement('ul');
    const li = document.createElement('li');
    li.innerHTML = item.innerHTML;
    ul.appendChild(li);
    const ol = item.closest('ol');
    if (ol) {
      ol.parentNode?.replaceChild(ul, ol);
    }
  });
  return tempDiv.innerHTML;
};

// 댓글/답글용 DOMPurify 설정 (게시글과 동일하게 적용)
const sanitizeCommentContent = (content: string): string => {
  return DOMPurify.sanitize(convertUrlsToLinks(content), {
    ADD_ATTR: ['target', 'data-list'],
    ADD_TAGS: ['a', 'ol', 'li'],
  });
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

export {
  convertUrlsToLinks,
  getContentPreview,
  sanitizePostContent,
  sanitizeCommentContent
};