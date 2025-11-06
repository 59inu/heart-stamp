#!/bin/bash
# 백엔드 데이터 초기화 스크립트

echo "🗑️  백엔드 데이터 초기화를 시작합니다..."
echo ""

# 현재 디렉토리 확인
if [ ! -f "package.json" ]; then
  echo "❌ backend 디렉토리에서 실행해주세요"
  exit 1
fi

# 확인 메시지
echo "⚠️  다음 데이터가 삭제됩니다:"
echo "   - diary.db (모든 일기 데이터)"
echo "   - diary.db-shm, diary.db-wal (WAL 파일)"
echo "   - backups/ (모든 백업 파일)"
echo "   - uploads/ (업로드된 이미지)"
echo ""
read -p "정말 삭제하시겠습니까? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "❌ 취소되었습니다"
  exit 0
fi

echo ""
echo "🗑️  데이터 삭제 중..."

# 1. 데이터베이스 파일 삭제
if [ -f "diary.db" ]; then
  rm -f diary.db diary.db-shm diary.db-wal
  echo "✅ diary.db 삭제 완료"
else
  echo "ℹ️  diary.db 파일이 없습니다"
fi

# 2. 백업 파일 삭제
if [ -d "backups" ]; then
  rm -rf backups/*
  echo "✅ backups/ 정리 완료"
else
  echo "ℹ️  backups/ 디렉토리가 없습니다"
fi

# 3. 업로드 이미지 삭제
if [ -d "uploads" ]; then
  rm -rf uploads/*
  echo "✅ uploads/ 정리 완료"
else
  echo "ℹ️  uploads/ 디렉토리가 없습니다"
fi

echo ""
echo "✅ 백엔드 데이터 초기화 완료!"
echo ""
echo "📱 모바일 앱 데이터 초기화 방법:"
echo "   1. 앱 설정 화면에서 '모든 데이터 삭제' 버튼 사용"
echo "   2. 또는 앱을 삭제 후 재설치"
echo ""
echo "🚀 서버 재시작:"
echo "   npm run dev"
