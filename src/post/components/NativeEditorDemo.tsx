import { useState } from 'react';
import { NativeTextEditor } from './NativeTextEditor';

export function NativeEditorDemo() {
  const [content, setContent] = useState(`# 네이티브 텍스트 에디터 데모

한국어 IME 테스트를 위한 샘플 텍스트입니다.

## 테스트 해볼 기능들:

### 1. 한국어 입력 테스트
- 일반적인 한글 입력: 안녕하세요!
- 복합 자모: 꽃, 빛, 힘, 닭
- 긴 문장: 오늘은 정말 좋은 날씨네요. 밖에 나가서 산책을 하고 싶습니다.

### 2. 포맷팅 테스트  
- **굵은 글씨**
- *기울임체*
- ~~취소선~~

### 3. 목록 테스트
- 첫 번째 항목
- 두 번째 항목
- 세 번째 항목

1. 순서가 있는 목록
2. 두 번째 순서
3. 세 번째 순서

### 4. 인용문
> 이것은 인용문입니다.
> 여러 줄로 된 인용문도 가능합니다.

### 5. 키보드 단축키 테스트
- Ctrl+B (또는 ⌘+B): 굵은 글씨
- Ctrl+I (또는 ⌘+I): 기울임체
- Ctrl+S (또는 ⌘+S): 저장

### 6. 이미지 업로드 테스트
- 툴바의 이미지 버튼 클릭
- 이미지 파일 드래그 앤 드롭
- 이미지 붙여넣기 (Ctrl+V)

---

아래 에디터에서 자유롭게 테스트해보세요!`);

  const [savedContent, setSavedContent] = useState<string>('');
  const [saveCount, setSaveCount] = useState(0);

  const handleSave = (content: string) => {
    setSavedContent(content);
    setSaveCount(prev => prev + 1);
    console.log('Content saved:', content);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">네이티브 텍스트 에디터</h1>
          <p className="text-muted-foreground mt-2">
            한국어 IME 안정성을 위한 네이티브 textarea 기반 에디터
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Editor */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">에디터</h2>
            <div className="border rounded-lg">
              <NativeTextEditor
                initialContent={content}
                onSave={handleSave}
                variant="inline"
                placeholder="여기에서 한국어 입력을 테스트해보세요..."
                autoFocus
              />
            </div>
          </div>

          {/* Status Panel */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">상태 정보</h2>
              <div className="mt-2 p-4 bg-muted rounded-lg">
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>저장 횟수:</strong> {saveCount}번
                  </div>
                  <div>
                    <strong>현재 글자 수:</strong> {content.length}자
                  </div>
                  <div>
                    <strong>플랫폼:</strong> {navigator.platform}
                  </div>
                  <div>
                    <strong>User Agent:</strong> {navigator.userAgent.includes('Mobile') ? '모바일' : '데스크톱'}
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div>
              <h3 className="text-lg font-medium">미리보기</h3>
              <div className="mt-2 p-4 bg-muted rounded-lg max-h-96 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {savedContent || content}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            모바일 테스트 가이드
          </h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• <strong>iOS Safari:</strong> 한글 입력 시 자모가 분리되지 않는지 확인</p>
            <p>• <strong>Android Chrome:</strong> 키보드가 나타날 때 레이아웃이 깨지지 않는지 확인</p>
            <p>• <strong>툴바:</strong> 하단 고정 툴바가 키보드와 겹치지 않는지 확인</p>
            <p>• <strong>붙여넣기:</strong> 이미지 붙여넣기가 정상 작동하는지 확인</p>
            <p>• <strong>드래그 앤 드롭:</strong> 이미지 파일을 드래그해서 업로드되는지 확인</p>
          </div>
        </div>
      </div>
    </div>
  );
}