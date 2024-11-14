function convertUrlsToLinks(content: string): string {
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;
    return content.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

export { convertUrlsToLinks };