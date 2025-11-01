/**
 * Calendar marking styles constants
 * Prevents inline object creation in render cycles
 */

export const CALENDAR_MARKING_STYLES = {
  // 선택된 날짜 스타일 (코멘트 있음)
  selectedWithComment: {
    customStyles: {
      container: {
        backgroundColor: '#4CAF50',
        borderRadius: 16,
      },
      text: {
        color: '#FFDAB9', // 피치색
        fontWeight: 'bold' as const,
      },
    },
  },

  // 선택된 날짜 스타일 (코멘트 없음)
  selectedWithoutComment: {
    customStyles: {
      container: {
        backgroundColor: '#4CAF50',
        borderRadius: 16,
      },
      text: {
        color: '#fff',
        fontWeight: 'bold' as const,
      },
    },
  },

  // 선택된 날짜 (일기 없음)
  selectedEmpty: {
    customStyles: {
      container: {
        backgroundColor: '#4CAF50',
        borderRadius: 16,
      },
      text: {
        color: '#fff',
        fontWeight: '300' as const,
      },
    },
  },

  // AI 코멘트 있는 날짜
  withComment: {
    customStyles: {
      container: {
        backgroundColor: '#FFDAB9',
        borderRadius: 16,
      },
      text: {
        color: '#000',
        fontWeight: 'bold' as const,
      },
    },
  },

  // 일반 일기 있는 날짜
  withDiary: {
    customStyles: {
      container: {
        backgroundColor: 'transparent',
        borderRadius: 16,
      },
      text: {
        color: '#000',
        fontWeight: 'bold' as const,
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
};
