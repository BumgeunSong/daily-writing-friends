import { describe, expect, it } from 'vitest';

import { selectRequiredParams } from './selectRequiredParams';

describe('필수 URL 파라미터를 검증할 때', () => {
  it('요청한 키가 모두 있으면 좁혀진 객체를 돌려준다', () => {
    expect(selectRequiredParams({ boardId: 'b1', postId: 'p1' }, ['boardId', 'postId'])).toEqual({
      boardId: 'b1',
      postId: 'p1',
    });
  });

  it('요청하지 않은 키는 결과에서 제외한다', () => {
    expect(selectRequiredParams({ boardId: 'b1', draftId: 'd1' }, ['boardId'])).toEqual({
      boardId: 'b1',
    });
  });

  // 라우트가 매칭됐지만 세그먼트가 없는 건 라우팅 오류다. 트러스트 타입으로 캐스팅하지 않고
  // null을 돌려줘 호출자가 명시적으로 실패를 처리하게 한다.
  it('키가 하나라도 없으면 null을 돌려준다', () => {
    expect(selectRequiredParams({ boardId: 'b1' }, ['boardId', 'postId'])).toBeNull();
    expect(selectRequiredParams({}, ['boardId'])).toBeNull();
  });

  it('값이 빈 문자열이면 없는 것으로 보고 null을 돌려준다', () => {
    expect(selectRequiredParams({ boardId: '' }, ['boardId'])).toBeNull();
  });

  it('요청한 키가 없으면 빈 객체를 돌려준다', () => {
    expect(selectRequiredParams({ boardId: 'b1' }, [])).toEqual({});
  });
});
