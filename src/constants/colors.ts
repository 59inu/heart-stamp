/**
 * 앱 전체 색상 팔레트
 *
 * 색상 체계:
 * - Primary: 따뜻한 베이지 (메인 브랜드 컬러)
 * - Emotion Traffic Light: 감정 신호등 시스템
 *   * Red: 불안정/부정적 감정
 *   * Yellow: 중립/변화하는 감정
 *   * Green: 긍정/안정적 감정
 * - Secondary: 부드러운 퍼플 (액센트)
 */

export const COLORS = {
  // Primary
  primary: '#C4B4A3',           // 따뜻한 베이지 (어둡게 조정)
  primaryLight: '#E8DED5',      // 밝은 베이지
  primaryDark: '#A89888',       // 어두운 베이지

  // Emotion Traffic Light (감정 신호등)
  emotionNegative: '#2F2B4C',   // 감정 부정 - 불안정/부정적
  emotionNegativeStrong: '#F97171', // 감정 부정 강조 (미리보기용)
  emotionNeutral: '#A16207',    // 감정 중립 - 중립/변화
  emotionNeutralStrong: '#FACC14', // 감정 중립 강조 (미리보기용)
  emotionPositive: '#16803C',   // 감정 초록 - 긍정/안정
  emotionPositiveStrong: '#4BDE80', // 감정 긍정 강조 (미리보기용)

  // Emotion backgrounds (배경용 - 더 연한 버전)
  emotionNegativeLight: '#F9C5BD',  // 감정 부정 배경
  emotionNeutralLight: '#FEF9C3',   // 감정 중립 배경
  emotionPositiveLight: '#DCFCE7',  // 감정 초록 배경

  // Secondary
  secondary: '#8C7E9B',          // 부드러운 퍼플 (어둡게 조정)
  secondaryLight: '#C7BDCF',     // 밝은 퍼플
  secondaryDark: '#6F6380',      // 어두운 퍼플

  // Grays (변경하지 않음)
  gray50: '#fafafa',
  gray100: '#f5f5f5',
  gray200: '#e0e0e0',
  gray300: '#d0d0d0',
  gray400: '#b0b0b0',
  gray500: '#909090',
  gray600: '#707070',
  gray700: '#505050',
  gray800: '#303030',
  gray900: '#202020',

  // Text colors (변경하지 않음)
  textPrimary: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',
  textWhite: '#ffffff',
  teacherTitle: '#2F2B4C',  // 선생님 타이틀 색상

  // Background
  background: '#F7F6F9',
  backgroundLight: '#fafafa',

  // Button
  buttonBackground: '#F7F6F9',
  buttonText: '#B9A8E0',
  buttonSecondaryBackground: '#B9A8E0',
  buttonSecondaryText: '#FFFFFF',

  // Settings
  settingsIconBackground: '#f5f5f5',  // 설정 아이콘 배경색
  settingsIconColor: '#8C7E9B',       // 설정 아이콘 색상

  // Status (시스템 색상 - 변경하지 않음)
  error: '#d32f2f',
  warning: '#f57c00',
  info: '#1976d2',
  success: '#388e3c',

  // Stamp types (도장 타입별 색상)
  stamp: {
    excellent: '#7DBFA0',      // 최고예요 - 긍정 그린
    good: '#7DBFA0',           // 잘했어요 - 긍정 그린
    nice: '#D4B857',           // 좋아요 - 중립 옐로우
    keep_going: '#D98B7F',     // 힘내요 - 부정 레드
  }
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
