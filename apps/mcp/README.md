# 매일글쓰기친구들 MCP 서버

AI 어시스턴트(Claude, ChatGPT)가 매일글쓰기친구들의 글을 읽을 수 있게 해주는 서버입니다.
연결하면 AI가 내 이전 글을 참고해서 다음 글쓰기를 도와줄 수 있습니다.

**서버 URL**: `https://daily-writing-friends-mcp.vercel.app/api/mcp`

---

## Claude에서 연결하기

> 필요한 플랜: Pro, Max, Team, Enterprise

### 1단계: 설정 열기

Claude 앱(데스크톱 또는 웹)에서 **좌측 하단 프로필 아이콘** → **Settings(설정)** 을 클릭합니다.

### 2단계: 커넥터 추가

1. 왼쪽 메뉴에서 **Connectors** 를 클릭합니다.
2. 아래쪽의 **Add custom connector** 를 클릭합니다.
3. URL 입력란에 아래 주소를 붙여넣습니다:
   ```
   https://daily-writing-friends-mcp.vercel.app/api/mcp
   ```
4. **Add** 버튼을 클릭합니다.

### 3단계: 대화에서 활성화

1. 새 대화를 시작합니다.
2. 채팅창 왼쪽 하단의 **+** 버튼을 클릭합니다.
3. **Connectors** 를 선택하고, 방금 추가한 커넥터를 켭니다.

### 4단계: 사용하기

이제 Claude에게 자연스럽게 요청하면 됩니다:

- "내 최근 글 보여줘" (이름을 물어보면 매글프에서 쓰는 이름을 알려주세요)
- "인기 많았던 글 찾아줘"
- "공감에 대해 쓴 글 검색해줘"
- "이 글 전체 내용 읽어줘"

---

## ChatGPT에서 연결하기

> 필요한 플랜: Pro, Team, Enterprise, Edu

### 1단계: 앱 만들기

1. ChatGPT에서 **좌측 하단 프로필 아이콘** → **Settings(설정)** 을 클릭합니다.
2. **Apps** 를 클릭합니다.
3. **Create app** 을 클릭하면 "New App" 창이 뜹니다.
4. 아래와 같이 입력합니다:
   - **Name**: `매일글쓰기친구들`
   - **Description**: `매일글쓰기친구들의 내 글을 검색하고 읽을 수 있는 도구`
   - **MCP Server URL**:
     ```
     https://daily-writing-friends-mcp.vercel.app/api/mcp
     ```
   - **Authentication**: 드롭다운을 **None** 으로 변경합니다. (기본값 OAuth → None)
5. 하단의 **"I understand and want to continue"** 체크박스를 체크합니다.
6. **Create** 를 클릭합니다.

### 2단계: 대화에서 활성화

1. 새 대화를 시작합니다.
2. 채팅창의 **+** 버튼 → **More** 를 클릭합니다.
3. 목록에서 **매일글쓰기친구들** 을 선택합니다.

### 3단계: 사용하기

ChatGPT에게 자연스럽게 요청하면 됩니다:

- "내 최근 글 목록 보여줘"
- "가장 반응이 좋았던 글 찾아줘"
- "'일상'이라는 키워드로 내 글 검색해줘"

ChatGPT가 도구를 사용할 때 확인 메시지가 뜨면 **Allow(허용)** 를 눌러주세요.

---

## 사용 가능한 기능

| 기능 | 설명 |
|------|------|
| 내 글 목록 보기 | 내가 쓴 글의 제목, 날짜, 미리보기를 볼 수 있습니다 |
| 글 전체 읽기 | 특정 글의 전체 내용을 읽을 수 있습니다 |
| 인기 글 보기 | 반응이 좋았던 글을 찾을 수 있습니다 |
| 키워드 검색 | 제목이나 내용에서 키워드로 검색할 수 있습니다 |

---

## 자주 묻는 질문

**Q: 무료 플랜에서도 쓸 수 있나요?**
아니요. Claude는 Pro 이상, ChatGPT는 Pro 이상 플랜이 필요합니다.

**Q: 다른 사람의 글도 볼 수 있나요?**
내 글 목록과 검색은 본인 글만 조회됩니다. 인기 글 보기는 전체 공개 글 중 반응이 좋은 글을 보여줍니다.

**Q: 이름을 어떻게 알려주나요?**
AI에게 "내 이름은 OOO이야"라고 말하면 됩니다. 매일글쓰기친구들에서 사용하는 실명 또는 닉네임을 알려주세요.

**Q: 연결이 안 돼요.**
서버 URL이 정확한지 확인해 주세요: `https://daily-writing-friends-mcp.vercel.app/api/mcp`

---

## 참고 자료

- [Claude 커넥터 공식 가이드](https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp)
- [ChatGPT 개발자 모드 및 커넥터 가이드](https://help.openai.com/en/articles/12584461-developer-mode-apps-and-full-mcp-connectors-in-chatgpt-beta)
- [ChatGPT MCP 연결 가이드 (OpenAI)](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt/)
