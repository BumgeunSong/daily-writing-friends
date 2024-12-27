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

  // 2. 이미지 제거
  const removeImages = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // 모든 이미지 태그 제거
    const images = tempDiv.getElementsByTagName('img');
    while (images.length > 0) {
      images[0].parentNode?.removeChild(images[0]);
    }

    return tempDiv.innerHTML;
  };

  // 3. 정제된 콘텐츠에서 이미지 제거
  return removeImages(sanitizedContent);
};

export { convertUrlsToLinks, getContentPreview };
