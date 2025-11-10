import { onRequest } from 'firebase-functions/v2/https';
import {
  GenerateSuggestionsRequest,
  GenerateSuggestionsResponse,
  CommentSuggestion,
  GeminiSuggestionResponse,
} from './types';
import { geminiApiKey } from './config';
import { GeminiService } from './geminiService';
import { Commenting } from '../commentings/Commenting';
import admin from '../shared/admin';

/**
 * HTTP Cloud Function to generate personalized comment suggestions
 *
 * Process:
 * 1. Fetch user's last 10 commentings records (with content)
 * 2. Fetch target post content
 * 3. Build prompt with examples + instructions
 * 4. Call Gemini API
 * 5. Return 4 suggestions
 */
export const generateCommentSuggestions = onRequest(
  {
    timeoutSeconds: 30,
    memory: '512MiB' as const,
    minInstances: 0,
    maxInstances: 10,
    secrets: [geminiApiKey],
    invoker: 'public', // Allow unauthenticated access
  },
  async (req, res): Promise<void> => {
    // CORS 헤더 설정
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    try {
      // Parse request body
      const { userId, postId, boardId } = req.body as GenerateSuggestionsRequest;

      // Validate required parameters
      if (!userId || !postId || !boardId) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: userId, postId, boardId',
        } as GenerateSuggestionsResponse);
        return;
      }

      console.log(`Generating suggestions for user ${userId} on post ${postId}`);

      // 1. Fetch user's comment history from commentings collection
      const commentHistory = await getUserCommentHistory(userId);
      console.log(`Found ${commentHistory.length} historical comments for user`);

      // 2. Check if user has enough history (minimum 3 comments)
      if (commentHistory.length < 3) {
        console.log('User has insufficient comment history, using default suggestions');
        const defaultSuggestions = await generateDefaultSuggestions();
        res.json({
          success: true,
          suggestions: defaultSuggestions,
          isDefault: true,
        } as GenerateSuggestionsResponse);
        return;
      }

      // 3. Fetch target post
      const postDoc = await admin.firestore().doc(`boards/${boardId}/posts/${postId}`).get();

      if (!postDoc.exists) {
        res.status(404).json({
          success: false,
          error: 'Post not found',
        } as GenerateSuggestionsResponse);
        return;
      }

      const postData = postDoc.data();
      const postContent = postData?.content || '';
      const postAuthorName = postData?.authorName || '';

      // 4. Build prompt and generate suggestions
      const prompt = buildSuggestionPrompt(commentHistory, postContent, postAuthorName);

      // 5. Call Gemini API
      const geminiService = new GeminiService();
      let suggestions: CommentSuggestion[];
      
      try {
        suggestions = await generateWithGemini(geminiService, prompt);
      } catch (geminiError) {
        console.error('Gemini API failed, falling back to default suggestions:', geminiError);
        // Fallback to default suggestions if Gemini fails
        const defaultSuggestions = await generateDefaultSuggestions();
        res.json({
          success: true,
          suggestions: defaultSuggestions,
          isDefault: true,
          warning: 'Used default suggestions due to API error',
        } as GenerateSuggestionsResponse);
        return;
      }

      // 6. Return suggestions
      res.json({
        success: true,
        suggestions: suggestions,
        isDefault: false,
      } as GenerateSuggestionsResponse);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate suggestions',
      } as GenerateSuggestionsResponse);
    }
  },
);

/**
 * Fetch user's comment history from commentings collection
 * Fetches 20 docs, filters to those with content, takes first 10
 */
async function getUserCommentHistory(userId: string): Promise<Commenting[]> {
  const snapshot = await admin
    .firestore()
    .collection('users')
    .doc(userId)
    .collection('commentings')
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  // Filter out old Commenting documents that don't have content field
  const commentsWithContent = snapshot.docs
    .map((doc) => doc.data() as Commenting)
    .filter((data) => data.comment.content);

  // Return first 10 comments with content
  return commentsWithContent.slice(0, 10);
}

/**
 * Build the prompt for Gemini to generate suggestions
 */
