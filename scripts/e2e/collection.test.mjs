import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  checkCollection,
  collectListedSpecs,
  compareRunCount,
  listedTotalOf,
  parseCiProjects,
} from './collection.mjs';

describe('워크플로에서 CI 프로젝트를 읽을 때', () => {
  it('실행 명령의 --project 인자를 순서대로 모두 읽는다', () => {
    const workflow = 'run: pnpm exec playwright test --project=chromium-data-flows --project=chromium-non-member';

    assert.deepEqual(parseCiProjects(workflow), ['chromium-data-flows', 'chromium-non-member']);
  });

  it('--project 인자가 없으면 빈 목록이다', () => {
    assert.deepEqual(parseCiProjects('run: pnpm exec playwright test'), []);
  });
});

describe('--list 결과에서 수집된 spec을 모을 때', () => {
  const listJson = {
    config: { rootDir: '/repo/tests' },
    suites: [
      { file: 'auth.setup.ts', specs: [{ file: 'auth.setup.ts', tests: [{ projectName: 'setup' }] }] },
      {
        file: 'data-flows/post.spec.ts',
        suites: [
          {
            file: 'data-flows/post.spec.ts',
            specs: [{ file: 'data-flows/post.spec.ts', tests: [{ projectName: 'chromium-data-flows' }] }],
          },
        ],
      },
    ],
  };

  it('spec 경로를 프로젝트별 testDir이 아니라 최상위 rootDir 기준 저장소 상대 경로로 바꾼다', () => {
    const files = collectListedSpecs(listJson, '/repo').map((entry) => entry.file);

    assert.deepEqual(files, ['tests/auth.setup.ts', 'tests/data-flows/post.spec.ts']);
  });

  it('중첩된 suite의 spec도 프로젝트 이름과 함께 모은다', () => {
    const nested = collectListedSpecs(listJson, '/repo').find((entry) => entry.file.endsWith('post.spec.ts'));

    assert.equal(nested.project, 'chromium-data-flows');
  });
});

describe('CI가 수집하지 않는 spec을 베이스라인과 대조할 때', () => {
  const allSpecs = ['tests/a.spec.ts', 'tests/b.spec.ts', 'tests/c.spec.ts'];

  it('수집되지 않고 베이스라인에도 없는 spec은 새로 생긴 구멍으로 보고한다', () => {
    const result = checkCollection({ allSpecs, ciCollectedFiles: ['tests/a.spec.ts'], baseline: ['tests/b.spec.ts'] });

    assert.deepEqual(result.unexpected, ['tests/c.spec.ts']);
  });

  it('베이스라인에 올라 있는 미수집 spec은 구멍으로 보고하지 않는다', () => {
    const result = checkCollection({ allSpecs, ciCollectedFiles: ['tests/a.spec.ts'], baseline: ['tests/b.spec.ts', 'tests/c.spec.ts'] });

    assert.deepEqual(result.unexpected, []);
  });

  it('베이스라인에 있는데 이제 수집되는 spec은 지우라고 보고한다', () => {
    const result = checkCollection({ allSpecs, ciCollectedFiles: ['tests/a.spec.ts', 'tests/b.spec.ts'], baseline: ['tests/b.spec.ts', 'tests/c.spec.ts'] });

    assert.deepEqual(result.nowCollected, ['tests/b.spec.ts']);
  });

  it('베이스라인에 있는데 파일이 사라진 항목은 정리하라고 알린다', () => {
    const result = checkCollection({ allSpecs: ['tests/a.spec.ts'], ciCollectedFiles: ['tests/a.spec.ts'], baseline: ['tests/gone.spec.ts'] });

    assert.deepEqual(result.missingFiles, ['tests/gone.spec.ts']);
  });

  it('모든 spec이 수집되고 베이스라인이 비어 있으면 아무것도 보고하지 않는다', () => {
    const result = checkCollection({ allSpecs, ciCollectedFiles: allSpecs, baseline: [] });

    assert.deepEqual(result, { unexpected: [], nowCollected: [], missingFiles: [] });
  });
});

describe('--list가 센 수와 실제 실행 수를 비교할 때', () => {
  const listJson = { stats: { expected: 0, skipped: 35, unexpected: 0, flaky: 0 } };

  it('--list 수와 리포트의 실행 수가 같으면 일치한다', () => {
    const result = compareRunCount({
      listedTotal: listedTotalOf(listJson),
      reportStats: { expected: 33, unexpected: 0, flaky: 1, skipped: 1 },
    });

    assert.equal(result.matches, true);
  });

  it('돌려야 할 테스트가 하나 덜 돌았으면 불일치다', () => {
    const result = compareRunCount({
      listedTotal: 35,
      reportStats: { expected: 33, unexpected: 1, flaky: 0, skipped: 0 },
    });

    assert.deepEqual(result, { listedTotal: 35, executed: 34, matches: false });
  });
});
