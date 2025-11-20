import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/colors';

interface CalendarSectionProps {
  currentDate: Date;
  markedDates: { [key: string]: any };
  onDateSelect: (date: DateData) => void;
  onMonthChange: (date: DateData) => void;
  onHeaderPress: () => void;
  onTodayPress: () => void;
}

export const CalendarSection: React.FC<CalendarSectionProps> = ({
  currentDate,
  markedDates,
  onDateSelect,
  onMonthChange,
  onHeaderPress,
  onTodayPress,
}) => {
  // 현재 보고 있는 월이 오늘 날짜와 같은 달인지 확인
  const today = new Date();
  const isCurrentMonth =
    currentDate.getMonth() === today.getMonth() &&
    currentDate.getFullYear() === today.getFullYear();
  return (
    <Calendar
      key={format(currentDate, 'yyyy-MM')}
      current={format(currentDate, 'yyyy-MM-dd')}
      markedDates={markedDates}
      onDayPress={onDateSelect}
      onMonthChange={onMonthChange}
      markingType="custom"
      renderArrow={(direction: 'left' | 'right') => (
        <View style={styles.calendarArrowButton}>
          <Ionicons
            name={direction === 'left' ? 'chevron-back' : 'chevron-forward'}
            size={20}
            color={COLORS.buttonText}
          />
        </View>
      )}
      renderHeader={(date: any) => {
        const monthYear = format(new Date(date), 'yyyy년 MM월', { locale: ko });
        return (
          <View style={styles.calendarHeaderContainer}>
            <View style={styles.headerLeft}>
              <TouchableOpacity style={styles.calendarHeader} onPress={onHeaderPress}>
                <Text style={styles.calendarHeaderText}>{monthYear}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.todayButton}
              onPress={onTodayPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="refresh"
                size={20}
                color={isCurrentMonth ? '#ccc' : COLORS.settingsIconColor}
              />
            </TouchableOpacity>
          </View>
        );
      }}
      theme={{
        selectedDayBackgroundColor: COLORS.buttonSecondaryBackground,
        todayTextColor: '#2F2B4C',
        arrowColor: COLORS.buttonText,
        dotColor: COLORS.buttonSecondaryBackground,
        textDayFontWeight: '400',
        textDayFontSize: 16,
        textMonthFontWeight: 'bold',
        textDayHeaderFontWeight: '600',
        textSectionTitleColor: '#9DA3AF',
        textDayColor: '#6B7280',
        textDisabledColor: '#9DA3AF',
        'stylesheet.day.basic': {
          base: {
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
          },
          text: {
            marginTop: 4,
            fontSize: 16,
            fontWeight: '400',
          },
        },
        'stylesheet.calendar.main': {
          week: {
            marginTop: 2,
            marginBottom: 2,
            flexDirection: 'row',
            justifyContent: 'space-around',
          },
        },
      }}
      style={styles.calendar}
    />
  );
};

const styles = StyleSheet.create({
  calendar: {
    marginTop: 20,
    paddingBottom: 24,
  },
  calendarHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  calendarHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  calendarHeaderText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  headerLeft: {},
  todayButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 40,
    alignItems: 'center',
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.settingsIconColor,
  },
  todayButtonTextDisabled: {
    color: '#ccc',
  },
  calendarArrowButton: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.buttonBackground,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
