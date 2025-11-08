import { StampType } from '../models/DiaryEntry';

// 도장 이미지 매핑
// 현재는 하나의 이미지를 모두 사용하지만, 나중에 확장 가능
export const getStampImage = (stampType: StampType) => {
  switch (stampType) {
    case 'excellent':
      return require('../../assets/stamp.png');
    case 'good':
      return require('../../assets/stamp.png');
    case 'nice':
      return require('../../assets/stamp.png');
    case 'keep_going':
      return require('../../assets/stamp.png');
    default:
      return require('../../assets/stamp.png');
  }
};

// 나중에 이미지가 추가되면 이렇게 확장:
// case 'excellent':
//   return require('../../assets/stamp-excellent.png');
// case 'good':
//   return require('../../assets/stamp-good.png');
// ...

// 도장 타입별 레이블 (참고용)
export const getStampLabel = (stampType: StampType): string => {
  switch (stampType) {
    case 'excellent':
      return '최고예요';
    case 'good':
      return '잘했어요';
    case 'nice':
      return '좋아요';
    case 'keep_going':
      return '힘내요';
    default:
      return '';
  }
};

// 도장 색상 팔레트
const STAMP_COLORS = [
  '#DC2626', // 빨간색 (전통적인 도장 색상)
  '#1E3A8A', // 남색
  '#374151', // 검은색 (진한 회색)
];

// 일기 ID를 기반으로 일관된 도장 색상 선택
export const getStampColor = (diaryId: string): string => {
  let hash = 0;
  for (let i = 0; i < diaryId.length; i++) {
    hash = ((hash << 5) - hash) + diaryId.charCodeAt(i);
    hash = hash & hash;
  }

  const colorIndex = Math.abs(hash) % STAMP_COLORS.length;
  return STAMP_COLORS[colorIndex];
};

// 일기 ID를 기반으로 일관된 랜덤 도장 위치 생성
export const getRandomStampPosition = (diaryId: string) => {
  // diaryId를 해시하여 일관된 랜덤 값 생성
  let hash = 0;
  for (let i = 0; i < diaryId.length; i++) {
    hash = ((hash << 5) - hash) + diaryId.charCodeAt(i);
    hash = hash & hash; // 32비트 정수로 변환
  }

  // 회전: 0 ~ 60도
  const rotation = (Math.abs(hash) % 61);

  // 상하 위치: ±20
  const topOffset = ((Math.abs(hash >> 8) % 41) - 20);

  // 좌우 위치: ±20
  const rightOffset = ((Math.abs(hash >> 16) % 41) - 20);

  return {
    rotation: `${rotation}deg`,
    top: -80 + topOffset,
    right: 5 + rightOffset,
  };
};
