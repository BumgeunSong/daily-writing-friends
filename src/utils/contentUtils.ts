import DOMPurify from 'dompurify';

function convertUrlsToLinks(content: string): string {
  const urlRegex =
    /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\\/%?=~_|!:,.;]*[-A-Z0-9+&@#\\/%=~_|]|\bwww\.[-A-Z0-9+&@#\\/%?=~_|!:,.;]*[-A-Z0-9+&@#\\/%=~_|]|\b[-A-Z0-9+&@#\\/%?=~_|!:,.;]+\.[A-Z]{2,4}\b)/gi;
  return content.replace(urlRegex, (url) => {
    const href = url.startsWith('http') ? url : `http://${url}`;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
}

const getContentPreview = (content: string) => {
  // 1. XSS 방지를 위한 콘텐츠 정제
  const sanitizedContent = DOMPurify.sanitize(content);

  // 2. 이미지와 제목 태그 처리
  const processContent = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // 이미지 태그 제거
    // - 이미지는 별도의 썸네일 영역에 표시되므로 미리보기에서는 제거
    // - 이미지가 포함되면 미리보기의 높이가 불규칙해지는 것을 방지
    const images = tempDiv.getElementsByTagName('img');
    while(images.length > 0) {
      images[0].parentNode?.removeChild(images[0]);
    }
    
    // 제목 태그(h1~h6)를 p 태그로 변환
    // - 제목 태그는 큰 여백과 큰 글자 크기를 가져 미리보기의 공간을 비효율적으로 사용
    // - 카드 형태의 미리보기에서는 모든 텍스트가 일관된 크기로 표시되는 것이 더 깔끔
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
      const headings = tempDiv.getElementsByTagName(tag);
      while(headings.length > 0) {
        const heading = headings[0];
        const p = document.createElement('p');
        p.innerHTML = heading.innerHTML;
        heading.parentNode?.replaceChild(p, heading);
      }
    });
    
    return tempDiv.innerHTML;
  };

  return processContent(sanitizedContent);
};

export { convertUrlsToLinks, getContentPreview };