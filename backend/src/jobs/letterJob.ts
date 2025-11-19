import cron from 'node-cron';
import { LetterService } from '../services/letterService';
import { PushNotificationService } from '../services/pushNotificationService';
import { ClaudeService } from '../services/claudeService';

/**
 * Letter Job
 *
 * 매월 1일 새벽 4시에 실행되어,
 * 월 5회 이상 일기를 작성한 사용자에게 AI로 개인화된 편지를 생성합니다.
 * 푸시 알림은 다음날 아침 9시에 별도로 발송됩니다.
 */
export class LetterJob {
  private static claudeService: ClaudeService;

  static initialize(claudeService: ClaudeService) {
    this.claudeService = claudeService;
  }

  /**
   * AI로 개인화된 편지 내용 생성
   */
  private static async generatePersonalizedLetter(
    diaries: Array<{ date: string; content: string; mood: string }>,
    month: number
  ): Promise<string> {
    if (!this.claudeService) {
      throw new Error('ClaudeService is not initialized');
    }

    // 일기 전체 내용 전달 (Claude가 전체 맥락을 이해하도록)
    const diariesSummary = diaries.map(d => {
      const dateObj = new Date(d.date);
      const day = dateObj.getDate();
      return `${day}일 (${d.mood}): ${d.content}`;
    }).join('\n\n');

    const prompt = `당신은 매일 일기에 코멘트를 달아준 따뜻한 초등학교 담임 선생님입니다.
학생의 ${month}월 한 달 동안의 일기들을 떠올리며 다정한 안부 편지를 써주세요.
구체적인 일들을 언급하기 보다는 인상적인 사건 한 두개를 언급하고
전반적인 감정을 보듬어주고 앞으로를 지지하는 응원의 편지를 작성하세요.


${diariesSummary}

# 지금까지 당신이 일기에 코멘트를 달 때 준수해온 규칙
- 톤: 연상 느낌의 반말로 친근하게 (~겠네, ~구나, ~지, ~겠다)
- 성적 표현이나 비속어: 순화 (예: "개빡쳤다" → "짜증 났겠다")
- 학생의 감정을 자연스럽게 표현 ("힘들었겠다", "속상했지", "짜증 났겠다")
- 자연스러운 일임을 확인 ("당연해", "다들 그래")
- 조언보다는 학생의 생각이나 행동을 긍정적으로 관찰하고 칭찬 ("멋진 생각이야", "잘했어", "대단한데?")
- 청유형은 가끔만, 주로 관찰과 지지로
- 판단하지 말고 학생이 겪은 일 존중하며 지지
- 학생의 나이를 알 수 없습니다. 성인일 수도 있으므로 연령을 전제로 한 표현을 사용하지 마세요
- 이모지는 사용하지 마세요
- **중요: 반드시 완전한 문장으로 끝내세요. 문장 중간에서 끊기지 않도록 주의하세요. 마지막 문장은 마침표(.), 물음표(?), 느낌표(!)로 끝나야 합니다.**

- 편지는 600자 내외로 작성해주세요
- 편지 마지막에 "- 하트스탬프 선생님" 형식으로 마무리해주세요`;

    try {
      const content = await this.claudeService.generateText(prompt, 'sonnet');
      return content.trim();
    } catch (error) {
      console.error('❌ [LetterJob] Failed to generate AI letter:', error);
      // Fallback: 간단한 템플릿 사용
      return `${month}월 한 달 동안 ${diaries.length}개의 일기를 함께 했어요.\n\n매일매일 자신의 마음을 기록하는 것은 쉽지 않은 일인데, 정말 잘 해내고 있어요. 당신의 일기를 보면서 저도 많이 배우고 있답니다.\n\n다음 달에도 함께해요. 당신의 이야기가 기다려져요!\n\n- 하트스탬프 선생님 올림`;
    }
  }

