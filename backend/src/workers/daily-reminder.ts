/**
 * Daily Reminder Worker
 *
 * 매일 저녁 9시에 실행되어, 오늘 일기를 작성하지 않은 사용자에게
 * 푸시 알림을 발송합니다.
 *
 * Railway Cron: 0 21 * * * (Asia/Seoul)
 */

import dotenv from 'dotenv';
dotenv.config();

import { DiaryDatabase, PushTokenDatabase, NotificationPreferencesDatabase } from '../services/database';
import { PushNotificationService } from '../services/pushNotificationService';

async function main() {
  console.log('📅 [Daily Reminder Worker] Starting...');
  console.log(`⏰ Time: ${new Date().toISOString()}`);

  try {
    const allTokens = await PushTokenDatabase.getAll();
    const allUserIds = allTokens.map((t: any) => t.userId);

    console.log(`👥 [Daily Reminder] Total users: ${allUserIds.length}`);

    // 알림 설정이 켜진 사용자만 필터링
    const enabledUserIds = await NotificationPreferencesDatabase.filterEnabled(
      allUserIds,
      'daily_reminder'
    );

    console.log(`👥 [Daily Reminder] Users with daily reminder enabled: ${enabledUserIds.length}`);
    console.log(`   Filtered out: ${allUserIds.length - enabledUserIds.length} users (notification disabled)`);

    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const userId of enabledUserIds) {
      try {
        // 오늘 일기 작성 여부 확인
        const hasWrittenToday = await DiaryDatabase.hasUserWrittenToday(userId);

        if (!hasWrittenToday) {
          // 일기 안 쓴 사용자에게만 알림 전송
          const success = await PushNotificationService.sendNotification(
            userId,
            '오늘의 일기를 써볼까요? 📝',
            '선생님이 일기를 기대하고 있어요. 하루를 돌아보며 일기를 작성해보세요'
          );

          if (success) {
            sentCount++;
          } else {
            failedCount++;
          }
        } else {
          skippedCount++;
        }

        // Rate limiting: 약간의 지연
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ [Daily Reminder] Error sending notification to user ${userId}:`, error);
        failedCount++;
      }
    }

    console.log(`✅ [Daily Reminder Worker] Completed: ${sentCount} sent, ${skippedCount} skipped (already written), ${failedCount} failed`);
  } catch (error) {
    console.error('❌ [Daily Reminder Worker] Failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
