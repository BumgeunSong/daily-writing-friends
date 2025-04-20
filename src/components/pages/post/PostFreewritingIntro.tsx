import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react'; // 아이콘 추가

const PostFreewritingIntro: React.FC = () => {

  const handleStartFreewriting = () => {
    // TODO: 실제 자유 글쓰기 생성 로직 또는 페이지 이동 구현
    console.log('자유 글쓰기 시작!');
    
    // 예: navigate('/freewriting/new'); 
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* 페이지 내용 영역 */}
      <div className="flex-grow p-6 pt-10 flex flex-col items-center text-left">
        <h1 className="text-3xl font-bold mb-4 text-primary">
          프리라이팅
        </h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          머릿속의 편집자를 끄고 5분간 써보기
        </p>

        <div className="w-full max-w-sm space-y-4 mb-8">
          <div className="flex items-start p-4 bg-card rounded-lg border">
            <span className="text-2xl mr-3">🔒</span>
            <div>
              <h3 className="font-semibold mb-1">비공개 글쓰기</h3>
              <p className="text-sm text-muted-foreground">
                프리라이팅으로 쓴 글은 다른 멤버들에게 보이지 않아요. 하지만 잔디는 심어지고, 본인은 볼 수 있어요. 
              </p>
            </div>
          </div>
          <div className="flex items-start p-4 bg-card rounded-lg border">
             <span className="text-2xl mr-3">🏃</span>
            <div>
              <h3 className="font-semibold mb-1">판단하지 않고 쓰기</h3>
              <p className="text-sm text-muted-foreground">
                멈추거나 지우지 마세요. 머릿속에 떠오르는 생각을 그대로 필터없이 씁니다. 내 글을 판단하지 않는 게 프리라이팅의 핵심이에요.
              </p>
            </div>
          </div>
           <div className="flex items-start p-4 bg-card rounded-lg border">
             <span className="text-2xl mr-3">⏰</span>
            <div>
              <h3 className="font-semibold mb-1">5분을 채워보세요</h3>
              <p className="text-sm text-muted-foreground">
                글을 쓰는 동안 시간이 올라갑니다. 5분을 채워야 업로드할 수 있어요! 중간에 나오면 글은 사라져요.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* 하단 고정 CTA */}
      <div className="sticky bottom-0 left-0 right-0 bg-background border-t p-4">
        <Button 
          className="w-full text-lg py-6" 
          onClick={handleStartFreewriting}
        >
          시작하기
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default PostFreewritingIntro;