function buildSuggestionPrompt(
  commentHistory: Commenting[],
  postContent: string,
  postAuthorName: string,
): string {
  // Format comment history examples
  const examples = commentHistory
    .map((data, index) => {
      return `예시 ${index + 1}: "${data.comment.content}"`;
    })
    .join('\n\n');

  // Truncate post content if too long
  const targetContent =
    postContent.length > 1500 ? postContent.slice(0, 1500) + '...' : postContent;

  return `당신은 사용자의 댓글 스타일을 학습하여 개인화된 댓글을 제안하는 AI입니다.

## 사용자가 과거에 작성한 댓글 (최근 10개 예시):
${examples}

## 위 예시를 분석하여 파악한 사용자의 댓글 작성 스타일:
- 댓글 길이 패턴 (짧은 편인지, 긴 편인지)
- 이모지 사용 빈도와 패턴
- 반말/존댓말 사용 여부
- 자주 쓰는 표현이나 말버릇
- 감정 표현 방식 (직접적인지, 은유적인지)
- 문장 구조와 리듬

## 새로운 포스트 (댓글을 작성할 대상):
작성자: ${postAuthorName}
내용: "${targetContent}"

## 과제:
위 사용자의 스타일을 **정확히** 모방하여 새로운 포스트에 어울리는 댓글 제안 4개를 생성하세요.

### 각 제안 유형별 목표:
• [trait] - 글쓴이의 성격/가치관을 가볍게 추측하는 코멘트
• [highlight] - 포스트에서 인상적인 부분을 짧게 인용 후 반응 (> 인용문 형식 사용)
• [empathy] - 글쓴이의 감정에 공감하는 코멘트
• [curiosity] - 포스트 내용에 대해 궁금한 점을 질문하는 코멘트

## 필수 작성 규칙:

### 스타일 모방:
- **사용자의 과거 댓글 스타일을 정확히 따라하세요** 
- 사용자가 사용하는 종결 어미를 따라하세요. (예: ~해요, ~습니다, ~네요, ~데요, ~어요, ~겠죠, ~걸요, ~군요)
- 사용자가 사용한 말투, 표현, 이모지만 사용
- 사용자의 평균 댓글 길이와 비슷하게 (±20%)
- 사용자가 쓰지 않은 표현이나 이모지는 절대 사용 금지

### 톤 & 표현:
- 사용자가 존댓말을 쓰면 존댓말로, 반말을 쓰면 반말로
- 사용자가 사용한 감탄사(ㅋㅋ, ㅎㅎ, 헉, 아이고, ㅠㅠ 등)만 사용
- 사용자가 사용한 말버릇이나 특징적 표현을 반영

### 내용 구성:
- 포스트 내용을 읽고 자연스럽게 반응
- 포스트 인용 시 > 인용문 형식 사용
- 2~3문장 정도로 간결하게

### 금지사항:
- 절대 '좋네요', '최고예요' 같은 뻔한 칭찬 금지
- AI 티 나는 완벽하고 정제된 문장 금지
- 사용자가 사용하지 않은 표현/이모지 사용 금지
- 사용자 스타일과 다른 톤 사용 금지

JSON 형식으로만 응답하세요:
{
  "suggestions": [
    {"type": "trait", "text": "..."},
    {"type": "highlight", "text": "..."},
    {"type": "empathy", "text": "..."},
    {"type": "curiosity", "text": "..."}
  ]
}`;
}

/**
 * Type guard to validate CommentSuggestion structure
 */
function isValidCommentSuggestion(obj: unknown): obj is CommentSuggestion {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    'text' in obj &&
    typeof (obj as any).type === 'string' &&
    typeof (obj as any).text === 'string' &&
    ['trait', 'highlight', 'empathy', 'curiosity'].includes((obj as any).type)
  );
}

/**
 * Type guard to validate GeminiSuggestionResponse structure
 */
function isValidGeminiResponse(obj: unknown): obj is GeminiSuggestionResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'suggestions' in obj &&
    Array.isArray((obj as any).suggestions) &&
    (obj as any).suggestions.every(isValidCommentSuggestion)
  );
}

/**
 * Validate and sanitize suggestion text
 */
function sanitizeSuggestionText(text: string): string {
  if (typeof text !== 'string') {
    throw new Error('Suggestion text must be a string');
  }
  
  const sanitized = text.trim();
  
  if (sanitized.length === 0) {
    throw new Error('Suggestion text cannot be empty');
  }
  
  if (sanitized.length > 500) {
    throw new Error('Suggestion text too long (max 500 characters)');
  }
  
  return sanitized;
}

/**
 * Generate suggestions using Gemini API
 */
async function generateWithGemini(
  geminiService: GeminiService,
  prompt: string,
): Promise<CommentSuggestion[]> {
  try {
    // Use the new generateCommentSuggestions method
    const response = await geminiService.generateCommentSuggestions(prompt);

    // Validate response structure with type guard
    if (!isValidGeminiResponse(response)) {
      console.error('Invalid Gemini API response structure:', response);
      throw new Error('Invalid response format from Gemini API');
    }

    // Validate we have exactly 4 suggestions as expected
    if (response.suggestions.length !== 4) {
      console.warn(`Expected 4 suggestions, got ${response.suggestions.length}`);
    }

    // Ensure we have all required suggestion types
    const expectedTypes = ['trait', 'highlight', 'empathy', 'curiosity'];
    const receivedTypes = response.suggestions.map(s => s.type);
    const missingTypes = expectedTypes.filter(type => !receivedTypes.includes(type));
    
    if (missingTypes.length > 0) {
      console.warn('Missing suggestion types:', missingTypes);
    }

    // Validate, sanitize and map suggestions
    const validatedSuggestions: CommentSuggestion[] = response.suggestions.map((suggestion) => {
      try {
        const sanitizedText = sanitizeSuggestionText(suggestion.text);
        return {
          type: suggestion.type as CommentSuggestion['type'],
          text: sanitizedText,
        };
      } catch (sanitizationError) {
        console.error('Suggestion sanitization failed:', sanitizationError);
        throw new Error(`Invalid suggestion text for type ${suggestion.type}`);
      }
    });

    // Ensure we return at least some suggestions
    if (validatedSuggestions.length === 0) {
      throw new Error('No valid suggestions generated');
    }

    return validatedSuggestions;

  } catch (error) {
    console.error('Gemini API error:', error);
    
    // Provide more specific error context
    if (error instanceof Error) {
      throw new Error(`Failed to generate suggestions: ${error.message}`);
    }
    
    throw new Error('Failed to generate suggestions with Gemini');
  }
}

/**
 * Generate default suggestions for users with insufficient history
 */
async function generateDefaultSuggestions(): Promise<CommentSuggestion[]> {
  // For now, return generic suggestions
  // In the future, we can analyze just the post content
  return [
    {
      type: 'trait',
      text: '글에서 느껴지는 진정성이 좋네요.',
    },
    {
      type: 'highlight',
      text: '표현이 정말 인상적이네요!',
    },
    {
      type: 'empathy',
      text: '공감이 되는 이야기네요. 저도 비슷한 경험이 있어요.',
    },
    {
      type: 'curiosity',
      text: '흥미로운 이야기네요! 그 다음엔 어떻게 되었나요?',
    },
  ];
}
