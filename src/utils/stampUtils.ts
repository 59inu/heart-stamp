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
