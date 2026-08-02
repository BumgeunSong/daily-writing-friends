import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { readLocationState } from './readLocationState';

const schema = z.object({ name: z.string(), count: z.number().optional() });

describe('location.state를 스키마로 검증할 때', () => {
  it('스키마를 통과하면 검증된 상태를 돌려준다', () => {
    expect(readLocationState({ name: 'a', count: 2 }, schema)).toEqual({ name: 'a', count: 2 });
  });

  it('선택 필드가 없어도 통과한다', () => {
    expect(readLocationState({ name: 'a' }, schema)).toEqual({ name: 'a' });
  });

  // 내비게이터가 넘긴 신뢰할 수 없는 state를 트러스트 타입으로 캐스팅하면 안 된다.
  it('모양이 다르면 캐스팅하지 않고 undefined를 돌려줘야 한다', () => {
    expect(readLocationState({ count: 2 }, schema)).toBeUndefined();
    expect(readLocationState({ name: 1 }, schema)).toBeUndefined();
  });

  it('state가 없거나 객체가 아니면 undefined다', () => {
    expect(readLocationState(null, schema)).toBeUndefined();
    expect(readLocationState(undefined, schema)).toBeUndefined();
    expect(readLocationState('nope', schema)).toBeUndefined();
  });
});
