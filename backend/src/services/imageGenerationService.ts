import { ClaudeService } from './claudeService';
import { NanobananaService } from './nanobananaService';
import { S3Service } from './s3Service';
import { DiaryDatabase } from './database';
import { pendingTasks } from '../routes/nanobananaRoutes';

export class ImageGenerationService {
  private claudeService: ClaudeService;
  private nanobananaService: NanobananaService;

  constructor(
    claudeApiKey: string,
    nanobananaApiKey: string,
    referenceImageUrl?: string,
    callbackUrl?: string
  ) {
    this.claudeService = new ClaudeService(claudeApiKey);
    this.nanobananaService = new NanobananaService(nanobananaApiKey, referenceImageUrl, callbackUrl);
  }

  /**
   * 일기에 대한 그림일기 이미지 생성 (전체 프로세스)
   * @param diaryId 일기 ID
   * @param diaryContent 일기 내용
   */
  async generateImageForDiary(
    diaryId: string,
    diaryContent: string
  ): Promise<void> {
    console.log(`\n🎨 [Image Generation] Starting for diary ${diaryId}...`);

    try {
      // 상태: generating으로 설정
      await DiaryDatabase.update(diaryId, {
        imageGenerationStatus: 'generating',
      });
      console.log(`✅ Status updated: generating`);

      // 1단계: Claude로 핵심 장면 추출
      console.log('📝 [Step 1/4] Extracting key scene with Claude...');
      const sceneDescription = await this.claudeService.extractKeyScene(diaryContent);
      console.log(`✅ Scene: ${sceneDescription}`);

      // 2단계: Nanobanana로 이미지 생성 요청 (비동기)
      console.log('🎨 [Step 2/2] Requesting image generation from Nanobanana...');
      const prompt = this.nanobananaService.buildPrompt(sceneDescription);
      console.log(`📋 Prompt: ${prompt}`);

      const taskId = await this.nanobananaService.generateImage(prompt);
      console.log(`✅ Task created: ${taskId}`);

      // taskId -> diaryId 매핑 저장 (콜백에서 사용)
      pendingTasks.set(taskId, diaryId);
      console.log(`📌 Stored mapping: ${taskId} -> ${diaryId}`);

      console.log(`\n⏳ [Image Generation] Waiting for callback for diary ${diaryId}...\n`);
    } catch (error: any) {
      console.error(`\n❌ [Image Generation] Failed for diary ${diaryId}:`, error.message);
      console.error('Stack:', error.stack);

      // 실패 상태로 업데이트
      try {
        await DiaryDatabase.update(diaryId, {
          imageGenerationStatus: 'failed',
        });
        console.log(`✅ Status updated: failed`);
      } catch (dbError) {
        console.error(`❌ Failed to update status:`, dbError);
      }

      // 실패해도 일기 저장은 유지 (이미지는 optional)
      // 에러를 던지지 않음
    }
  }
}
