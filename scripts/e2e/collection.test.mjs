import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  checkCollection,
  collectListedSpecs,
  compareRunCount,
  findSpecFiles,
  listedTotalOf,
  parseCiProjects,
} from './collection.mjs';

describe('워크플로에서 CI 프로젝트를 읽을 때', () => {
  it('실행 명령의 --project 인자를 순서대로 모두 읽는다', () => {
    const workflow = 'run: pnpm exec playwright test --project=chromium-data-flows --project=chromium-non-member';

    assert.deepEqual(parseCiProjects(workflow), ['chromium-data-flows', 'chromium-non-member']);
  });

  it('주석 줄에 적힌 --project는 무시한다', () => {
    const workflow = ['# run: pnpm exec playwright test --project=old', 'run: pnpm exec playwright test --project=chromium'].join('\n');

    assert.deepEqual(parseCiProjects(workflow), ['chromium']);
  });

  it('playwright를 실행하지 않는 줄의 --project는 무시한다', () => {
    const workflow = ['run: echo --project=unrelated', 'run: pnpm exec playwright test --project=chromium'].join('\n');

    assert.deepEqual(parseCiProjects(workflow), ['chromium']);
  });

  it('공백으로 구분하거나 따옴표로 감싼 프로젝트 이름도 읽는다', () => {
    const workflow = `run: pnpm exec playwright test --project chromium --project="Mobile Chrome" --project='Desktop Safari'`;

    assert.deepEqual(parseCiProjects(workflow), ['chromium', 'Mobile Chrome', 'Desktop Safari']);
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

describe('디스크에서 spec 파일을 찾을 때', () => {
  const makeTree = (files) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-find-'));
    for (const file of files) {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), '');
    }
    return root;
  };

  it('확장자가 ts가 아닌 spec도 spec으로 찾는다', () => {
    const root = makeTree(['tests/a.spec.ts', 'tests/b.spec.js', 'tests/c.spec.tsx', 'tests/d.spec.mjs']);

    assert.deepEqual(findSpecFiles(root), ['tests/a.spec.ts', 'tests/b.spec.js', 'tests/c.spec.tsx', 'tests/d.spec.mjs']);
  });

  it('spec이 아닌 파일과 하위 폴더의 spec은 구분해서 찾는다', () => {
    const root = makeTree(['tests/helper.ts', 'tests/auth.setup.ts', 'tests/data-flows/x.spec.ts', 'tests/x.test.ts']);

    assert.deepEqual(findSpecFiles(root), ['tests/data-flows/x.spec.ts']);
  });
});
