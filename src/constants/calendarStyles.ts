/**
 * Calendar marking styles constants
 * Prevents inline object creation in render cycles
 */

import { COLORS } from './colors';

export const CALENDAR_MARKING_STYLES = {
  // AI 코멘트 있는 날짜 (감정 없음)
  withComment: {
    customStyles: {
      container: {
        backgroundColor: 'transparent',
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#87A6D1', // 하트 블루 테두리
      },
      text: {
        color: '#2F2B4C',
        fontWeight: '400' as const,
      },
    },
  },

  // AI 코멘트 + 빨간 감정
  withCommentRed: {
    customStyles: {
      container: {
        backgroundColor: COLORS.emotionNegativeLight,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#87A6D1', // 하트 블루 테두리
      },
      text: {
        color: COLORS.emotionNegative,
        fontWeight: '400' as const,
      },
    },
  },

  // AI 코멘트 + 노란 감정
  withCommentYellow: {
    customStyles: {
      container: {
        backgroundColor: COLORS.emotionNeutralLight,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#87A6D1', // 하트 블루 테두리
      },
      text: {
        color: COLORS.emotionNeutral,
        fontWeight: '400' as const,
      },
    },
  },

  // AI 코멘트 + 초록 감정
  withCommentGreen: {
    customStyles: {
      container: {
        backgroundColor: COLORS.emotionPositiveLight,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#87A6D1', // 하트 블루 테두리
      },
      text: {
        color: COLORS.emotionPositive,
        fontWeight: '400' as const,
      },
    },
  },

  // 일반 일기 있는 날짜 (기분 없음)
  withDiary: {
    customStyles: {
      container: {
        backgroundColor: 'transparent',
        borderRadius: 8,
      },
      text: {
        color: '#000',
        fontWeight: '400' as const,
      },
    },
  },

  // 일기 있는 날짜 - 빨간 신호등
  withDiaryRed: {
    customStyles: {
      container: {
        backgroundColor: COLORS.emotionNegativeLight, // 연한 빨강
        borderRadius: 8,
      },
      text: {
        color: COLORS.emotionNegative, // 감정 부정 색상
        fontWeight: '400' as const,
      },
    },
  },

  // 일기 있는 날짜 - 노란 신호등
  withDiaryYellow: {
    customStyles: {
      container: {
        backgroundColor: COLORS.emotionNeutralLight, // 연한 노랑
        borderRadius: 8,
      },
      text: {
        color: COLORS.emotionNeutral, // 감정 중립 색상
        fontWeight: '400' as const,
      },
    },
  },

  // 일기 있는 날짜 - 초록 신호등
  withDiaryGreen: {
    customStyles: {
      container: {
        backgroundColor: COLORS.emotionPositiveLight, // 연한 초록
        borderRadius: 8,
      },
      text: {
        color: COLORS.emotionPositive, // 감정 긍정 색상
        fontWeight: '400' as const,
      },
    },
  },

  // 미래 날짜
  futureDate: {
    customStyles: {
      container: {
        backgroundColor: 'transparent',
      },
      text: {
        color: '#e0e0e0',
        fontWeight: '300' as const,
      },
    },
  },

  // === 선택된 날짜 버전 (원래 배경색 유지 + 진한 테두리 추가) ===

  // 선택됨 + AI 코멘트 (감정 없음)
  selectedWithComment: {
    customStyles: {
      container: {
        backgroundColor: 'transparent',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#666666',
      },
      text: {
        color: '#2F2B4C',
        fontWeight: '400' as const,
      },
    },
  },

  // 선택됨 + AI 코멘트 + 빨간 감정
  selectedWithCommentRed: {
    customStyles: {
      container: {
        backgroundColor: COLORS.emotionNegativeLight,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#666666',
      },
      text: {
        color: COLORS.emotionNegative,
        fontWeight: '400' as const,
      },
    },
  },

  // 선택됨 + AI 코멘트 + 노란 감정
  selectedWithCommentYellow: {
    customStyles: {
      container: {
        backgroundColor: COLORS.emotionNeutralLight,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#666666',
      },
      text: {
        color: COLORS.emotionNeutral,
        fontWeight: '400' as const,
      },
    },
  },

  // 선택됨 + AI 코멘트 + 초록 감정
  selectedWithCommentGreen: {
    customStyles: {
      container: {
        backgroundColor: COLORS.emotionPositiveLight,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#666666',
      },
      text: {
        color: COLORS.emotionPositive,
        fontWeight: '400' as const,
      },
    },
  },

  // 선택됨 + 일반 일기 (감정 없음)
  selectedWithDiary: {
    customStyles: {
      container: {
        backgroundColor: 'transparent',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#666666',
      },
      text: {
        color: '#000',
        fontWeight: '400' as const,
      },
    },
  },

  // 선택됨 + 일반 일기 + 빨간 감정
  selectedWithDiaryRed: {
    customStyles: {
      container: {
        backgroundColor: COLORS.emotionNegativeLight,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#666666',
      },
      text: {
        color: COLORS.emotionNegative,
        fontWeight: '400' as const,
      },
    },
  },

  // 선택됨 + 일반 일기 + 노란 감정
  selectedWithDiaryYellow: {
    customStyles: {
      container: {
        backgroundColor: COLORS.emotionNeutralLight,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#666666',
      },
      text: {
        color: COLORS.emotionNeutral,
        fontWeight: '400' as const,
      },
    },
  },

  // 선택됨 + 일반 일기 + 초록 감정
  selectedWithDiaryGreen: {
    customStyles: {
      container: {
        backgroundColor: COLORS.emotionPositiveLight,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#666666',
      },
      text: {
        color: COLORS.emotionPositive,
        fontWeight: '400' as const,
      },
    },
  },

  // 선택됨 + 일기 없음 (과거 날짜)
  selectedEmpty: {
    customStyles: {
      container: {
        backgroundColor: 'transparent',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#666666',
      },
      text: {
        color: '#2F2B4C',
        fontWeight: '400' as const,
      },
    },
  },

  // 오늘 날짜 선택됨 (일기 유무 무관)
  todaySelected: {
    customStyles: {
      container: {
        backgroundColor: '#C9DAF0', // 연한 블루
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#666666',
      },
      text: {
        color: '#2F2B4C',
        fontWeight: '400' as const,
      },
    },
  },

  // === 오늘 날짜 표시 (연한 블루 배경 + 보더) ===

  // 오늘 + 일기 없음
  today: {
    customStyles: {
      container: {
        backgroundColor: '#C9DAF0', // 연한 블루
        borderRadius: 8,
        borderWidth: 3,
        borderColor: '#C9DAF0',
      },
      text: {
        color: '#2F2B4C',
        fontWeight: '400' as const,
      },
    },
  },

  // 오늘 + AI 코멘트 (감정 없음)
  todayWithComment: {
    customStyles: {
      container: {
        backgroundColor: '#C9DAF0', // 연한 블루
        borderRadius: 8,
        borderWidth: 3,
        borderColor: '#C9DAF0',
      },
      text: {
        color: '#2F2B4C',
        fontWeight: '400' as const,
      },
    },
  },

  // 오늘 + AI 코멘트 + 빨간 감정
  todayWithCommentRed: {
    customStyles: {
      container: {
        backgroundColor: '#C9DAF0', // 연한 블루
        borderRadius: 8,
        borderWidth: 3,
        borderColor: '#C9DAF0',
      },
      text: {
        color: '#2F2B4C',
        fontWeight: '400' as const,
      },
    },
  },

  // 오늘 + AI 코멘트 + 노란 감정
  todayWithCommentYellow: {
    customStyles: {
      container: {
        backgroundColor: '#C9DAF0', // 연한 블루
        borderRadius: 8,
        borderWidth: 3,
        borderColor: '#C9DAF0',
      },
      text: {
        color: '#2F2B4C',
        fontWeight: '400' as const,
      },
    },
  },

  // 오늘 + AI 코멘트 + 초록 감정
  todayWithCommentGreen: {
    customStyles: {
      container: {
        backgroundColor: '#C9DAF0', // 연한 블루
        borderRadius: 8,
        borderWidth: 3,
        borderColor: '#C9DAF0',
      },
      text: {
        color: '#2F2B4C',
        fontWeight: '400' as const,
      },
    },
  },

  // 오늘 + 일반 일기 (감정 없음)
  todayWithDiary: {
    customStyles: {
      container: {
        backgroundColor: '#C9DAF0', // 연한 블루
        borderRadius: 8,
        borderWidth: 3,
        borderColor: '#C9DAF0',
      },
      text: {
        color: '#2F2B4C',
        fontWeight: '400' as const,
      },
    },
  },

  // 오늘 + 일반 일기 + 빨간 감정
  todayWithDiaryRed: {
    customStyles: {
      container: {
        backgroundColor: '#C9DAF0', // 연한 블루
        borderRadius: 8,
        borderWidth: 3,
        borderColor: '#C9DAF0',
      },
      text: {
        color: '#2F2B4C',
        fontWeight: '400' as const,
      },
    },
  },

  // 오늘 + 일반 일기 + 노란 감정
  todayWithDiaryYellow: {
    customStyles: {
      container: {
        backgroundColor: '#C9DAF0', // 연한 블루
        borderRadius: 8,
        borderWidth: 3,
        borderColor: '#C9DAF0',
      },
      text: {
        color: '#2F2B4C',
        fontWeight: '400' as const,
      },
    },
  },

  // 오늘 + 일반 일기 + 초록 감정
  todayWithDiaryGreen: {
    customStyles: {
      container: {
        backgroundColor: '#C9DAF0', // 연한 블루
        borderRadius: 8,
        borderWidth: 3,
        borderColor: '#C9DAF0',
      },
      text: {
        color: '#2F2B4C',
        fontWeight: '400' as const,
      },
    },
  },
};
