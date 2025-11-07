import { useMemo } from 'react';
import { format } from 'date-fns';
import { DiaryEntry } from '../../../models/DiaryEntry';
import { CALENDAR_MARKING_STYLES } from '../../../constants/calendarStyles';

export const useCalendarMarking = (
  diaries: DiaryEntry[],
  selectedDate: string,
  today: string
) => {
  const markedDates = useMemo(() => {
    const marked: { [key: string]: any } = {};

    diaries.forEach((diary) => {
      const dateKey = format(new Date(diary.date), 'yyyy-MM-dd');
      const isSelected = dateKey === selectedDate;
      const isToday = dateKey === today;
      const hasComment = !!diary.aiComment;

      // 선택된 날짜 - 기존 배경색 유지 + 보라색 보더라인 추가
      if (isSelected) {
        if (hasComment) {
          // AI 코멘트 있는 날짜
          if (diary.mood === 'red') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.selectedWithCommentRed;
          } else if (diary.mood === 'yellow') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.selectedWithCommentYellow;
          } else if (diary.mood === 'green') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.selectedWithCommentGreen;
          } else {
            marked[dateKey] = CALENDAR_MARKING_STYLES.selectedWithComment;
          }
        } else {
          // 일반 일기만 있는 날짜
          if (diary.mood === 'red') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.selectedWithDiaryRed;
          } else if (diary.mood === 'yellow') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.selectedWithDiaryYellow;
          } else if (diary.mood === 'green') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.selectedWithDiaryGreen;
          } else {
            marked[dateKey] = CALENDAR_MARKING_STYLES.selectedWithDiary;
          }
        }
      }
      // 오늘 날짜 (선택되지 않은 경우) - 두꺼운 보더
      else if (isToday) {
        if (hasComment) {
          // AI 코멘트 있는 날짜
          if (diary.mood === 'red') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.todayWithCommentRed;
          } else if (diary.mood === 'yellow') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.todayWithCommentYellow;
          } else if (diary.mood === 'green') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.todayWithCommentGreen;
          } else {
            marked[dateKey] = CALENDAR_MARKING_STYLES.todayWithComment;
          }
        } else {
          // 일반 일기만 있는 날짜
          if (diary.mood === 'red') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.todayWithDiaryRed;
          } else if (diary.mood === 'yellow') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.todayWithDiaryYellow;
          } else if (diary.mood === 'green') {
            marked[dateKey] = CALENDAR_MARKING_STYLES.todayWithDiaryGreen;
          } else {
            marked[dateKey] = CALENDAR_MARKING_STYLES.todayWithDiary;
          }
        }
      }
      // AI 코멘트 있는 날짜 - 감정에 따라 배경색 표시 + 하늘색 테두리
      else if (hasComment) {
        if (diary.mood === 'red') {
          marked[dateKey] = CALENDAR_MARKING_STYLES.withCommentRed;
        } else if (diary.mood === 'yellow') {
          marked[dateKey] = CALENDAR_MARKING_STYLES.withCommentYellow;
        } else if (diary.mood === 'green') {
          marked[dateKey] = CALENDAR_MARKING_STYLES.withCommentGreen;
        } else {
          // 기분이 없는 경우
          marked[dateKey] = CALENDAR_MARKING_STYLES.withComment;
        }
      }
      // 일반 일기 있는 날짜 - 기분에 따라 배경색 표시
      else {
        if (diary.mood === 'red') {
          marked[dateKey] = CALENDAR_MARKING_STYLES.withDiaryRed;
        } else if (diary.mood === 'yellow') {
          marked[dateKey] = CALENDAR_MARKING_STYLES.withDiaryYellow;
        } else if (diary.mood === 'green') {
          marked[dateKey] = CALENDAR_MARKING_STYLES.withDiaryGreen;
        } else {
          // 기분이 없는 경우
          marked[dateKey] = CALENDAR_MARKING_STYLES.withDiary;
        }
      }
    });

    // 미래 날짜들을 연한 색으로 마킹 (시각적으로 비활성화 표현)
    const nowDate = new Date();
    const currentMonth = nowDate.getMonth();
    const currentYear = nowDate.getFullYear();

    // 이전 달부터 다음다음 달까지의 모든 날짜 확인
    for (let monthOffset = -1; monthOffset <= 2; monthOffset++) {
      const checkDate = new Date(currentYear, currentMonth + monthOffset, 1);
      const daysInMonth = new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(checkDate.getFullYear(), checkDate.getMonth(), day);
        const dateKey = format(date, 'yyyy-MM-dd');

        // 미래 날짜이고, 아직 마킹되지 않았으면 (일기가 없으면)
        if (dateKey > today && !marked[dateKey]) {
          marked[dateKey] = CALENDAR_MARKING_STYLES.futureDate;
        }
      }
    }

    // 오늘 날짜가 일기가 없고 선택되지 않은 경우 두꺼운 보더 표시
    if (!marked[today] && today !== selectedDate) {
      marked[today] = CALENDAR_MARKING_STYLES.today;
    }

    // 선택된 날짜가 일기가 없는 경우에도 표시
    if (!marked[selectedDate]) {
      marked[selectedDate] = CALENDAR_MARKING_STYLES.selectedEmpty;
    }

    return marked;
  }, [diaries, selectedDate, today]);

  return markedDates;
};
