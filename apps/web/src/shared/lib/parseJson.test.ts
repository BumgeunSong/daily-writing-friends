import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { parseJson, parseJsonUnknown } from './parseJson';

describe('경계 JSON 문자열을 unknown으로 파싱할 때', () => {
  it('올바른 JSON 객체를 그대로 돌려준다', () => {
    expect(parseJsonUnknown('{"a":1}')).toEqual({ a: 1 });
  });

  it('원시값 JSON도 그대로 돌려준다', () => {
    expect(parseJsonUnknown('42')).toBe(42);
    expect(parseJsonUnknown('"hi"')).toBe('hi');
    expect(parseJsonUnknown('true')).toBe(true);
  });

  it('null·undefined·빈 문자열은 undefined다', () => {
    expect(parseJsonUnknown(null)).toBeUndefined();
    expect(parseJsonUnknown(undefined)).toBeUndefined();
    expect(parseJsonUnknown('')).toBeUndefined();
  });

  it('망가진 JSON은 던지지 않고 undefined로 낮춘다', () => {
    expect(parseJsonUnknown('{not json')).toBeUndefined();
  });
});

const pointSchema = z.object({ x: z.number(), y: z.number() });

describe('스키마로 검증해 파싱할 때', () => {
  it('스키마를 통과하면 검증된 값을 돌려준다', () => {
    expect(parseJson('{"x":1,"y":2}', pointSchema)).toEqual({ x: 1, y: 2 });
  });

  // 신뢰할 수 없는 값이 스키마를 통과하지 못하면 트러스트 타입으로 새면 안 된다.
  it('모양이 다르면 트러스트 타입으로 새지 않고 undefined를 돌려줘야 한다', () => {
    expect(parseJson('{"x":1}', pointSchema)).toBeUndefined();
    expect(parseJson('{"x":"a","y":"b"}', pointSchema)).toBeUndefined();
  });

  it('망가진 JSON은 undefined다', () => {
    expect(parseJson('nope', pointSchema)).toBeUndefined();
  });

  it('null 입력은 undefined다', () => {
    expect(parseJson(null, pointSchema)).toBeUndefined();
  });
});
