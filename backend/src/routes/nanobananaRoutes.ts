import express, { Request, Response } from 'express';
import { DiaryDatabase } from '../services/database';
import { S3Service } from '../services/s3Service';
import { PushNotificationService } from '../services/pushNotificationService';
import axios from 'axios';

const router = express.Router();

/**
 * Nanobanana 콜백 엔드포인트
 * Nanobanana API가 이미지 생성 완료 시 호출
 */
router.post('/nanobanana/callback', async (req: Request, res: Response) => {
  try {
    console.log('🔔 [Nanobanana Callback] Received callback:', JSON.stringify(req.body, null, 2));

    const { code, data } = req.body;
    const taskId = data?.taskId;
    const imageUrl = data?.info?.resultImageUrl;
    const status = code === 200 ? 'completed' : 'failed';
    const error = data?.error || req.body.msg;

    if (!taskId) {
      console.error('❌ [Nanobanana Callback] No taskId in callback');
      return res.status(400).json({ error: 'Missing taskId' });
    }

    // taskId에서 diaryId 추출 (저장할 때 diaryId를 taskId에 매핑해야 함)
    // 임시로 메모리에 저장된 매핑 사용
    const diaryId = pendingTasks.get(taskId);

    if (!diaryId) {
      console.error(`❌ [Nanobanana Callback] No diary found for taskId: ${taskId}`);
      return res.status(404).json({ error: 'Diary not found for taskId' });
    }

    if (status === 'completed' && imageUrl) {
      console.log(`✅ [Nanobanana Callback] Image ready for diary ${diaryId}`);
      console.log(`📥 Downloading image from: ${imageUrl}`);

      // 이미지 다운로드
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      const imageBuffer = Buffer.from(imageResponse.data);
      console.log(`✅ Image downloaded (${imageBuffer.length} bytes)`);

      // S3에 업로드
      const fileName = `${diaryId}-${Date.now()}.jpg`;
      const s3Url = await S3Service.uploadImage(imageBuffer, fileName);
      console.log(`✅ Image uploaded to S3: ${s3Url}`);

      // DB 업데이트
      await DiaryDatabase.update(diaryId, {
        imageUri: s3Url,
        imageGenerationStatus: 'completed',
      });
      console.log(`✅ Database updated for diary ${diaryId}`);

      // 푸시 알림 전송
      try {
        const diary = await DiaryDatabase.getById(diaryId);
        if (diary && diary.userId) {
          await PushNotificationService.sendNotificationToUsers(
            [diary.userId],
            '주문하신 그림이 도착했습니다 📦✨',
            '당신의 이야기가 그림으로 그려졌어요. 지금 확인해보세요!',
            {
              type: 'image_generated',
              diaryId: diaryId,
            }
          );
          console.log(`📲 Push notification sent to user ${diary.userId}`);
        }
      } catch (pushError: any) {
        console.error(`⚠️  Failed to send push notification:`, pushError.message);
        // 푸시 실패해도 전체 프로세스는 성공으로 처리
      }

      // 매핑 삭제
      pendingTasks.delete(taskId);

      res.json({ success: true, diaryId, imageUrl: s3Url });
    } else if (status === 'failed') {
      console.error(`❌ [Nanobanana Callback] Generation failed for diary ${diaryId}:`, error);

      // 실패 상태로 업데이트
      await DiaryDatabase.update(diaryId, {
        imageGenerationStatus: 'failed',
      });

      // 매핑 삭제
      pendingTasks.delete(taskId);

      res.json({ success: false, diaryId, error });
    } else {
      console.log(`⏳ [Nanobanana Callback] Status: ${status} for taskId ${taskId}`);
      res.json({ success: true, status });
    }
  } catch (error: any) {
    console.error('❌ [Nanobanana Callback] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// taskId -> diaryId 매핑 (메모리 저장)
// TODO: 프로덕션에서는 Redis나 DB에 저장 필요
export const pendingTasks = new Map<string, string>();

export default router;
