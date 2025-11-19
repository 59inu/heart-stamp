import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { DiaryEntry } from '../../../models/DiaryEntry';
import { format } from 'date-fns';

interface YearlyHeatmapProps {
  diaries: DiaryEntry[];
  year: number;
}

// 감정 타입별 색상
const EMOTION_COLORS = {
  red: '#F19392',    // 핑크 - 부정
  yellow: '#F5EFE5', // 베이지 - 중립
  green: '#9DD2B6',  // 민트 - 긍정
};

export const YearlyHeatmap: React.FC<YearlyHeatmapProps> = ({
  diaries,
  year,
}) => {
  // 디바이스 너비에 따른 동적 크기 계산
  const dimensions = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    const cardMargin = 32; // 좌우 16px씩
    const cardPadding = 32; // 좌우 16px씩
    const availableWidth = screenWidth - cardMargin - cardPadding;

    // Day 라벨 컬럼과 스크롤 여백 고정
    const dayLabelWidth = 26;
    const dayLabelMargin = 4;
    const scrollPadding = 8;

    // 12개 월 컬럼에 사용 가능한 너비
    const monthsWidth = availableWidth - dayLabelWidth - dayLabelMargin - scrollPadding;

    // 각 월 컬럼 너비 (12개로 나눔)
    const monthColumnWidth = Math.floor(monthsWidth / 12);

    // 월 간격을 제외한 실제 셀 너비
    const monthMargin = 1.5;
    const cellWidth = monthColumnWidth - (monthMargin * 2);

    return {
      cellWidth: Math.max(cellWidth, 18), // 최소 18px
      cellHeight: 18,
      monthMargin,
      dayLabelWidth,
      cornerSize: 24,
      dotSize: Math.max(cellWidth - 8, 10), // 셀보다 8px 작게, 최소 10px
      fontSize: cellWidth > 22 ? 9 : 8,
    };
  }, []);

  // 일기 데이터를 날짜별로 매핑
  const diaryMap = useMemo(() => {
    const map: { [key: string]: DiaryEntry } = {};
    diaries.forEach((diary) => {
      const dateKey = format(new Date(diary.date), 'yyyy-MM-dd');
      map[dateKey] = diary;
    });
    return map;
  }, [diaries]);

  // 월 라벨
  const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

  // 각 월의 일 수
  const getDaysInMonth = (month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // 날짜에 해당하는 일기가 있는지 확인하고 감정 색상 반환
  const getEmotionColor = (month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const diary = diaryMap[dateStr];

    if (!diary) return null;

    return EMOTION_COLORS[diary.mood as keyof typeof EMOTION_COLORS] || '#ccc';
  };

  return (
    <View style={styles.container}>
      {/* 범례 */}
      <View style={styles.legend}>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: EMOTION_COLORS.red }]} />
            <Text style={styles.legendText}>부정</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: EMOTION_COLORS.yellow }]} />
            <Text style={styles.legendText}>중립</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: EMOTION_COLORS.green }]} />
            <Text style={styles.legendText}>긍정</Text>
          </View>
        </View>
      </View>

      {/* 히트맵 카드 */}
      <View style={styles.heatmapCard}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.heatmapContainer}>
        {/* 일(Day) 라벨 */}
        <View style={styles.dayLabelColumn}>
          <View style={[styles.cornerCell, {
            height: dimensions.cornerSize,
            width: dimensions.dayLabelWidth
          }]} />
          {Array.from({ length: 31 }, (_, i) => (
            <View key={i} style={[styles.dayLabel, {
              height: dimensions.cellHeight,
              width: dimensions.dayLabelWidth
            }]}>
              <Text style={[styles.dayLabelText, { fontSize: dimensions.fontSize }]}>
                {i + 1}
              </Text>
            </View>
          ))}
        </View>

        {/* 월별 컬럼 */}
        {months.map((monthLabel, monthIndex) => {
          const daysInMonth = getDaysInMonth(monthIndex);

          return (
            <View key={monthIndex} style={[styles.monthColumn, {
              marginHorizontal: dimensions.monthMargin
            }]}>
              {/* 월 라벨 */}
              <View style={[styles.monthLabel, {
                height: dimensions.cornerSize,
                width: dimensions.cellWidth
              }]}>
                <Text style={[styles.monthLabelText, { fontSize: dimensions.fontSize }]}>
                  {monthLabel}
                </Text>
              </View>

              {/* 날짜 셀들 */}
              {Array.from({ length: 31 }, (_, dayIndex) => {
                const day = dayIndex + 1;
                const emotionColor = getEmotionColor(monthIndex, day);
                const isValidDay = day <= daysInMonth;

                return (
                  <View
                    key={dayIndex}
                    style={[
                      styles.dayCell,
                      {
                        height: dimensions.cellHeight,
                        width: dimensions.cellWidth,
                        backgroundColor: isValidDay && emotionColor ? emotionColor : (isValidDay ? '#f9f9f9' : 'transparent')
                      },
                      !isValidDay && styles.dayCellInvalid,
                    ]}
                  />
                );
              })}
            </View>
          );
        })}
        </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heatmapCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingRight: 8,
  },
  heatmapContainer: {
    flexDirection: 'row',
  },
  dayLabelColumn: {
    marginRight: 4,
  },
  cornerCell: {
    marginBottom: 2,
  },
  dayLabel: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 2,
    paddingRight: 4,
  },
  dayLabelText: {
    color: '#999',
    fontWeight: '500',
  },
  monthColumn: {
    // marginHorizontal은 동적으로 설정됨
  },
  monthLabel: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  monthLabelText: {
    color: '#666',
    fontWeight: '600',
  },
  dayCell: {
    marginBottom: 2,
    borderRadius: 2.5,
  },
  dayCellInvalid: {
    backgroundColor: 'transparent',
  },
  legend: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  legendItems: {
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 13,
    color: '#666',
  },
});
