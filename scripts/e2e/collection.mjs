import fs from 'node:fs';
import path from 'node:path';

/** CI가 실행하는 Playwright 프로젝트 이름을 워크플로의 `--project=` 인자에서 읽는다. */
export function parseCiProjects(workflowText) {
  return [...workflowText.matchAll(/--project=([^\s"']+)/g)].map((match) => match[1]);
}

/**
 * `playwright test --list --reporter=json` 결과에서 (프로젝트, spec 파일) 쌍을 모은다.
 * spec 파일은 프로젝트별 testDir이 아니라 최상위 `rootDir` 기준 상대 경로라서
 * 저장소 루트 기준 경로로 바꾼다.
 */
export function collectListedSpecs(listJson, repoRoot) {
  const listed = [];
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        const file = path.relative(repoRoot, path.resolve(listJson.config.rootDir, spec.file));
        listed.push({ project: test.projectName, file: file.split(path.sep).join('/') });
      }
    }
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of listJson.suites) walk(suite);
  return listed;
}

/** 디스크에서 `*.spec.ts` 파일을 저장소 루트 기준 경로로 모은다. */
export function findSpecFiles(repoRoot, dir = 'tests') {
  const found = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(path.join(repoRoot, current), { withFileTypes: true })) {
      const relative = `${current}/${entry.name}`;
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') walk(relative);
      } else if (entry.name.endsWith('.spec.ts')) {
        found.push(relative);
      }
    }
  };
  walk(dir);
  return found.sort();
}

/**
 * CI가 수집하지 않는 spec을 베이스라인과 대조한다.
 * - `unexpected`: 베이스라인에 없는데 CI가 수집하지 않는 spec (새로 생긴 구멍)
 * - `nowCollected`: 베이스라인에 있는데 CI가 이제 수집하는 spec (베이스라인에서 지워야 한다)
 * - `missingFiles`: 베이스라인에 있는데 파일이 없는 항목 (정리 권장, 실패는 아님)
 */
export function checkCollection({ allSpecs, ciCollectedFiles, baseline }) {
  const collected = new Set(ciCollectedFiles);
  const known = new Set(baseline);
  const existing = new Set(allSpecs);
  return {
    unexpected: allSpecs.filter((file) => !collected.has(file) && !known.has(file)),
    nowCollected: baseline.filter((file) => collected.has(file)),
    missingFiles: baseline.filter((file) => !existing.has(file) && !collected.has(file)),
  };
}

/** `--list`가 센 수와 실제 실행 리포트가 센 수를 비교한다. */
export function compareRunCount({ listedTotal, reportStats }) {
  const executed =
    reportStats.expected + reportStats.unexpected + reportStats.flaky + reportStats.skipped;
  return { listedTotal, executed, matches: listedTotal === executed };
}

export function listedTotalOf(listJson) {
  return listJson.stats.skipped + listJson.stats.expected + listJson.stats.unexpected + listJson.stats.flaky;
}
