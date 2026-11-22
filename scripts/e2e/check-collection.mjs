#!/usr/bin/env node
/**
 * 수집되지 않아 CI에서 한 번도 돌지 않는 E2E spec을 잡는 가드.
 *
 *   node scripts/e2e/check-collection.mjs                         # 수집 대조
 *   node scripts/e2e/check-collection.mjs --report <report.json>  # 거기에 실행 수 대조
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  checkCollection,
  collectListedSpecs,
  compareRunCount,
  findSpecFiles,
  listedTotalOf,
  parseCiProjects,
} from './collection.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const workflowPath = '.github/workflows/run-playwright.yml';
const baselinePath = 'tests/ci-uncollected.baseline.json';

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, file), 'utf8'));
}

function listCiTests(projects) {
  // 표준출력에 섞이는 spec/설정의 console.log가 JSON을 깨지 않도록 파일로 받는다.
  const outputFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-list-')), 'list.json');
  const args = ['exec', 'playwright', 'test', '--list', '--reporter=json', ...projects.map((p) => `--project=${p}`)];
  execFileSync('pnpm', args, {
    cwd: repoRoot,
    env: { ...process.env, SKIP_SEED: '1', PLAYWRIGHT_JSON_OUTPUT_NAME: outputFile },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const listJson = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  if (listJson.errors.length > 0) {
    console.error('playwright --list가 오류를 보고했다:');
    for (const error of listJson.errors) console.error(`  - ${error.message}`);
    process.exit(1);
  }
  return listJson;
}

function main() {
  const reportFlag = process.argv.indexOf('--report');
  const reportPath = reportFlag === -1 ? null : process.argv[reportFlag + 1];

  const projects = parseCiProjects(fs.readFileSync(path.join(repoRoot, workflowPath), 'utf8'));
  if (projects.length === 0) {
    console.error(`${workflowPath}에서 --project= 인자를 찾지 못했다.`);
    process.exit(1);
  }

  const listJson = listCiTests(projects);
  const listed = collectListedSpecs(listJson, repoRoot);
  const result = checkCollection({
    allSpecs: findSpecFiles(repoRoot),
    ciCollectedFiles: listed.map((entry) => entry.file),
    baseline: readJson(baselinePath).map((entry) => entry.file),
  });

  console.log(`CI 프로젝트: ${projects.join(', ')}`);
  console.log(`CI가 수집하는 테스트 ${listedTotalOf(listJson)}건, spec 파일 ${new Set(listed.map((e) => e.file)).size}개`);

  let failed = false;
  if (result.unexpected.length > 0) {
    failed = true;
    console.error('\nCI가 수집하지 않는 spec이 있다(한 번도 실행되지 않는다):');
    for (const file of result.unexpected) console.error(`  - ${file}`);
    console.error(`CI 프로젝트가 수집하도록 playwright.config.ts를 고쳐라. 고칠 수 없는 사정이 있으면 ${baselinePath}에 이유와 함께 올린다. 이 목록은 줄이기만 한다.`);
  }
  if (result.nowCollected.length > 0) {
    failed = true;
    console.error(`\n이제 CI가 수집하므로 ${baselinePath}에서 지워야 한다:`);
    for (const file of result.nowCollected) console.error(`  - ${file}`);
  }
  for (const file of result.missingFiles) {
    console.warn(`경고: ${baselinePath}의 ${file}는 파일이 없다. 베이스라인에서 지워라.`);
  }

  if (reportPath) {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const comparison = compareRunCount({ listedTotal: listedTotalOf(listJson), reportStats: report.stats });
    console.log(`\n--list ${comparison.listedTotal}건, 실제 리포트 ${comparison.executed}건`);
    if (!comparison.matches) {
      failed = true;
      console.error('--list가 센 수와 CI가 실제로 돌린 수가 다르다. 프로젝트 필터나 testIgnore를 확인하라.');
    }
  }

  process.exit(failed ? 1 : 0);
}

main();
