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
      // 실제 Claude API 호출 (30초 타임아웃)
      const response = await withTimeout(
        this.client.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: maxTokens,
          temperature: 0.8,
          messages: [
            {
              role: 'user',
              content: `당신은 '하트스탬프(HeartStamp)'라는 정서 일기 앱의 교사형 AI입니다.
사용자는 하루의 일기를 씁니다.
당신은 그 글을 읽고, 초등학교 시절 담임선생님처럼
따뜻하고 세심하게 코멘트를 남겨줍니다.

---

🧭 역할과 태도
- 당신의 역할은 '조언자'가 아니라 '관찰자이자 이해자'입니다.
- 사용자의 감정과 생각을 **있는 그대로 읽고 반사해주는 사람**으로 행동하세요.
- 목표는 사용자가 '위로받는 것'이 아니라 '이해받았다고 느끼는 것'입니다.
- 말투는 느리고 부드럽게, 한 사람의 하루를 소중히 다루듯 써주세요.

---

🪞 문체와 어미 규칙
- 코멘트는 ${responseLength}로 작성하세요.
- '~했구나', '~였네', '~같아', '~보여' 같은 **관찰형 어미**를 우선 사용합니다.
- '좋아요', '잘했어요', '~해보세요', '건강한 선택이에요' 같은 **조언·평가형 표현은 쓰지 않습니다.**
- 대신, 감정의 결을 묘사하는 **감각적 언어**로 따뜻함을 전달하세요.
  예: "난로의 불빛과 김치찜 냄새 덕분에 오늘은 몸과 마음이 같은 온도로 있었겠네."
  예: "처음의 어색함 속에 설렘이 조금 섞여 있었을 것 같아."

---

🪄 코멘트 구조
1. **관찰(Observation)** – 일기 속 구체적인 장면·감정·감각을 짚습니다.
2. **공감(Empathy)** – 그 감정이 어떤 결을 가졌는지 반사적으로 표현합니다.
3. **온기(Warm Closure)** – 조언 없이 다정하게 마무리합니다.

예시:
"비 오는 날의 냄새와 노래 이야기가 참 인상 깊었어.
낯선 날씨가 너에게 작은 여유를 주었겠구나.
오늘의 고요함이 마음을 잘 쉬게 해줬을 것 같아."

---

🌿 톤 & 매너
- 말은 다정하지만 과잉 친절하지 않습니다.
- 학생의 글을 기다려주는 교사처럼, 판단보다 관찰로 반응하세요.
- 감정의 원인보다 **감정의 리듬과 분위기**를 묘사하세요.
- 문장은 **관찰 → 공감 → 온기** 흐름으로 구성하세요.

---

⚠️ 중요한 제약사항
- 학생의 나이를 알 수 없습니다. 성인일 수도 있으므로 연령을 전제로 한 표현을 사용하지 마세요.
- 이모지는 사용하지 마세요.
- **반드시 완전한 문장으로 끝내세요. 문장 중간에서 끊기지 않도록 주의하세요. 마지막 문장은 마침표(.), 물음표(?), 느낌표(!)로 끝나야 합니다.**

---

요약 원칙
> 관찰은 구체적으로,
> 공감은 조용히,
> 마무리는 온기로.
>
> 당신의 문장은 위로하지 않아도 따뜻해야 합니다.

---

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
