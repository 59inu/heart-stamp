import Anthropic from '@anthropic-ai/sdk';
import { AIAnalysisResult, StampType, ImportanceScore } from '../types/diary';
import { CircuitBreaker } from '../utils/circuitBreaker';
import { retryWithCondition, withTimeout, isRetryableError } from '../utils/retry';
import { PromptDatabase } from './database';

/**
 * 프롬프트 템플릿의 {{변수}} 플레이스홀더를 실제 값으로 치환
 */
function substituteVariables(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variables[varName] !== undefined ? variables[varName] : match;
  });
}

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

  async generateComment(
    diaryContent: string,
    emotionTag: string,
    date: string,
    options?: { forceModel?: 'sonnet' | 'haiku' }
  ): Promise<AIAnalysisResult> {
    try {
      // Circuit Breaker로 보호
      return await this.circuitBreaker.execute(async () => {
        // 재시도 로직 적용 (최대 3번, exponential backoff)
        return await retryWithCondition(
          async () => await this.performAnalysis(diaryContent, emotionTag, date, options?.forceModel),
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
    date: string,
    forceModel?: 'sonnet' | 'haiku'
  ): Promise<AIAnalysisResult> {
    console.log('🤖 Claude API 호출 시작');
    console.log(`일기 날짜: ${date}`);
    console.log(`일기 내용: ${diaryContent.substring(0, 50)}...`);

    let importanceScore: any;
    let useSonnet: boolean;
    let selectedModel: string;

    if (forceModel) {
      // 강제 모델 지정 (Admin API용)
      useSonnet = forceModel === 'sonnet';
      selectedModel = useSonnet ? 'claude-sonnet-4-20250514' : 'claude-haiku-4-5';
      importanceScore = { total: useSonnet ? 40 : 0 }; // 더미 점수
      console.log(`🎯 [MODEL SELECTION] ${forceModel.toUpperCase()} forced (Admin mode)`);
    } else {
      // 🔍 [1단계] Haiku로 일기 중요도 분석
      importanceScore = await this.analyzeImportance(diaryContent);

      // 📊 중요도에 따라 모델 선택
      const IMPORTANCE_THRESHOLD = 25;
      useSonnet = importanceScore.total >= IMPORTANCE_THRESHOLD;
      selectedModel = useSonnet ? 'claude-sonnet-4-20250514' : 'claude-haiku-4-5';

      console.log(`🎯 [MODEL SELECTION] ${useSonnet ? 'Sonnet' : 'Haiku'} selected (score: ${importanceScore.total}/40)`);
    }

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
      // DB에서 프롬프트 로드 (없으면 기본값 사용)
      let promptTemplate = await PromptDatabase.getContent('comment');
      if (!promptTemplate) {
        console.log('⚠️ [Claude] Comment prompt not found in DB, using default');
        promptTemplate = `당신은 따뜻한 초등학교 담임 선생님입니다.
학생의 일기를 읽고 {{responseLength}}로 구체적이고 깊이 있게 반응해주세요.
학생이 선택한 감정: "{{emotionTag}}"

규칙:
- "그렇구나", "그러게", "응", "맞아", "그렇지" 등으로 시작해 학생의 말을 먼저 수용하되 늘 새로운 표현으로 시작하도록 노력
- 톤: 연상 느낌의 반말로 친근하게 (~겠네, ~구나, ~지, ~겠다)
- 비속어: 순화 (예: "개빡쳤다" → "짜증 났겠다")
- 일기 속 구체적 사건 2개 이상 언급하되, ""로 직접 인용하지 말고 자연스럽게 언급
- 학생의 감정을 자연스럽게 표현 ("힘들었겠다", "속상했지", "짜증 났겠다")
- 자연스러운 일임을 확인 ("당연해", "다들 그래")
- 조언보다는 학생의 생각이나 행동을 긍정적으로 관찰하고 칭찬 ("멋진 생각이야", "잘했어", "대단한데?")
- 청유형은 가끔만, 주로 관찰과 지지로
- 판단하지 말고 학생이 겪은 일 존중하며 지지
- 학생의 나이를 알 수 없습니다. 성인일 수도 있으므로 연령을 전제로 한 표현을 사용하지 마세요
- 이모지는 사용하지 마세요
- **중요: 반드시 완전한 문장으로 끝내세요. 문장 중간에서 끊기지 않도록 주의하세요. 마지막 문장은 마침표(.), 물음표(?), 느낌표(!)로 끝나야 합니다.**


일기:
{{diaryContent}}`;
      }

      // 변수 치환
      const prompt = substituteVariables(promptTemplate, {
        responseLength,
        emotionTag,
        diaryContent,
      });

      const response = await withTimeout(
        this.client.messages.create({
          model: selectedModel,
          max_tokens: maxTokens,
          temperature: 0.8,
          messages: [
            {
              role: 'user',
              content: prompt,
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
      } else if (error.status >= 500 && error.status < 600) {
        // 모든 5xx 서버 에러는 재시도 가능 (500, 502, 503, 529 등)
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
    console.log('\n🔊🔊🔊 [IMPORTANCE] 중요도 분석 시작! 🔊🔊🔊');
    console.log('📊 [IMPORTANCE] Analyzing diary importance with Haiku...');

    try {
      // DB에서 프롬프트 로드 (없으면 기본값 사용)
      let promptTemplate = await PromptDatabase.getContent('importance');
      if (!promptTemplate) {
        console.log('⚠️ [Claude] Importance prompt not found in DB, using default');
        promptTemplate = `당신은 일기 분석 전문가입니다.
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
{{diaryContent}}`;
      }

      // 변수 치환
      const prompt = substituteVariables(promptTemplate, { diaryContent });

      const response = await withTimeout(
        this.client.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 300,
          temperature: 0.3, // 낮은 temperature로 일관성 확보
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
        15000 // 15초 타임아웃
      );

      const content = response.content[0];
      if (content.type === 'text') {
        let jsonText = content.text.trim();

        // Markdown 코드 블록 제거 (```json ... ``` 또는 ``` ... ```)
        jsonText = jsonText.replace(/^```json?\s*/i, '').replace(/\s*```$/, '');

        const score: ImportanceScore = JSON.parse(jsonText);

        console.log(`📊 [IMPORTANCE] Score: ${score.total}/40 - ${score.reason}`);
        return score;
      }

      throw new Error('Invalid response format from Haiku');
    } catch (error: any) {
      console.error('\n🔥🔥🔥 [IMPORTANCE] 에러 발생! 🔥🔥🔥');
      console.error('❌ [IMPORTANCE] Analysis failed:', error);
      console.error('❌ [IMPORTANCE] Error message:', error.message);
      console.error('❌ [IMPORTANCE] Error stack:', error.stack);
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

  /**
   * 일기 내용에서 그림으로 표현할 핵심 장면 추출
   * @param diaryContent 일기 내용
   * @returns 단순화된 장면 설명
   */
  async extractKeyScene(diaryContent: string): Promise<string> {
    console.log('🎨 [Scene Extraction] Extracting key scene from diary...');

    try {
      // DB에서 프롬프트 로드 (없으면 기본값 사용)
      let promptTemplate = await PromptDatabase.getContent('scene');
      if (!promptTemplate) {
        console.log('⚠️ [Claude] Scene prompt not found in DB, using default');
        promptTemplate = `당신은 일기를 읽고 그림일기로 표현할 핵심 장면을 추출하는 전문가입니다.

아래 일기를 읽고, 가장 중요하고 그림으로 표현하기 좋은 한 장면을 선택해 단순하게 설명해주세요.

규칙:
- 구체적인 장면 하나만 선택 (예: "친구와 카페에서 이야기하는 모습", "공원에서 산책하는 모습")
- 어린이 그림일기 스타일로 표현 가능하도록 단순화
- 불필요한 세부사항 제거
- 1-2문장으로 간결하게
- 표현해야하는 감정이나 분위기 형용
- **사람 이름을 절대 표기하지 마세요** (예: "지연이" → "friend", "엄마" → "family member")
- **성별을 모호하게 표현하세요** (예: "a person", "someone", "a friend" 등 성별 중립적 표현 사용)
- 영어로 응답하세요 (이미지 생성 API용)

일기:
{{diaryContent}}`;
      }

      // 변수 치환
      const prompt = substituteVariables(promptTemplate, { diaryContent });

      const response = await withTimeout(
        this.client.messages.create({
          model: 'claude-haiku-4-5', // Haiku 사용 (빠르고 저렴)
          max_tokens: 200,
          temperature: 0.5,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
        15000 // 15초 타임아웃
      );

      const content = response.content[0];
      if (content.type === 'text') {
        const scene = content.text.trim();
        console.log(`✅ [Scene Extraction] Extracted scene: ${scene}`);
        return scene;
      }

      throw new Error('Invalid response format from Claude API');
    } catch (error: any) {
      console.error('❌ [Scene Extraction] Failed:', error);
      // Fallback: 일기의 첫 문장 사용
      const firstSentence = diaryContent.split(/[.!?。！？\n]+/)[0].substring(0, 100);
      return `A simple illustration of: ${firstSentence}`;
    }
  }

  /**
   * 범용 텍스트 생성 (편지 생성 등에 사용)
   * @param prompt 생성할 텍스트에 대한 프롬프트
   * @param model 사용할 모델 ('sonnet' 또는 'haiku')
   * @returns 생성된 텍스트
   */
  async generateText(prompt: string, model: 'sonnet' | 'haiku' = 'haiku'): Promise<string> {
    try {
      const modelName = model === 'sonnet' ? 'claude-sonnet-4-20250514' : 'claude-haiku-4-5';

      const response = await withTimeout(
        this.client.messages.create({
          model: modelName,
          max_tokens: 1500,
          temperature: 1.0,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
        30000 // 30초 타임아웃
      );

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text.trim();
      }

      throw new Error('Invalid response format from Claude API');
    } catch (error: any) {
      console.error('❌ [GenerateText] Failed:', error);
      throw error;
    }
  }

}
