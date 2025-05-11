import fs from 'fs';
import { execSync } from 'child_process';
import OpenAI from 'openai';
import path from 'path';
import process from 'process';

// 환경변수/옵션 처리
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const targetFile = process.argv[2]; // 옵션으로 파일 지정 가능
const useEmulator = process.env.USE_FIREBASE_EMULATOR === 'true';

// 대상 파일 탐색
let files = [];
if (targetFile) {
  files = [targetFile];
} else {
  const diff = execSync('git diff --name-only HEAD~1 HEAD | grep "src/.*\\.tsx$" || true').toString().trim();
  files = diff ? diff.split('\n') : [];
}
if (!files.length) {
  console.log('No target components found.');
  process.exit(0);
}

let totalTestCount = 0;

files.forEach(async (file) => {
  const componentCode = fs.readFileSync(file, 'utf-8');
  let prompt = fs.readFileSync('testgen-template.md', 'utf-8');
  prompt = prompt.replace('[PASTE COMPONENT CODE HERE]', componentCode);
  prompt = `USE_FIREBASE_EMULATOR: ${useEmulator}\nMODEL: ${model}\n` + prompt;

  const response = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    apiKey,
  });

  const testContent = response.choices[0].message.content;
  // test 디렉토리 경로 생성
  const testDir = path.join(path.dirname(file), 'test');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
  const testPath = path.join(testDir, path.basename(file).replace('.tsx', '.test.tsx'));

  // 기존 테스트 파일 병합 로직 (중복 제거 등은 별도 구현 필요)
  if (fs.existsSync(testPath)) {
    // 기존 테스트와 새 테스트를 병합 (중복 제거)
    // ... (여기서 병합 로직 구현)
  }
  fs.writeFileSync(testPath, testContent);

  // 생성된 테스트 수 추출 (AI 응답에서 "총 N개의 테스트가 생성되었습니다." 파싱)
  const match = testContent.match(/총 (\\d+)개의 테스트가 생성되었습니다\\./);
  if (match) totalTestCount += Number(match[1]);
  else totalTestCount += 1;

  console.log(`Generated test for: ${file}`);
});

console.log(`총 ${totalTestCount}개의 테스트가 생성되었습니다.`);