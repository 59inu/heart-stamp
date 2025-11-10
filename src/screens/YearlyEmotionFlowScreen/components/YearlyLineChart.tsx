import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { DiaryEntry } from '../../../models/DiaryEntry';
import { format, startOfYear, differenceInDays } from 'date-fns';

interface YearlyLineChartProps {
  diaries: DiaryEntry[];
  year: number;
}

// 감정을 숫자 값으로 변환 (부정: -1, 중립: 0, 긍정: 1)
const moodToValue = (mood: string): number => {
  switch (mood) {
    case 'red':
      return -1;
    case 'yellow':
      return 0;
    case 'green':
      return 1;
    default:
      return 0;
  }
};

// 감정 값에 따른 색상
const getColorForValue = (value: number): string => {
  if (value < -0.3) return '#F19392'; // 부정 (핑크)
  if (value > 0.3) return '#9DD2B6'; // 긍정 (민트)
  return '#F5EFE5'; // 중립 (베이지)
};

type PeriodType = 'year' | 'half' | 'quarter' | 'month';

export const YearlyLineChart: React.FC<YearlyLineChartProps> = ({
  diaries,
  year,
}) => {
  // 현재 날짜 기반 기본값 계산
  const getCurrentPeriod = (type: PeriodType): number => {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11

    switch (type) {
      case 'half':
        return currentMonth < 6 ? 0 : 1; // 상반기/하반기
      case 'quarter':
        return Math.floor(currentMonth / 3); // 0-3
      case 'month':
        return currentMonth; // 0-11
      default:
        return 0;
    }
  };

  const [periodType, setPeriodType] = useState<PeriodType>('year');
  const [selectedPeriod, setSelectedPeriod] = useState(0);

  const screenWidth = Dimensions.get('window').width;
  const cardMargin = 32; // 좌우 16씩
  const cardPadding = 32; // 좌우 16씩
  const chartWidth = screenWidth - cardMargin - cardPadding;
  const chartHeight = 300;
  const padding = { top: 20, right: 15, bottom: 40, left: 40 };

  // 차트 내부 크기
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // 기간에 따라 일기 필터링
  const filteredDiaries = useMemo(() => {
    if (periodType === 'year') return diaries;

    return diaries.filter((diary) => {
      const date = new Date(diary.date);
      const month = date.getMonth(); // 0-11

      if (periodType === 'half') {
        // 상반기(0) = 1-6월(0-5), 하반기(1) = 7-12월(6-11)
        return selectedPeriod === 0 ? month < 6 : month >= 6;
      } else if (periodType === 'quarter') {
        // 1분기(0)=1-3월, 2분기(1)=4-6월, 3분기(2)=7-9월, 4분기(3)=10-12월
        const quarterStart = selectedPeriod * 3;
        return month >= quarterStart && month < quarterStart + 3;
      } else if (periodType === 'month') {
        return month === selectedPeriod;
      }
      return true;
    });
  }, [diaries, periodType, selectedPeriod]);

  // 데이터 포인트 생성
  const dataPoints = useMemo(() => {
    const yearStart = startOfYear(new Date(year, 0, 1));
    const sortedDiaries = [...filteredDiaries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    if (sortedDiaries.length === 0) return [];

    // 기간에 따른 X축 범위 계산
    let minDay = 0;
    let maxDay = 365;

    if (periodType === 'half') {
      minDay = selectedPeriod === 0 ? 0 : 181;
      maxDay = selectedPeriod === 0 ? 181 : 365;
    } else if (periodType === 'quarter') {
      const daysPerQuarter = 365 / 4;
      minDay = Math.floor(selectedPeriod * daysPerQuarter);
      maxDay = Math.floor((selectedPeriod + 1) * daysPerQuarter);
    } else if (periodType === 'month') {
      // 해당 월의 시작일과 끝일
      const monthStart = new Date(year, selectedPeriod, 1);
      const monthEnd = new Date(year, selectedPeriod + 1, 0);
      minDay = differenceInDays(monthStart, yearStart);
      maxDay = differenceInDays(monthEnd, yearStart) + 1;
    }

    const dayRange = maxDay - minDay;

    return sortedDiaries.map((diary) => {
      const dayOfYear = differenceInDays(new Date(diary.date), yearStart);
      const value = moodToValue(diary.mood);

      return {
        x: ((dayOfYear - minDay) / dayRange) * innerWidth,
        y: innerHeight / 2 - (value * innerHeight) / 3,
        value,
        date: diary.date,
        mood: diary.mood,
      };
    });
  }, [filteredDiaries, year, innerWidth, innerHeight, periodType, selectedPeriod]);

  // 부드러운 곡선 경로 생성 (Catmull-Rom spline)
  const createSmoothPath = () => {
    if (dataPoints.length === 0) return '';
    if (dataPoints.length === 1) {
      const p = dataPoints[0];
      return `M ${p.x} ${p.y} L ${p.x} ${p.y}`;
    }

    let path = `M ${dataPoints[0].x} ${dataPoints[0].y}`;

    for (let i = 0; i < dataPoints.length - 1; i++) {
      const current = dataPoints[i];
      const next = dataPoints[i + 1];

      // 제어점 계산 (곡선을 부드럽게)
      const cp1x = current.x + (next.x - current.x) / 3;
      const cp1y = current.y;
      const cp2x = next.x - (next.x - current.x) / 3;
      const cp2y = next.y;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }

    return path;
  };

  // 평균 감정선 계산
  const averageValue = useMemo(() => {
    if (dataPoints.length === 0) return 0;
    const sum = dataPoints.reduce((acc, p) => acc + p.value, 0);
    return sum / dataPoints.length;
  }, [dataPoints]);

  const averageY = innerHeight / 2 - (averageValue * innerHeight) / 3;

  // 기간 선택 레이블
  const getPeriodLabel = () => {
    if (periodType === 'year') return '전체 연도';
    if (periodType === 'half') return selectedPeriod === 0 ? '상반기' : '하반기';
    if (periodType === 'quarter') return `${selectedPeriod + 1}분기`;
    if (periodType === 'month') return `${selectedPeriod + 1}월`;
    return '';
  };

  return (
    <View style={styles.container}>
      {/* 기간 선택 버튼 */}
      <View style={styles.periodSelector}>
        <View style={styles.periodRow}>
          {/* 왼쪽: 기간 타입 버튼 */}
          <View style={styles.periodTypeButtons}>
            <TouchableOpacity
              style={[styles.periodButton, periodType === 'year' && styles.periodButtonActive]}
              onPress={() => {
                setPeriodType('year');
                setSelectedPeriod(0);
              }}
            >
              <Text style={[styles.periodButtonText, periodType === 'year' && styles.periodButtonTextActive]}>
                전체
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.periodButton, periodType === 'quarter' && styles.periodButtonActive]}
              onPress={() => {
                const newType = 'quarter';
                setPeriodType(newType);
                setSelectedPeriod(getCurrentPeriod(newType));
              }}
            >
              <Text style={[styles.periodButtonText, periodType === 'quarter' && styles.periodButtonTextActive]}>
                분기
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.periodButton, periodType === 'month' && styles.periodButtonActive]}
              onPress={() => {
                const newType = 'month';
                setPeriodType(newType);
                setSelectedPeriod(getCurrentPeriod(newType));
              }}
            >
              <Text style={[styles.periodButtonText, periodType === 'month' && styles.periodButtonTextActive]}>
                월
              </Text>
            </TouchableOpacity>
          </View>

          {/* 오른쪽: 네비게이션 화살표 (분기/월 선택 시) */}
          {periodType !== 'year' && (
            <View style={styles.navigationButtons}>
              <TouchableOpacity
                style={styles.arrowButton}
                onPress={() => {
                  const maxPeriod = periodType === 'quarter' ? 3 : 11;
                  setSelectedPeriod(prev => Math.max(0, prev - 1));
                }}
                disabled={selectedPeriod === 0}
              >
                <Text style={[styles.arrowText, selectedPeriod === 0 && styles.arrowTextDisabled]}>◀</Text>
              </TouchableOpacity>

              <Text style={styles.selectedPeriodText}>{getPeriodLabel()}</Text>

              <TouchableOpacity
                style={styles.arrowButton}
                onPress={() => {
                  const maxPeriod = periodType === 'quarter' ? 3 : 11;
                  setSelectedPeriod(prev => Math.min(maxPeriod, prev + 1));
                }}
                disabled={selectedPeriod >= (periodType === 'quarter' ? 3 : 11)}
              >
                <Text style={[styles.arrowText, selectedPeriod >= (periodType === 'quarter' ? 3 : 11) && styles.arrowTextDisabled]}>▶</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* 범례 */}
      <View style={styles.legend}>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F19392' }]} />
            <Text style={styles.legendText}>부정</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F5EFE5' }]} />
            <Text style={styles.legendText}>중립</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#9DD2B6' }]} />
            <Text style={styles.legendText}>긍정</Text>
          </View>
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.title}>감정 흐름 - {getPeriodLabel()}</Text>
        <Text style={styles.subtitle}>
          총 {filteredDiaries.length}개의 일기 • 평균 감정:{' '}
          {averageValue > 0.3
            ? '긍정'
            : averageValue < -0.3
            ? '부정'
            : '중립'}
        </Text>

        <Svg width={chartWidth} height={chartHeight} style={styles.chart}>
          {/* 배경 격자선 */}
          <Line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left + innerWidth}
            y2={padding.top}
            stroke="#e0e0e0"
            strokeWidth="1"
          />
          <Line
            x1={padding.left}
            y1={padding.top + innerHeight / 2}
            x2={padding.left + innerWidth}
            y2={padding.top + innerHeight / 2}
            stroke="#e0e0e0"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
          <Line
            x1={padding.left}
            y1={padding.top + innerHeight}
            x2={padding.left + innerWidth}
            y2={padding.top + innerHeight}
            stroke="#e0e0e0"
            strokeWidth="1"
          />

          {/* Y축 라벨 */}
          <SvgText
            x={padding.left - 10}
            y={padding.top + 5}
            fontSize="10"
            fill="#999"
            textAnchor="end"
          >
            긍정
          </SvgText>
          <SvgText
            x={padding.left - 10}
            y={padding.top + innerHeight / 2 + 5}
            fontSize="10"
            fill="#999"
            textAnchor="end"
          >
            중립
          </SvgText>
          <SvgText
            x={padding.left - 10}
            y={padding.top + innerHeight + 5}
            fontSize="10"
            fill="#999"
            textAnchor="end"
          >
            부정
          </SvgText>

          {/* X축 라벨 (동적) */}
          {(() => {
            if (periodType === 'month') {
              // 월별 뷰: 일(day) 표시
              const daysInMonth = new Date(year, selectedPeriod + 1, 0).getDate();
              const dayLabels = periodType === 'month' && daysInMonth <= 28
                ? [1, 7, 14, 21, daysInMonth]
                : [1, 10, 20, daysInMonth];

              return dayLabels.map((day) => {
                const x = padding.left + ((day - 1) / (daysInMonth - 1)) * innerWidth;
                return (
                  <SvgText
                    key={day}
                    x={x}
                    y={padding.top + innerHeight + 25}
                    fontSize="10"
                    fill="#999"
                    textAnchor="middle"
                  >
                    {day}일
                  </SvgText>
                );
              });
            } else if (periodType === 'quarter') {
              // 분기별 뷰: 월 표시
              const startMonth = selectedPeriod * 3;
              const months = [startMonth, startMonth + 1, startMonth + 2];
              return months.map((month, idx) => {
                const x = padding.left + (idx / 2) * innerWidth;
                return (
                  <SvgText
                    key={month}
                    x={x}
                    y={padding.top + innerHeight + 25}
                    fontSize="10"
                    fill="#999"
                    textAnchor="middle"
                  >
                    {month + 1}월
                  </SvgText>
                );
              });
            } else if (periodType === 'half') {
              // 반기별 뷰: 월 표시 (3개월 간격)
              const startMonth = selectedPeriod === 0 ? 0 : 6;
              const months = [startMonth, startMonth + 2, startMonth + 4, startMonth + 5];
              return months.map((month, idx) => {
                const x = padding.left + (idx / 3) * innerWidth;
                return (
                  <SvgText
                    key={month}
                    x={x}
                    y={padding.top + innerHeight + 25}
                    fontSize="10"
                    fill="#999"
                    textAnchor="middle"
                  >
                    {month + 1}월
                  </SvgText>
                );
              });
            } else {
              // 전체 연도 뷰: 월 표시
              return [0, 3, 6, 9, 11].map((month) => {
                const x = padding.left + (month / 11) * innerWidth;
                return (
                  <SvgText
                    key={month}
                    x={x}
                    y={padding.top + innerHeight + 25}
                    fontSize="10"
                    fill="#999"
                    textAnchor="middle"
                  >
                    {month + 1}월
                  </SvgText>
                );
              });
            }
          })()}

          {/* 평균선 */}
          <Line
            x1={padding.left}
            y1={padding.top + averageY}
            x2={padding.left + innerWidth}
            y2={padding.top + averageY}
            stroke={getColorForValue(averageValue)}
            strokeWidth="2"
            strokeDasharray="6,4"
            opacity={0.5}
          />

          {/* 감정 흐름 곡선 */}
          {dataPoints.length > 0 && (
            <Path
              d={createSmoothPath()}
              stroke="#87A6D1"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform={`translate(${padding.left}, ${padding.top})`}
            />
          )}

          {/* 데이터 포인트 점 */}
          {dataPoints.map((point, index) => (
            <Circle
              key={index}
              cx={padding.left + point.x}
              cy={padding.top + point.y}
              r="3"
              fill={getColorForValue(point.value)}
              stroke="#fff"
              strokeWidth="1.5"
            />
          ))}
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  periodSelector: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  periodButtonActive: {
    backgroundColor: '#87A6D1',
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  arrowButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  arrowText: {
    fontSize: 14,
    color: '#666',
  },
  arrowTextDisabled: {
    color: '#ccc',
  },
  selectedPeriodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    minWidth: 60,
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#999',
    marginBottom: 16,
  },
  chart: {
    marginTop: 8,
  },
  legend: {
    marginHorizontal: 16,
    marginBottom: 12,
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
