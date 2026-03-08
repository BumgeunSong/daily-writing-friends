export enum UserAgent {
    Chrome = "Chrome",
    Edge = "Edge",
    Firefox = "Firefox",
    Opera = "Opera",
    Safari = "Safari",
    ChromeAndroid = "Chrome Android",
    FirefoxForAndroid = "Firefox for Android",
    OperaAndroid = "Opera Android",
    SafariOniOS = "Safari on iOS",
    SamsungInternet = "Samsung Internet",
    WebViewAndroid = "WebView Android",
    WebViewOniOS = "WebView on iOS",
    Deno = "Deno",
    NodeJs = "Node.js",
    Kakatalk = "Kakatalk",
    Unknown = "Unknown"
}

/**
 * userAgent 문자열을 UserAgent enum으로 파싱
 */
export function parseUserAgent(ua?: string | null): UserAgent {
  if (!ua) return UserAgent.Unknown;
  const s = ua.toLowerCase();
  if (s.includes('kakaotalk')) return UserAgent.Kakatalk;
  if (s.includes('chrome') && s.includes('android')) return UserAgent.ChromeAndroid;
  if (s.includes('firefox') && s.includes('android')) return UserAgent.FirefoxForAndroid;
  if (s.includes('opera') && s.includes('android')) return UserAgent.OperaAndroid;
  if (s.includes('samsungbrowser')) return UserAgent.SamsungInternet;
  if (s.includes('safari') && s.includes('iphone')) return UserAgent.SafariOniOS;
  if (s.includes('safari') && s.includes('ipad')) return UserAgent.SafariOniOS;
  if (s.includes('safari') && !s.includes('chrome')) return UserAgent.Safari;
  if (s.includes('chrome')) return UserAgent.Chrome;
  if (s.includes('firefox')) return UserAgent.Firefox;
  if (s.includes('opera') || s.includes('opr/')) return UserAgent.Opera;
  if (s.includes('edge')) return UserAgent.Edge;
  if (s.includes('deno')) return UserAgent.Deno;
  if (s.includes('node.js') || s.includes('nodejs')) return UserAgent.NodeJs;
  if (s.includes('wv') || s.includes('webview')) {
    if (s.includes('android')) return UserAgent.WebViewAndroid;
    if (s.includes('ios') || s.includes('iphone') || s.includes('ipad')) return UserAgent.WebViewOniOS;
  }
  return UserAgent.Unknown;
}