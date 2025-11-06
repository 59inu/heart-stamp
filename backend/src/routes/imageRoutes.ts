import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { S3Service } from '../services/s3Service';

const router = Router();

// S3 사용 여부 확인
const USE_S3 = S3Service.isConfigured();

if (USE_S3) {
  console.log('✅ S3 configured - Images will be uploaded to S3');
} else {
  console.log('⚠️  S3 not configured - Images will be stored locally');
}

// Multer 설정: 로컬 저장 또는 메모리 저장
const storage = USE_S3
  ? multer.memoryStorage() // S3 사용 시 메모리에 임시 저장
  : multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, 'uploads/'); // uploads 폴더에 저장
      },
      filename: (req, file, cb) => {
        // 고유한 파일명 생성: uuid + 원본 확장자
        const ext = path.extname(file.originalname);
        const filename = `${uuidv4()}${ext}`;
        cb(null, filename);
      },
    });

// 파일 필터: 이미지만 허용
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

// Multer 인스턴스
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한 (S3는 더 큰 파일 가능)
  },
});

// 이미지 업로드 API
router.post('/upload/image', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
      });
    }

    let imageUrl: string;

    if (USE_S3) {
      // S3에 업로드
      imageUrl = await S3Service.uploadImage(req.file.buffer, req.file.originalname);
      console.log(`📤 Image uploaded to S3: ${imageUrl}`);
    } else {
      // 로컬 저장 (기존 방식)
      imageUrl = `/uploads/${req.file.filename}`;
      console.log(`📤 Image saved locally: ${imageUrl}`);
    }

    res.json({
      success: true,
      imageUrl,
      storage: USE_S3 ? 's3' : 'local',
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
