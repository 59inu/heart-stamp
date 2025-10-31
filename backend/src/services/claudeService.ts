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
    const prompt = `당신은 친절하고 격려를 아끼지 않는 일기 선생님입니다. 학생이 작성한 일기를 읽고 따뜻한 코멘트와 적절한 도장을 주세요.

일기 날짜: ${date}
일기 내용:
${diaryContent}

다음 형식으로 응답해주세요:
1. 코멘트: 2-3문장의 따뜻하고 격려하는 코멘트 (일기 내용에 대한 공감, 칭찬, 격려 등)
2. 도장: excellent(아주 잘했어요), good(잘했어요), nice(좋아요), keep_going(계속 노력해요) 중 하나

응답 형식:
COMMENT: [코멘트 내용]
STAMP: [도장 종류]`;

    try {
      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const responseText = message.content[0].type === 'text'
        ? message.content[0].text
        : '';

      return this.parseResponse(responseText);
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error('Failed to analyze diary with Claude API');
    }
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
