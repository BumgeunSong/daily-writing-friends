import { GoogleGenAI } from '@google/genai';
import { geminiApiKey, GEMINI_CONFIG, PROCESSING_LIMITS } from './config';

/**
 * Gemini API와 상호작용하는 서비스 클래스
 * 댓글 제안 생성에 사용됨
 */
export class GeminiService {
  private client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: geminiApiKey.value() });
  }

  /**
   * 댓글 제안 생성을 위한 메서드
   * JSON 응답을 직접 반환
   */
  async generateCommentSuggestions(prompt: string): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= PROCESSING_LIMITS.retryAttempts; attempt++) {
      try {
        const response = await this.client.models.generateContent({
          model: GEMINI_CONFIG.model,
          contents: prompt,
          config: {
            maxOutputTokens: 400, // 4개 제안에 충분한 토큰
            temperature: 0.7,     // 더 창의적인 제안을 위해 온도 상승
            responseMimeType: 'application/json',
          },
        });

        if (!response.text) {
          throw new Error('Empty response from Gemini API');
        }

        // JSON 파싱하여 반환
        return JSON.parse(response.text);
      } catch (error) {
        lastError = error as Error;
        console.error(
          `Gemini API call failed (attempt ${attempt}/${PROCESSING_LIMITS.retryAttempts}):`,
          error,
        );

        if (attempt < PROCESSING_LIMITS.retryAttempts) {
          await this.delay(PROCESSING_LIMITS.retryDelayMs * attempt);
        }
      }
    }

    throw new Error(
      `Gemini API failed after ${PROCESSING_LIMITS.retryAttempts} attempts. Last error: ${lastError?.message}`,
    );
  }

  /**
   * 비동기 대기 유틸리티
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
