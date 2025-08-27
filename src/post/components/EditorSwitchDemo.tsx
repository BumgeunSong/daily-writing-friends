import { useState } from 'react';
import { useRemoteConfig } from '@/shared/contexts/RemoteConfigContext';
import { PostEditor } from './PostEditor';
import { Button } from '@/shared/ui/button';

export function EditorSwitchDemo() {
  const [content, setContent] = useState(`# 에디터 테스트

현재 사용 중인 에디터를 확인하고 테스트해보세요.

## 기본 포맷팅
- **굵은 글씨**
- *기울임체*  
- ~~취소선~~

## 목록
1. 첫 번째 항목
2. 두 번째 항목
3. 세 번째 항목

- 불릿 목록
- 두 번째 아이템

> 인용문 테스트

한글 IME 테스트: 안녕하세요! 오늘 날씨가 정말 좋네요.`);

  const { value: nativeEditorEnabled, isLoading: nativeLoading } = useRemoteConfig('native_editor_enabled');

  const getCurrentEditor = () => {
    if (nativeEditorEnabled) return 'Native Textarea Editor';
    return 'React-Quill Editor (Default)';
  };

  if (nativeLoading) {
    return <div className="p-4">Loading editor configuration...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">에디터 전환 데모</h1>
          <p className="text-muted-foreground mt-2">
            Remote Config를 통한 에디터 전환 시스템 테스트
          </p>
        </div>

        {/* Status Panel */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">현재 설정 상태</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-medium">Feature Flags</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>native_editor_enabled:</span>
                  <span className={nativeEditorEnabled ? 'text-green-600' : 'text-red-600'}>
                    {nativeEditorEnabled.toString()}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">활성 에디터</h3>
              <div className="text-sm">
                <span className="font-medium text-blue-600">{getCurrentEditor()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">에디터</h2>
          <div className="rounded-lg border">
            <PostEditor
              value={content}
              onChange={setContent}
              placeholder="여기에서 텍스트를 입력해보세요..."
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="rounded-lg bg-blue-50 p-4">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            테스트 방법
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p><strong>Firebase Console</strong>에서 Remote Config 값을 변경하여 에디터를 전환할 수 있습니다:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><code>native_editor_enabled = true</code> → Native Textarea Editor 사용</li>
              <li><code>native_editor_enabled = false</code> → React-Quill Editor 사용 (기본값)</li>
            </ul>
          </div>
        </div>

        {/* Korean IME Test Section */}
        {nativeEditorEnabled && (
          <div className="rounded-lg bg-green-50 p-4">
            <h3 className="text-lg font-medium text-green-900 mb-2">
              🇰🇷 Korean IME 테스트
            </h3>
            <div className="text-sm text-green-800 space-y-2">
              <p>Native Editor에서 다음을 테스트해보세요:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>한글 입력 시 자모가 분리되지 않는지 확인</li>
                <li>복합 자모 (꽃, 빛, 닭, 등) 입력 테스트</li>
                <li>모바일 키보드에서의 안정성 확인</li>
                <li>Ctrl+B, Ctrl+I 등 단축키 작동 확인</li>
                <li>이미지 붙여넣기 (Ctrl+V) 테스트</li>
              </ul>
            </div>
          </div>
        )}

        {/* Raw Content Preview */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">원본 콘텐츠</h2>
          <div className="rounded-lg bg-muted p-4">
            <pre className="text-sm whitespace-pre-wrap font-mono overflow-auto">
              {content}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}