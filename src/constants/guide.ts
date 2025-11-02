// 온보딩 가이드 데이터

export interface GuideStep {
  emoji: string;
  title: string;
  description: string;
  example?: string;
  highlight?: string;
}

export const GUIDE_STEPS: GuideStep[] = [
  {
    emoji: '🩷',
    title: '① 하루를 기록해요',
    description: '오늘 있었던 일을 짧게 남겨보세요.\n날씨와 기분을 고르고, 한두 문장도 충분해요.',
    example: '✨ "오늘은 흐렸지만 마음은 맑았어요."',
    highlight: '기록이 쌓이면, 당신의 마음이 보이기 시작해요.',
  },
  {
    emoji: '💌',
    title: '② 내일, 선생님의 응원이 도착해요',
    description: '하루 뒤, 선생님이 당신의 일기를 읽고\n따뜻한 한마디를 남겨드려요.\n위로가 될 수도, 새로운 시선이 될 수도 있어요.',
    highlight: '🪄 "선생님은 언제나 당신 편이에요."',
  },
  {
    emoji: '📊',
    title: '③ 한 주의 마음을 돌아봐요',
    description: '일주일 동안의 감정을 모아\n주간 감정 리포트로 보여드려요.\n"이번 주엔 행복한 날이 가장 많았어요."',
    highlight: '내 마음의 흐름을 한눈에 보는 시간이에요.',
  },
  {
    emoji: '🌱',
    title: '④ 조금씩, 당신의 페이스대로',
    description: 'Heart Stamp는 완벽한 하루보다\n진짜 마음을 기록하는 하루를 응원해요.\n꾸준히 기록할수록 선생님은 당신을 더 이해하게 돼요.',
    highlight: '☁️ "오늘도 마음 도장을 하나 찍어요."',
  },
];
