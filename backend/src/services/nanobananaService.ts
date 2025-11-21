import axios from 'axios';

export class NanobananaService {
  private apiKey: string;
  private baseURL: string = 'https://api.nanobananaapi.ai/api/v1/nanobanana';
  private referenceImageUrls: string[];
  private callbackUrl: string;

  constructor(apiKey: string, referenceImageUrls?: string[], callbackUrl?: string) {
    this.apiKey = apiKey;

    if (referenceImageUrls) {
      this.referenceImageUrls = referenceImageUrls;
    } else {
      const urlsFromEnv = process.env.NANOBANANA_REFERENCE_IMAGE_URLS;
      this.referenceImageUrls = urlsFromEnv
        ? urlsFromEnv.split(',').map(url => url.trim()).filter(url => url)
        : [];
    }

    this.callbackUrl = callbackUrl || '';
  }

  /**
   * Nanobanana API를 사용하여 이미지 생성 (비동기 - 콜백 방식)
   * @param prompt 이미지 생성 프롬프트
   * @returns taskId (콜백으로 완료 통지 받음)
   */
  async generateImage(prompt: string): Promise<string> {
    try {
      console.log('🎨 [Nanobanana] Generating image with prompt:', prompt);
      console.log('🖼️  [Nanobanana] Using reference images:', this.referenceImageUrls);
      console.log('🔔 [Nanobanana] Callback URL:', this.callbackUrl);

      // JSON 형식으로 요청 (API 스펙에 맞게)
      const requestBody = {
        prompt: prompt,
        numImages: 1,
        type: 'IMAGETOIAMGE', // 레퍼런스 이미지 사용
        image_size: '3:2',
        imageUrls: this.referenceImageUrls.length > 0 ? this.referenceImageUrls : [null],
        watermark: 'HeartStamp',
        callBackUrl: this.callbackUrl, // 콜백 URL 추가
      };

      console.log('📋 [Nanobanana] Request body:', JSON.stringify(requestBody, null, 2));

      // 이미지 생성 요청 - taskId 받기
      const response = await axios.post(
        `${this.baseURL}/generate`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      console.log('📦 [Nanobanana] API Response:', JSON.stringify(response.data, null, 2));
      const { data } = response.data;
      const taskId = data.taskId;

      if (!taskId) {
        throw new Error('No taskId received from API');
      }

      console.log('✅ [Nanobanana] Task created:', taskId);
      console.log('⏳ [Nanobanana] Waiting for callback...');

      return taskId;
    } catch (error: any) {
      console.error('❌ [Nanobanana] Error generating image:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error(`Failed to generate image: ${error.message}`);
    }
  }

  /**
   * 일기 내용을 바탕으로 이미지 생성 프롬프트 구성
   * @param sceneDescription Claude가 추출한 핵심 장면
   * @returns Nanobanana용 프롬프트
   */
  buildPrompt(sceneDescription: string): string {
    // 어린이 크레용 그림 스타일로 프롬프트 구성
    const styleGuide = `
style: Create a cute children's crayon drawing style illustration.
Match the look of a kid's hand-drawn doodle:
- thick crayon texture with rough strokes
- bright primary colors (red, blue, yellow, green, orange, purple)
- simple stick figures with smiling faces
- white background with lots of space
Make it feel easy and innocent like a child's drawing.
Use the attached image as reference for style only.
Do NOT copy the exact characters or composition.
IGNORE any watermarks or text in the reference image.

IMPORTANT - Gender and Identity:
- Draw all people with gender-neutral features (simple round heads, no distinct gender characteristics)
- Use ambiguous hairstyles and clothing (avoid stereotypically masculine or feminine styles)
- Make figures simple enough that gender cannot be determined
- Focus on the scene and emotion rather than physical details of people

IMPORTANT - No Text or Labels:
- Do NOT add any text, names, or labels to the drawing
- Do NOT write people's names in the image
- Do NOT add speech bubbles, captions, or any written words
- Keep the illustration purely visual without any text elements

Scene: ${sceneDescription}`;

    return styleGuide.trim();
  }
}
