import Anthropic from '@anthropic-ai/sdk';
import { AIAnalysisResult, StampType } from '../types/diary';
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

  async analyzeDiary(diaryContent: string, date: string): Promise<AIAnalysisResult> {
    try {
      // Circuit Breaker로 보호
      return await this.circuitBreaker.execute(async () => {
        // 재시도 로직 적용 (최대 3번, exponential backoff)
        return await retryWithCondition(
          async () => await this.performAnalysis(diaryContent, date),
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
    date: string
  ): Promise<AIAnalysisResult> {
    console.log('🤖 Claude API 호출 시작');
    console.log(`일기 날짜: ${date}`);
    console.log(`일기 내용: ${diaryContent.substring(0, 50)}...`);

    try {
      // 실제 Claude API 호출 (30초 타임아웃)
      const response = await withTimeout(
        this.client.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 500,
          temperature: 0.7,
          messages: [
            {
              role: 'user',
              content: `당신은 따뜻한 초등학교 담임 선생님입니다.
학생의 일기를 읽고 3-4줄로 구체적이고 깊이 있게 반응해주세요.

규칙:
- "그렇구나", "그러게", "응", "맞아", "그렇지" 등으로 시작해 학생의 말을 먼저 수용하되 늘 새로운 표현으로 시작하도록 노력
- 반말(~겠네, ~구나, ~지, ~겠다)로 연상느낌으로 친근하게
- 일기 속 구체적 단어나 표현을 인용하되, 비속어는 순화해서 (예: "개빡쳤다" → "짜증 났겠다")
- 일기 속 구체적 사건 2개 이상 언급
- 학생의 감정을 자연스럽게 표현 ("힘들었겠다", "속상했지", "짜증 났겠다")
- 자연스러운 일임을 확인 ("당연해", "다들 그래")
- 조언보다는 학생의 생각이나 행동을 긍정적으로 관찰하고 칭찬 ("멋진 생각이야", "잘했어", "대단한데?")
- 청유형은 가끔만, 주로 관찰과 지지로
- 판단하지 말고 학생이 겪은 일 존중하며 지지
- 이모지는 사용하지 마세요
- 3-4줄 분량

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
        console.log(`✅ Claude API 응답 성공`);

        // 도장은 항상 'nice' 고정
        return {
          comment,
          stampType: 'nice',
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
   * Fallback 응답 (에러 시 사용)
   */
  private getFallbackResponse(): AIAnalysisResult {
    return {
      comment: '오늘도 일기를 작성해주었네요! 매일 기록하는 습관이 참 좋아요. 조금씩이라도 자신의 감정을 표현하는 것이 중요하답니다.',
      stampType: 'nice',
    };
  }

}
