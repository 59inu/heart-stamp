/**
 * Morning Push Worker
 *
 * 매일 아침 8시 30분에 실행되어, 어제 일기를 작성한 사용자에게
 * "선생님 코멘트 도착" 푸시 알림을 발송합니다.
 *
 * Railway Cron: 30 8 * * * (Asia/Seoul)
 */

import dotenv from 'dotenv';
dotenv.config();

import { DiaryDatabase, NotificationPreferencesDatabase } from '../services/database';
import { PushNotificationService } from '../services/pushNotificationService';

async function main() {
  console.log('\n' + '📱'.repeat(40));
  console.log('📬 [Morning Push Worker] STARTED');
  console.log('📱'.repeat(40));
  console.log(`⏰ Time: ${new Date().toISOString()}`);

  try {
    // 어제 날짜 일기 중 AI 코멘트를 받은 사용자별 일기 ID 조회
    const userDiaryMap = await DiaryDatabase.getUserDiaryMapYesterday();
    const eligibleUserIds = Array.from(userDiaryMap.keys());

    console.log(`📊 Eligible users (wrote diary yesterday): ${eligibleUserIds.length}`);

    if (eligibleUserIds.length === 0) {
      console.log('ℹ️  [Morning Push Worker] No users wrote diary yesterday');
      console.log('📱'.repeat(40) + '\n');
      process.exit(0);
    }

    // 알림 설정이 켜진 사용자만 필터링
    const targetUserIds = await NotificationPreferencesDatabase.filterEnabled(
      eligibleUserIds,
      'teacher_comment'
    );

    console.log(`📊 Target users (with notification enabled): ${targetUserIds.length}`);
    console.log(`   Filtered out: ${eligibleUserIds.length - targetUserIds.length} users (notification disabled)`);

    if (targetUserIds.length === 0) {
      console.log('ℹ️  [Morning Push Worker] No users with notification enabled');
      console.log('📱'.repeat(40) + '\n');
      process.exit(0);
    }

    // 필터링된 사용자에게 개별적으로 diaryId 포함하여 알림 전송
    let successCount = 0;
    let failCount = 0;

    for (const userId of targetUserIds) {
      const diaryId = userDiaryMap.get(userId);
      const success = await PushNotificationService.sendNotification(
        userId,
        '선생님 코멘트 도착 ✨',
        '밤 사이 선생님이 일기를 읽고 코멘트를 남겼어요',
        { type: 'ai_comment_complete', diaryId }
      );

      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('📱'.repeat(40));
    console.log(`✅ [Morning Push Worker] NOTIFICATION SENT: ${successCount} succeeded, ${failCount} failed`);
    console.log('📱'.repeat(40) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ [Morning Push Worker] Failed:', error);
    process.exit(1);
  }
}

main();