  /**
   * 월말 AI 편지 생성 (푸시 발송 없음)
   * @param targetYear 대상 연도 (옵션, 미지정시 이전 달)
   * @param targetMonth 대상 월 (옵션, 미지정시 이전 달)
   */
  static async generateMonthlyLetters(targetYear?: number, targetMonth?: number) {
    try {
      let year: number;
      let month: number;

      if (targetYear && targetMonth) {
        // 수동으로 지정된 연월 사용
        year = targetYear;
        month = targetMonth;
      } else {
        // 자동: 이전 달 계산
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 현재 월 (1-12)
        month = currentMonth === 1 ? 12 : currentMonth - 1;
        year = currentMonth === 1 ? currentYear - 1 : currentYear;
      }

      console.log(`📬 [LetterJob] Starting monthly letter generation for ${year}-${month.toString().padStart(2, '0')}`);

      // 월 5회 이상 일기를 작성한 사용자 조회
      const eligibleUsers = await LetterService.getUsersWithDiaryCount(year, month, 5);

      console.log(`📊 [LetterJob] Found ${eligibleUsers.length} eligible users`);

      let successCount = 0;
      let failCount = 0;

      for (const user of eligibleUsers) {
        try {
          // 사용자의 한 달치 일기 조회
          const diaries = await LetterService.getUserDiariesByMonth(user.userId, year, month);

          if (diaries.length === 0) {
            console.log(`⏭️ [LetterJob] No diaries found for user ${user.userId}, skipping...`);
            continue;
          }

          console.log(`📖 [LetterJob] Generating personalized letter for user ${user.userId} (${diaries.length} diaries)...`);

          // AI로 개인화된 편지 생성
          const content = await this.generatePersonalizedLetter(diaries, month);

          // 편지 저장 (푸시는 보내지 않음)
          const letter = await LetterService.createLetter(
            user.userId,
            content,
            year,
            month
          );

          console.log(`✅ [LetterJob] AI letter created for user ${user.userId} (ID: ${letter.id})`);
          successCount++;

          // Rate limiting: API 호출 간 지연 (1초)
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ [LetterJob] Failed to generate letter for user ${user.userId}:`, error);
          failCount++;
        }
      }

      console.log(`✅ [LetterJob] Monthly letter generation completed`);
      console.log(`   Success: ${successCount}, Failed: ${failCount}`);
    } catch (error) {
      console.error('❌ [LetterJob] Error in generateMonthlyLetters:', error);
    }
  }

  /**
   * 오늘 새벽에 생성된 편지에 대한 푸시 알림 발송
   */
  static async sendLetterNotifications() {
    try {
      console.log(`📨 [LetterJob] Starting letter push notification job...`);

      // 오늘 생성된 읽지 않은 편지 조회
      const letters = await LetterService.getTodaysUnreadLetters();

      console.log(`📊 [LetterJob] Found ${letters.length} unread letters from today`);

      let successCount = 0;
      let failCount = 0;

      for (const letter of letters) {
        try {
          await PushNotificationService.sendNotification(
            letter.userId,
            '선생님의 편지가 도착했어요 💌',
            `${letter.month}월 한 달 동안 수고하셨어요!`,
            { type: 'letter_received', letterId: letter.id }
          );

          console.log(`📨 [LetterJob] Push sent to user ${letter.userId} for letter ${letter.id}`);
          successCount++;

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`❌ [LetterJob] Failed to send push for letter ${letter.id}:`, error);
          failCount++;
        }
      }

      console.log(`✅ [LetterJob] Letter notification job completed`);
      console.log(`   Success: ${successCount}, Failed: ${failCount}`);
    } catch (error) {
      console.error('❌ [LetterJob] Error in sendLetterNotifications:', error);
    }
  }

  /**
   * Cron job 시작
   * 1. 매월 1일 새벽 4시: AI 편지 생성
   * 2. 매월 1일 아침 9시: 푸시 알림 발송
   */
  static start() {
    // 매월 1일 04:00에 AI 편지 생성
    cron.schedule('0 4 1 * *', async () => {
      console.log('🔔 [LetterJob] Monthly letter generation cron triggered');
      await this.generateMonthlyLetters();
    }, {
      timezone: 'Asia/Seoul'
    });

    // 매월 1일 09:00에 푸시 알림 발송 (새벽 4시에 생성한 편지)
    cron.schedule('0 9 1 * *', async () => {
      console.log('🔔 [LetterJob] Letter notification cron triggered');
      await this.sendLetterNotifications();
    }, {
      timezone: 'Asia/Seoul'
    });

    console.log('✅ [LetterJob] Letter jobs started:');
    console.log('   - Letter generation: 04:00 AM on 1st of every month (KST)');
    console.log('   - Push notifications: 09:00 AM on 1st of every month (KST)');
  }
}
