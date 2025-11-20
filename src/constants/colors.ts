/**
 * Heart Stamp 앱 색상 팔레트
 *
 * 🎨 하트 색상 테마:
 * - 핑크 (#F19392): 부정 감정
 * - 베이지 (#F5EFE5): 중립 감정
 * - 민트 (#9DD2B6): 긍정 감정
 * - 블루 (#87A6D1): 액센트/버튼
 */

export const COLORS = {
  // Primary - 따뜻한 베이지 (메인 브랜드 컬러)
  primary: '#C4B4A3', // 따뜻한 베이지
  primaryLight: '#E8DED5', // 밝은 베이지 (사용: 2회)

  // 하트 색상 시스템 - 감정 표현
  // 부정 감정 (핑크)
  emotionNegative: '#2F2B4C', // 진한 네이비 (텍스트/아이콘용)
  emotionNegativeStrong: '#F19392', // 하트 핑크 (강조)
  emotionNegativeLight: '#FADADD', // 연한 핑크 (배경)

  // 중립 감정 (베이지)
  emotionNeutral: '#A16207', // 진한 갈색 (텍스트/아이콘용)
  emotionNeutralStrong: '#F5EFE5', // 하트 베이지 (강조)
  emotionNeutralLight: '#FAF8F3', // 연한 베이지 (배경)

  // 긍정 감정 (민트)
  emotionPositive: '#16803C', // 진한 그린 (텍스트/아이콘용)
  emotionPositiveStrong: '#9DD2B6', // 하트 민트 (강조)
  emotionPositiveLight: '#E8F5EE', // 연한 민트 (배경)

  // 하트 블루 (액센트 컬러)
  secondary: '#87A6D1', // 하트 블루 (버튼, 아이콘)
  secondaryLight: '#B3CEE8', // 밝은 블루 (사용: 1회)

  // 배경
  background: '#f5f5f5', // 메인 배경색

  // 버튼
  buttonBackground: '#F7F6F9', // 버튼 배경
  buttonText: '#87A6D1', // 버튼 텍스트 (하트 블루)
  buttonSecondaryBackground: '#87A6D1', // 강조 버튼 배경 (하트 블루)
  buttonSecondaryText: '#FFFFFF', // 강조 버튼 텍스트

  // 설정 화면
  settingsIconBackground: '#f5f5f5', // 설정 아이콘 배경
  settingsIconColor: '#87A6D1', // 설정 아이콘 색상 (하트 블루)

  // 선생님 코멘트
  teacherTitle: '#2F2B4C', // 선생님 타이틀 색상 (진한 네이비)

  // 시스템 색상
  error: '#d32f2f', // 에러 표시
} as const;

// 감정별 색상 매핑 (편의 함수)
export const getEmotionColor = (type: 'red' | 'yellow' | 'green') => {
  switch (type) {
    case 'red':
      return COLORS.emotionNegative;
    case 'yellow':
      return COLORS.emotionNeutral;
    case 'green':
      return COLORS.emotionPositive;
    default:
      return COLORS.primary;
  }
};

export const getEmotionBackgroundColor = (type: 'red' | 'yellow' | 'green') => {
  switch (type) {
    case 'red':
      return COLORS.emotionNegativeLight;
    case 'yellow':
      return COLORS.emotionNeutralLight;
    case 'green':
      return COLORS.emotionPositiveLight;
    default:
      return COLORS.primaryLight;
  }
};
