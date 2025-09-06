import { GoogleGenAI } from '@google/genai';
import { geminiApiKey, GEMINI_CONFIG, PROCESSING_LIMITS } from './config';
import { PostTone, PostMood, LLMAnalysisResult } from './types';

export class GeminiService {
  private client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: geminiApiKey.value() });
  }

  /**
   * 단일 포스트에 대한 요약, 톤, 무드 분석
   */
  async generateSummaryToneMood(postContent: string): Promise<LLMAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(postContent);
    return this.callGeminiWithRetry(prompt);
  }

  /**
   * 여러 포스트를 배치로 처리 (백필용)
   */
  async batchProcessSummaryToneMood(postContents: string[]): Promise<LLMAnalysisResult[]> {
    // 배치 모드로 비용 절약하면서 처리
    const results: LLMAnalysisResult[] = [];

    for (const content of postContents) {
      try {
        const result = await this.generateSummaryToneMood(content);
        results.push(result);

        // API 레이트 리미트 방지를 위한 짧은 대기
        await this.delay(100);
      } catch (error) {
        console.error('Batch processing error for content:', content.slice(0, 50), error);
        // 실패한 경우 기본값으로 추가
        results.push({
          summary: content.slice(0, 50).trim(),
          tone: 'informal',
          mood: 'peaceful_calm',
        });
      }
    }

    return results;
  }

  /**
   * LLM 분석 프롬프트 생성
   */
  private buildAnalysisPrompt(postContent: string): string {
    return `
한국어 글을 분석하여 다음 JSON 형식으로 응답해주세요:

글: "${postContent}"

응답 형식:
{
  "summary": "50자 이내의 한국어 요약",
  "tone": "tone_category",
  "mood": "mood_category"
}

TONE 카테고리 (작성자의 글쓰기 스타일):
- "thoughtful": 사려 깊은 - 깊은 생각과 배려를 담은 톤
- "warm": 따뜻한 - 친절하고 다정한 톤  
- "emotional": 감정적인 - 감정을 강하게 표현하는 톤
- "humorous": 유머러스한 - 재미있고 가벼운 톤
- "serious": 진지한 - 중요한 주제를 다루는 톤
- "informal": 비공식적인 - 친구와의 대화 같은 톤
- "formal": 공식적인 - 전문적이고 비즈니스 톤
- "optimistic": 낙관적인 - 긍정적이고 희망적인 톤
- "calm": 평화로운 - 차분하고 평온한 톤
- "guiding": 안내하는 - 단계별로 안내하는 톤
- "friendly": 우호적인 - 친근하고 우정 어린 톤

MOOD 카테고리 (글의 정서적 분위기):
- "happy_uplifting": Happy and Uplifting - 기쁨, 희망적인 전망을 전달
- "sad_gloomy": Sad or Gloomy - 우울, 외로움, 슬픔의 감정
- "tense_exciting": Tense and Exciting - 긴장감, 흥미진진함, 서스펜스
- "romantic_loving": Romantic and Loving - 깊은 유대감, 애정, 열정
- "mysterious_curious": Mysterious and Curious - 호기심, 탐구심을 유발
- "funny_lighthearted": Funny and Lighthearted - 유머로 즐거움을 제공
- "peaceful_calm": Peaceful and Calm - 평온하고 고요한 분위기

규칙:
- summary: 정확히 50자 이내의 한국어 요약
- tone: 11개 카테고리 중 하나 (작성자의 글쓰기 스타일)
- mood: 7개 카테고리 중 하나 (글의 정서적 분위기)
- JSON 형식을 정확히 지켜주세요
- 다른 설명 없이 JSON만 응답해주세요
`;
  }

  /**
   * 재시도 로직이 포함된 Gemini API 호출
   */
  private async callGeminiWithRetry(prompt: string): Promise<LLMAnalysisResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= PROCESSING_LIMITS.retryAttempts; attempt++) {
      try {
        const response = await this.client.models.generateContent({
          model: GEMINI_CONFIG.model,
          contents: prompt,
          config: {
            maxOutputTokens: GEMINI_CONFIG.maxOutputTokens,
            temperature: GEMINI_CONFIG.temperature,
            responseMimeType: 'application/json',
          },
        });

        if (!response.text) {
          throw new Error('Empty response from Gemini API');
        }
        return this.validateAndParseResponse(response.text);
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
   * LLM 응답 검증 및 파싱
   */
  private validateAndParseResponse(responseText: string): LLMAnalysisResult {
    try {
      const parsed = JSON.parse(responseText);

      // 응답 구조 검증
      if (!parsed.summary || !parsed.tone || !parsed.mood) {
        throw new Error('Missing required fields in response');
      }

      // 요약 길이 검증
      if (parsed.summary.length > 50) {
        parsed.summary = parsed.summary.slice(0, 50).trim();
      }

      // 톤 유효성 검증
      const validTones: PostTone[] = [
        'thoughtful',
        'warm',
        'emotional',
        'humorous',
        'serious',
        'informal',
        'formal',
        'optimistic',
        'calm',
        'guiding',
        'friendly',
      ];
      if (!validTones.includes(parsed.tone)) {
        console.warn(`Invalid tone received: ${parsed.tone}, defaulting to 'informal'`);
        parsed.tone = 'informal';
      }

      // 무드 유효성 검증
      const validMoods: PostMood[] = [
        'happy_uplifting',
        'sad_gloomy',
        'tense_exciting',
        'romantic_loving',
        'mysterious_curious',
        'funny_lighthearted',
        'peaceful_calm',
      ];
      if (!validMoods.includes(parsed.mood)) {
        console.warn(`Invalid mood received: ${parsed.mood}, defaulting to 'peaceful_calm'`);
        parsed.mood = 'peaceful_calm';
      }

      return {
        summary: parsed.summary,
        tone: parsed.tone as PostTone,
        mood: parsed.mood as PostMood,
      };
    } catch (error) {
      console.error('Failed to parse LLM response:', responseText, error);
      throw new Error(`Invalid LLM response format: ${error}`);
    }
  }

  /**
   * 비동기 대기 유틸리티
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
