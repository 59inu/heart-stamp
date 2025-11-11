import Anthropic from '@anthropic-ai/sdk';
import { AIAnalysisResult, StampType, ImportanceScore } from '../types/diary';
import { CircuitBreaker } from '../utils/circuitBreaker';
import { retryWithCondition, withTimeout, isRetryableError } from '../utils/retry';

/**
 * Claude API 에러 클래스
 */
class ClaudeAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isRetryable: boolean = false,
    public originalError?: any
  ) {
    super(message);
    this.name = 'ClaudeAPIError';
  }
}

export class ClaudeService {
  private client: Anthropic;
  private circuitBreaker: CircuitBreaker;

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
    });

    // Circuit Breaker 초기화
    // - 5번 연속 실패 시 OPEN
    // - 1분 후 HALF_OPEN으로 전환
    this.circuitBreaker = new CircuitBreaker(5, 60000, 3);

    console.log('✅ ClaudeService initialized with Circuit Breaker');
  }

  async analyzeDiary(
    diaryContent: string, 
    emotionTag: string, 
    date: string): Promise<AIAnalysisResult> {
    try {
      // Circuit Breaker로 보호
      return await this.circuitBreaker.execute(async () => {
        // 재시도 로직 적용 (최대 3번, exponential backoff)
        return await retryWithCondition(
          async () => await this.performAnalysis(diaryContent, emotionTag, date),
          (error) => {
            // Claude API 에러가 재시도 가능한지 확인
            if (error instanceof ClaudeAPIError) {
              return error.isRetryable;
            }
            return isRetryableError(error);
          },
          {
            maxRetries: 3,
            baseDelay: 1000,
            onRetry: (attempt, error) => {
              console.log(`🔄 Claude API retry attempt ${attempt}`);
            },
          }
        );
      });
    } catch (error) {
      // Circuit Breaker OPEN 상태
      if (error instanceof Error && error.message.includes('Circuit breaker is OPEN')) {
        console.error('❌ Claude API circuit breaker is OPEN - using fallback');
        return this.getFallbackResponse();
      }

      // 기타 에러 - Fallback 사용
      console.error('❌ Claude API failed after retries - using fallback:', error);
      return this.getFallbackResponse();
    }
  }

  /**
   * 실제 AI 분석 수행
   */
  private async performAnalysis(
    diaryContent: string,
    emotionTag: string,
    date: string
  ): Promise<AIAnalysisResult> {
    console.log('🤖 Claude API 호출 시작');
    console.log(`일기 날짜: ${date}`);
    console.log(`일기 내용: ${diaryContent.substring(0, 50)}...`);

    // 🔍 [1단계] Haiku로 일기 중요도 분석
    const importanceScore = await this.analyzeImportance(diaryContent);

    // 📊 중요도에 따라 모델 선택 (임계값: 20점)
    const IMPORTANCE_THRESHOLD = 20;
    const useSonnet = importanceScore.total >= IMPORTANCE_THRESHOLD;
    const selectedModel = useSonnet ? 'claude-sonnet-4-20250514' : 'claude-haiku-4-5';

    console.log(`🎯 [MODEL SELECTION] ${useSonnet ? 'Sonnet' : 'Haiku'} selected (score: ${importanceScore.total}/40)`);

    // 일기 길이에 따라 max_tokens와 응답 길이 조절
  const sentenceCount = diaryContent
    .split(/[.!?。！？\n]+/)  // 줄바꿈도 문장 구분으로
    .filter(s => s.trim().length > 5)  // 너무 짧은 건 제외
    .length;

    let maxTokens: number;

    let responseLength: string;

    if (sentenceCount <= 2) {
      // 1-2문장: 짧은 코멘트 (여유있게 설정)
      maxTokens = 500;
      responseLength = '1-2문장 (약 50-80자)';
    } else if (sentenceCount <= 5) {
      // 3-5문장: 보통 코멘트 (여유있게 설정)
      maxTokens = 1200;
      responseLength = '3-4문장 (약 150-200자)';
    } else {
      // 6문장 이상: 긴 코멘트 (여유있게 설정)
      maxTokens = 1500;
      responseLength = '4-5문장 (약 200-300자)';
    }

    console.log(`일기 문장 수: ${sentenceCount}, max_tokens: ${maxTokens}, 응답 길이: ${responseLength}`);

    try {
      // 🎨 [2단계] 선택된 모델로 코멘트 생성 (30초 타임아웃)
      const response = await withTimeout(
        this.client.messages.create({
          model: selectedModel,
          max_tokens: maxTokens,
          temperature: 0.8,
          messages: [
            {
              role: 'user',
              content: `당신은 따뜻한 초등학교 담임 선생님입니다.
학생의 일기를 읽고 ${responseLength}로 구체적이고 깊이 있게 반응해주세요.
목표는 사용자가 ‘이해받았다고 느끼는 것’입니다
학생이 선택한 감정: "${emotionTag}"

규칙:
- "그렇구나", "그러게", "응", "맞아", "그렇지" 등으로 시작해 학생의 말을 먼저 수용하되 늘 새로운 표현으로 시작하도록 노력
- 톤: 연상 느낌의 반말로 친근하게 (~겠네, ~구나, ~지, ~겠다)
- 비속어: 순화 (예: "개빡쳤다" → "짜증 났겠다")
- 일기 속 구체적 사건 2개 이상 언급하고 일기 속 단어나 표현을 인용
- 학생의 감정을 자연스럽게 표현 ("힘들었겠다", "속상했지", "짜증 났겠다")
- 자연스러운 일임을 확인 ("당연해", "다들 그래")
- 조언보다는 학생의 생각이나 행동을 긍정적으로 관찰하고 칭찬 ("멋진 생각이야", "잘했어", "대단한데?")
- 청유형은 가끔만, 주로 관찰과 지지로
- 판단하지 말고 학생이 겪은 일 존중하며 지지
- 학생의 나이를 알 수 없습니다. 성인일 수도 있으므로 연령을 전제로 한 표현을 사용하지 마세요
- 이모지는 사용하지 마세요
- **중요: 반드시 완전한 문장으로 끝내세요. 문장 중간에서 끊기지 않도록 주의하세요. 마지막 문장은 마침표(.), 물음표(?), 느낌표(!)로 끝나야 합니다.**


일기:
${diaryContent}`,
            },
          ],
        }),
        30000 // 30초 타임아웃
      );

      // 응답 파싱
      const content = response.content[0];
      if (content.type === 'text') {
        const comment = content.text.trim();
        console.log(`✅ Claude API 응답 성공 (${useSonnet ? 'Sonnet' : 'Haiku'})`);

        // 도장은 항상 'nice' 고정
        return {
          comment,
          stampType: 'nice',
          model: useSonnet ? 'sonnet' : 'haiku',
          importanceScore: importanceScore.total,
        };
      }

      throw new ClaudeAPIError('Invalid response format from Claude API');
    } catch (error: any) {
      // 에러 타입 분류
      if (error.status === 429) {
        throw new ClaudeAPIError('Rate limit exceeded', 429, true, error);
      } else if (error.status === 500 || error.status === 503) {
        throw new ClaudeAPIError('Claude API server error', error.status, true, error);
      } else if (error.name === 'TimeoutError') {
        throw new ClaudeAPIError('Request timeout', undefined, true, error);
      } else {
        throw new ClaudeAPIError(
          `Claude API error: ${error.message}`,
          error.status,
          false,
          error
        );
      }
    }
  }

  /**
   * 일기의 중요도 분석 (Haiku 사용)
   * Sonnet을 사용할지 Haiku를 사용할지 결정하기 위한 1차 필터링
   */
  private async analyzeImportance(diaryContent: string): Promise<ImportanceScore> {
    console.log('📊 [IMPORTANCE] Analyzing diary importance with Haiku...');

    try {
      const response = await withTimeout(
        this.client.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 300,
          temperature: 0.3, // 낮은 temperature로 일관성 확보
          messages: [
            {
              role: 'user',
              content: `당신은 일기 분석 전문가입니다.
아래 일기를 읽고, AI 코멘트 생성 시 더 뛰어난 모델(Sonnet)이 필요한지 판단해주세요.

다음 4가지 기준으로 각각 0-10점을 매겨주세요:

1. **감정적 강도** (0-10점)
   - 감정 변화의 폭과 깊이
   - 복잡한 감정이나 양가감정의 존재
   - 감정 표현의 생생함

2. **의미있는 사건** (0-10점)
   - 관계적 전환점이나 중요한 상호작용
   - 개인적 성취나 도전
   - 건강/치료 관련 진전

3. **성찰의 깊이** (0-10점)
   - 자기 자신에 대한 새로운 발견
   - 삶의 패턴이나 의미에 대한 통찰
   - 미래에 대한 구체적 계획이나 결심

4. **변화의 신호** (0-10점)
   - 새로운 시도나 첫 경험
   - 증상, 상태, 습관의 변화
   - 관점이나 태도의 전환

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요:
{
  "emotional_intensity": 5,
  "significant_event": 3,
  "depth_of_reflection": 2,
  "change_signal": 4,
  "total": 14,
  "reason": "일상적인 하루에 대한 담담한 기록. 특별한 감정 변화나 의미있는 사건 없음."
}

일기:
${diaryContent}`,
            },
          ],
        }),
        15000 // 15초 타임아웃
      );

      const content = response.content[0];
      if (content.type === 'text') {
        const jsonText = content.text.trim();
        const score: ImportanceScore = JSON.parse(jsonText);

        console.log(`📊 [IMPORTANCE] Score: ${score.total}/40 - ${score.reason}`);
        return score;
      }

      throw new Error('Invalid response format from Haiku');
    } catch (error: any) {
      console.error('❌ [IMPORTANCE] Analysis failed, defaulting to low score:', error.message);
      // 에러 시 낮은 점수 반환 (Haiku 사용)
      return {
        emotional_intensity: 3,
        significant_event: 3,
        depth_of_reflection: 3,
        change_signal: 3,
        total: 12,
        reason: 'Analysis failed, using conservative score',
      };
    }
  }

  /**
   * Fallback 응답 (에러 시 사용)
   */
  private getFallbackResponse(): AIAnalysisResult {
    return {
      comment: '오늘도 일기를 작성해주었네요! 매일 기록하는 습관이 참 좋아요. 조금씩이라도 자신의 감정을 표현하는 것이 중요하답니다.',
      stampType: 'nice',
    };
  }

}
