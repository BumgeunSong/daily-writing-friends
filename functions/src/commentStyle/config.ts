import { defineSecret } from "firebase-functions/params";

// Gemini API 키 시크릿 정의
export const geminiApiKey = defineSecret("GEMINI_API_KEY");

// Cloud Function 런타임 옵션
export const runtimeOptions = {
  timeoutSeconds: 60,
  memory: "512MiB" as const,
  minInstances: 1,        // 콜드 스타트 방지
  maxInstances: 10,       // 동시 실행 제한
  secrets: [geminiApiKey] // 시크릿 접근 권한
};

// 백필 함수용 런타임 옵션 (더 긴 타임아웃)
export const backfillRuntimeOptions = {
  timeoutSeconds: 540,    // HTTP 함수 최대 타임아웃
  memory: "1GiB" as const,
  minInstances: 0,        // 백필은 주기적으로만 실행
  maxInstances: 1,        // 백필은 단일 인스턴스로만
  secrets: [geminiApiKey]
};

// Gemini 모델 설정
export const GEMINI_CONFIG = {
  model: "models/gemini-2.5-flash-lite", // Gemini 2.5 Flash-lite - 초경량 고속 모델
  maxOutputTokens: 200,                  // 요약 + 분류 결과용
  temperature: 0.1,                      // 일관성 있는 분류를 위해 낮은 온도
} as const;

// 처리 제한 설정
export const PROCESSING_LIMITS = {
  maxCommentsPerUser: 10,         // 사용자당 최대 처리할 댓글 수
  batchSize: 5,                   // 백필 시 동시 처리할 사용자 수
  retryAttempts: 3,               // LLM 호출 재시도 횟수
  retryDelayMs: 1000,             // 재시도 간 대기 시간
} as const;