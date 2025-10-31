import Anthropic from '@anthropic-ai/sdk';
import { AIAnalysisResult, StampType } from '../types/diary';

export class ClaudeService {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
    });
  }

  async analyzeDiary(diaryContent: string, date: string): Promise<AIAnalysisResult> {
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
