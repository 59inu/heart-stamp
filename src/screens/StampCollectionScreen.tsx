import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { RootStackParamList } from '../navigation/types';
import { DiaryEntry } from '../models/DiaryEntry';
import { DiaryStorage } from '../services/diaryStorage';
import { getStampImage, getStampColor } from '../utils/stampUtils';
import { COLORS } from '../constants/colors';

type NavigationProp = StackNavigationProp<RootStackParamList, 'StampCollection'>;
type StampCollectionRouteProp = RouteProp<RootStackParamList, 'StampCollection'>;

export const StampCollectionScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<StampCollectionRouteProp>();
  const { year, month } = route.params;

  const [stampedDiaries, setStampedDiaries] = useState<DiaryEntry[]>([]);

  const loadStampedDiaries = useCallback(async () => {
    const allDiaries = await DiaryStorage.getAll();

    // 해당 월의 도장받은 일기만 필터링
    const filtered = allDiaries.filter((diary) => {
      const diaryDate = new Date(diary.date);
      return (
        diaryDate.getFullYear() === year &&
        diaryDate.getMonth() === month - 1 && // month는 1-12, getMonth()는 0-11
        diary.aiComment // AI 코멘트 있음 = 도장 받음
      );
    });

    // 날짜 오름차순 정렬 (작성일 순)
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setStampedDiaries(filtered);
  }, [year, month]);

  useFocusEffect(
    useCallback(() => {
      loadStampedDiaries();
    }, [loadStampedDiaries])
  );

  const handleDiaryPress = useCallback(
    (entryId: string) => {
      navigation.navigate('DiaryDetail', { entryId });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: DiaryEntry }) => {
      const stampColor = getStampColor(item._id);
      const dateObj = new Date(item.date);
      const dayText = format(dateObj, 'd일', { locale: ko });

      return (
        <TouchableOpacity
          style={styles.gridItem}
          onPress={() => handleDiaryPress(item._id)}
          activeOpacity={0.7}
        >
          {/* 도장 */}
          {item.stampType && (
            <Image
              source={getStampImage(item.stampType)}
              style={styles.stampImageGrid}
              tintColor={stampColor}
              resizeMode="contain"
            />
          )}

          {/* 날짜 */}
          <Text style={styles.gridDateText}>{dayText}</Text>

          {/* 감정 도트 */}
          {item.mood && (
            <View
              style={[
                styles.gridMoodDot,
                item.mood === 'red' && styles.moodRed,
                item.mood === 'yellow' && styles.moodYellow,
                item.mood === 'green' && styles.moodGreen,
              ]}
            />
          )}
        </TouchableOpacity>
      );
    },
    [handleDiaryPress]
  );

  const keyExtractor = useCallback((item: DiaryEntry) => item._id, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {year}년 {month}월 도장 컬렉션
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* 도장 개수 */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          이번 달에 {stampedDiaries.length}개의 도장을 모았어요!
        </Text>
      </View>

      {/* 그리드 */}
      <FlatList
        data={stampedDiaries}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={3}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>아직 모은 도장이 없어요</Text>
            <Text style={styles.emptySubtext}>
              일기를 작성하면 선생님이 도장을 찍어줘요
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  countContainer: {
    backgroundColor: '#F5EFE5', // 하트 베이지
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  countText: {
    fontSize: 14,
    color: '#7A6F5D', // 진한 베이지
    fontWeight: '600',
  },
  gridContent: {
    padding: 16,
  },
  gridRow: {
    gap: 8,
    marginBottom: 16,
  },
  gridItem: {
    flex: 1,
    maxWidth: '31.5%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  stampImageGrid: {
    width: '80%',
    height: '80%',
    position: 'absolute',
    top: '10%',
  },
  gridDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginTop: 'auto',
    marginBottom: 4,
  },
  gridMoodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  moodRed: {
    backgroundColor: COLORS.emotionNegativeStrong,
  },
  moodYellow: {
    backgroundColor: COLORS.emotionNeutralStrong,
  },
  moodGreen: {
    backgroundColor: COLORS.emotionPositiveStrong,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
});
