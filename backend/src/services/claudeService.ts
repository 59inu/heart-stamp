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
    // ============================================================
    // TODO: 나중에 실제 Claude API를 사용할 때의 프롬프트
    // ============================================================
    // 당신은 따뜻한 초등학교 담임 선생님입니다.
    // 학생의 일기를 읽고 3-4줄로 구체적이고 깊이 있게 반응해주세요.
    //
    // 규칙:
    // - "응", "맞아", "그렇지"로 시작해 학생의 말을 먼저 수용
    // - 반말(~겠네, ~구나, ~지, ~겠다)로 연상느낌으로 친근하게
    // - 일기 속 구체적 단어나 표현을 인용하되, 비속어는 순화해서
    //   (예: "개빡쳤다" → "짜증 났겠다")
    // - 일기 속 구체적 사건 2개 이상 언급
    // - 학생의 감정을 자연스럽게 표현 ("힘들었겠다", "속상했지", "짜증 났겠다")
    // - 자연스러운 일임을 확인 ("당연해", "다들 그래")
    // - 조언보다는 학생의 생각이나 행동을 긍정적으로 관찰하고 칭찬
    //   ("멋진 생각이야", "잘했어", "대단한데?")
    // - 청유형은 가끔만, 주로 관찰과 지지로
    // - 판단하지 말고 학생이 겪은 일 존중하며 지지
    // - 이모지는 사용하지 마세요
    // - 3-4줄 분량
    //
    // 일기: {diaryContent}
    // 코멘트:
    // ============================================================

    // Mock 데이터로 테스트 (실제 Claude API 호출 없음)
    console.log('🧪 Mock AI Analysis - 테스트 모드');
    console.log(`일기 날짜: ${date}`);
    console.log(`일기 내용: ${diaryContent.substring(0, 50)}...`);

    // 일기 내용 분석해서 다양한 응답 생성
    const content = diaryContent.toLowerCase();
    const length = diaryContent.length;

    let comment: string;
    let stampType: StampType;

    // 긍정적인 키워드 체크
    const positiveWords = ['좋', '행복', '기쁨', '즐거', '성공', '완료', '해냈'];
    const hasPositive = positiveWords.some(word => content.includes(word));

    // 부정적인 키워드 체크
    const negativeWords = ['힘들', '어렵', '슬프', '피곤', '실패', '아쉽'];
    const hasNegative = negativeWords.some(word => content.includes(word));

    if (hasPositive && length > 100) {
      comment = '정말 멋진 하루를 보냈네요! 일기를 읽으니 저까지 기분이 좋아져요. 이런 좋은 순간들을 계속 기록해나가세요. 앞으로도 응원할게요!';
      stampType = 'excellent';
    } else if (hasPositive) {
      comment = '좋은 하루를 보낸 것 같네요! 긍정적인 마음가짐이 느껴집니다. 이렇게 작은 행복들을 소중히 여기는 모습이 보기 좋아요.';
      stampType = 'good';
    } else if (hasNegative) {
      comment = '힘든 하루였을 텐데 일기를 쓰며 감정을 정리하는 모습이 대단해요. 힘든 시간도 결국 지나가니까 너무 걱정하지 마세요. 항상 응원하고 있어요!';
      stampType = 'keep_going';
    } else if (length > 150) {
      comment = '오늘 하루를 이렇게 자세히 기록해주었네요! 꾸준히 일기를 쓰는 습관이 정말 멋져요. 계속해서 소중한 순간들을 기록해나가세요.';
      stampType = 'good';
    } else {
      comment = '오늘도 일기를 작성해주었네요! 매일 기록하는 습관이 참 좋아요. 조금씩이라도 자신의 감정을 표현하는 것이 중요하답니다.';
      stampType = 'nice';
    }

    // 실제 API 호출 대신 지연 시간 시뮬레이션 (선택사항)
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`✅ Mock 응답 - 도장: ${stampType}`);

    return {
      comment,
      stampType,
    };
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

  private parseResponse(response: string): AIAnalysisResult {
    const commentMatch = response.match(/COMMENT:\s*(.+?)(?=\nSTAMP:|$)/s);
    const stampMatch = response.match(/STAMP:\s*(\w+)/);

    const comment = commentMatch ? commentMatch[1].trim() : '좋은 하루를 보냈네요!';
    const stampType = this.parseStampType(stampMatch ? stampMatch[1].trim() : 'nice');

    return {
      comment,
      stampType,
    };
  }

  private parseStampType(stamp: string): StampType {
    const normalizedStamp = stamp.toLowerCase();
    if (['excellent', 'good', 'nice', 'keep_going'].includes(normalizedStamp)) {
      return normalizedStamp as StampType;
    }
    return 'nice';
  }
}
