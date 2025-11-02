/**
 * 월간 감정 통계 메시지
 * 날짜 구간(초/중/후반)과 감정 비율에 따라 다른 메시지 표시
 */

export type EmotionType =
  | 'negative_dominant'
  | 'positive_dominant'
  | 'neutral_dominant'
  | 'balanced_positive_negative'
  | 'negative_neutral_dominant'
  | 'positive_neutral_dominant';

export type DatePeriod = 'start' | 'mid' | 'end';

export const EMOTION_MESSAGES: Record<EmotionType, Record<DatePeriod, string>> = {
  negative_dominant: {
    start: '한 걸음 한 걸음 괜찮아질 거예요 🌱',
    mid: '힘든 날이 많아요. 안아주고 싶어요 🫂',
    end: '나를 알아주세요. 정말 고생했어요 💙',
  },
  positive_dominant: {
    start: '좋은 시작이에요 ✨',
    mid: '즐겁게 보내고 있어요 😊',
    end: '웃는 날이 많았네요 🌟',
  },
  neutral_dominant: {
    start: '담담하게 시작하고 있어요 🌾',
    mid: '여러 기분으로 바쁘게 보내고 있어요 💫',
    end: '감정이 바쁘고 다채로운 한달이었어요 🌈',
  },
  balanced_positive_negative: {
    start: '파도를 멋지게 타볼까요 🌊',
    mid: '열심히 잘 해내고 있어요 💪',
    end: '지지 않고 잘 해냈어요. 고생 많았어요 🌟',
  },
  negative_neutral_dominant: {
    start: '조금만 기대어 쉬어요 🫂',
    mid: '마음이 편안하고 고요하기를 빌어요 🙏',
    end: '지칠 때는 편안하게 쉬는 것도 필요해요 💤',
  },
  positive_neutral_dominant: {
    start: '잔잔한 행복이 보여요 💛',
    mid: '편안하고 밝은 시간이네요 ☀️',
    end: '따뜻한 기운이 감돌아요 🌸',
  },
};

/**
 * 현재 날짜를 기준으로 초/중/후반 구분
 * @param day 현재 일(1-31)
 * @returns 'start' | 'mid' | 'end'
 */
export const getDatePeriod = (day: number): DatePeriod => {
  if (day >= 1 && day <= 10) return 'start';
  if (day >= 11 && day <= 20) return 'mid';
  return 'end';
};

/**
 * 감정 비율을 분석하여 감정 타입 반환
 * @param red 부정 감정 개수
 * @param yellow 중립 감정 개수
 * @param green 긍정 감정 개수
 * @returns EmotionType
 */
export const analyzeEmotionType = (
  red: number,
  yellow: number,
  green: number
): EmotionType => {
  const total = red + yellow + green;
  if (total === 0) return 'neutral_dominant';

  const redPercent = (red / total) * 100;
  const yellowPercent = (yellow / total) * 100;
  const greenPercent = (green / total) * 100;

  // 한 감정이 50% 이상인 경우
  if (greenPercent >= 50) return 'positive_dominant';
  if (redPercent >= 50) return 'negative_dominant';
  if (yellowPercent >= 50) return 'neutral_dominant';

  // 긍정과 부정이 비슷한 경우 (둘 다 30% 이상이고 중립이 적음)
  if (greenPercent >= 30 && redPercent >= 30 && yellowPercent < 30) {
    return 'balanced_positive_negative';
  }

  // 부정과 중립이 우세한 경우
  if (redPercent + yellowPercent >= 60 && greenPercent < 30) {
    return 'negative_neutral_dominant';
  }

  // 긍정과 중립이 우세한 경우
  if (greenPercent + yellowPercent >= 60 && redPercent < 30) {
    return 'positive_neutral_dominant';
  }

  // 가장 많은 감정으로 판단
  const max = Math.max(redPercent, yellowPercent, greenPercent);
  if (greenPercent === max) return 'positive_dominant';
  if (redPercent === max) return 'negative_dominant';
  return 'neutral_dominant';
};

/**
 * 감정 통계와 현재 날짜로 메시지 가져오기
 * @param red 부정 감정 개수
 * @param yellow 중립 감정 개수
 * @param green 긍정 감정 개수
 * @param currentDay 현재 일(1-31)
 * @returns 감정 메시지
 */
export const getEmotionMessage = (
  red: number,
  yellow: number,
  green: number,
  currentDay: number
): string | null => {
  const total = red + yellow + green;
  if (total === 0) return null;

  const emotionType = analyzeEmotionType(red, yellow, green);
  const datePeriod = getDatePeriod(currentDay);

  return EMOTION_MESSAGES[emotionType][datePeriod];
};
