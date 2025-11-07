import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { DiaryEntry, StampType } from '../models/DiaryEntry';
import { RootStackParamList } from '../navigation/types';
import { DiaryStorage } from '../services/diaryStorage';
import { apiService } from '../services/apiService';
import { WeatherService } from '../services/weatherService';
import { getStampImage, getRandomStampPosition } from '../utils/stampUtils';
import { logger } from '../utils/logger';
import { COLORS } from '../constants/colors';
import { diaryEvents, EVENTS } from '../services/eventEmitter';

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_HEIGHT = (SCREEN_WIDTH * 3) / 5; // 3:5 비율

type NavigationProp = StackNavigationProp<RootStackParamList, 'DiaryDetail'>;
type DiaryDetailRouteProp = RouteProp<RootStackParamList, 'DiaryDetail'>;

// 원고지 계산 상수 (한 번만 계산)
const CELL_WIDTH = 22;
const HORIZONTAL_PADDING = 0; // 패딩 없음 (전체 화면 너비 사용)
const AVAILABLE_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING;
const CELLS_PER_ROW = Math.floor(AVAILABLE_WIDTH / CELL_WIDTH);

// 원고지 스타일 컴포넌트 (FlatList로 가상화하여 성능 최적화)
const ManuscriptPaper: React.FC<{ content: string }> = React.memo(({ content }) => {
  // 텍스트를 한 글자씩 분리하고 빈 칸 계산 (useMemo로 최적화)
  const allCells = React.useMemo(() => {
    const chars = content.split('');
    const totalCells = chars.length;
    const minCells = CELLS_PER_ROW * 10; // 최소 10줄 보장

    // 최소 줄 수를 보장하기 위한 빈 칸 계산
    let emptyCellsNeeded = 0;
    if (totalCells < minCells) {
      // 10줄보다 적으면 10줄까지 채움
      emptyCellsNeeded = minCells - totalCells;
    } else {
      // 10줄 이상이면 마지막 줄만 채움
      const lastRowCells = totalCells % CELLS_PER_ROW;
      emptyCellsNeeded = lastRowCells > 0 ? CELLS_PER_ROW - lastRowCells : 0;
    }

    // 모든 셀을 하나의 배열로 통합
    const cells = [
      ...chars.map((char, index) => ({ char, isEmpty: false, index })),
      ...Array.from({ length: emptyCellsNeeded }).map((_, index) => ({
        char: ' ',
        isEmpty: true,
        index: chars.length + index,
      })),
    ];

    return cells;
  }, [content]);

  const renderItem = useCallback(
    ({ item }: { item: { char: string; isEmpty: boolean; index: number } }) => (
      <View style={styles.manuscriptCell}>
        <Text style={styles.manuscriptChar}>{item.char === '\n' ? '' : item.char}</Text>
      </View>
    ),
    []
  );

  const keyExtractor = useCallback(
    (item: { char: string; isEmpty: boolean; index: number }) =>
      `${content.substring(0, 10)}-${item.isEmpty ? 'empty' : 'char'}-${item.index}`,
    [content]
  );

  return (
    <FlatList
      data={allCells}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={CELLS_PER_ROW}
      scrollEnabled={false}
      contentContainerStyle={styles.manuscriptContainer}
      initialNumToRender={50}
      maxToRenderPerBatch={50}
      windowSize={5}
      removeClippedSubviews={true}
    />
  );
});

export const DiaryDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DiaryDetailRouteProp>();
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    let diary = await DiaryStorage.getById(route.params.entryId);

    // 서버에서 AI 코멘트 동기화
    if (diary && !diary.aiComment) {
      try {
        const serverData = await apiService.syncDiaryFromServer(diary._id);

        if (serverData && serverData.aiComment) {
          await DiaryStorage.update(diary._id, {
            aiComment: serverData.aiComment,
            stampType: serverData.stampType as StampType,
          });

          diary = await DiaryStorage.getById(route.params.entryId);
        }
      } catch (error) {
        logger.debug('서버 동기화 오류 (무시):', error);
      }
    }

    if (diary) {
      setEntry(diary);
    }
  }, [route.params.entryId]);

  // Pull-to-Refresh 핸들러
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      console.log('🔄 [DiaryDetailScreen] Pull-to-refresh triggered - syncing with server...');
      await DiaryStorage.syncWithServer();
      await fetchData();
      diaryEvents.emit(EVENTS.AI_COMMENT_RECEIVED);
      console.log('✅ [DiaryDetailScreen] Pull-to-refresh completed');
    } catch (error) {
      logger.error('Pull-to-refresh 오류:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // Silent Push 수신 시 자동 새로고침
  useEffect(() => {
    const handleAICommentReceived = () => {
      console.log('📖 AI comment received event - reloading diary detail...');
      fetchData();
    };

    diaryEvents.on(EVENTS.AI_COMMENT_RECEIVED, handleAICommentReceived);

    return () => {
      diaryEvents.off(EVENTS.AI_COMMENT_RECEIVED, handleAICommentReceived);
    };
  }, [fetchData]);

  const handleEdit = useCallback(() => {
    if (!entry) return;

    // AI 코멘트가 있으면 경고 표시
    if (entry.aiComment) {
      Alert.alert(
        '일기 수정',
        '수정해도 선생님 코멘트는 업데이트되지 않아요',
        [
          {
            text: '취소',
            style: 'cancel',
          },
          {
            text: '수정',
            onPress: () => {
              navigation.navigate('DiaryWrite', { entryId: entry._id });
            },
          },
        ]
      );
    } else {
      navigation.navigate('DiaryWrite', { entryId: entry._id });
    }
  }, [entry, navigation]);

  const handleDelete = useCallback(() => {
    if (!entry) return;

    Alert.alert(
      '일기 삭제',
      '정말 이 일기를 삭제하시겠어요?',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            // 로컬에서 삭제
            await DiaryStorage.delete(entry._id);
            // 서버에서도 삭제
            await apiService.deleteDiary(entry._id);
            navigation.goBack();
          },
        },
      ]
    );
  }, [entry, navigation]);

  if (!entry) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>일기를 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#4B5563" />
        </TouchableOpacity>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButtonContainer}>
            <Text style={styles.deleteButton}>삭제</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleEdit}>
            <Text style={styles.editButton}>수정</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.dateContainer}>
        <View style={styles.dateWithWeather}>
          <Text style={styles.dateText}>
            {format(new Date(entry.date), 'yyyy년 MM월 dd일 (E)', { locale: ko })}
          </Text>
          {entry.weather && (
            <Text style={styles.weatherIcon}>
              {WeatherService.getWeatherEmoji(entry.weather)}
            </Text>
          )}
        </View>
        {entry.mood && (
          <View style={styles.moodContainer}>
            <View
              style={[
                styles.moodIndicator,
                entry.mood === 'red' && styles.moodRed,
                entry.mood === 'yellow' && styles.moodYellow,
                entry.mood === 'green' && styles.moodGreen,
              ]}
            />
            {entry.moodTag && (
              <Text style={styles.moodTagText}>{entry.moodTag}</Text>
            )}
          </View>
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* 이미지 섹션 */}
        {entry.imageUri && (
          <View style={styles.imageSection}>
            <Image
              source={{ uri: entry.imageUri }}
              style={styles.diaryImage}
              resizeMode="contain"
            />
          </View>
        )}
        {!entry.imageUri && (
          <View style={styles.imagePlaceholderSection}>
            <Image
              source={require('../../assets/image-placeholder.png')}
              style={styles.placeholderImage}
              resizeMode="contain"
            />
          </View>
        )}

        <View style={styles.diaryContent}>
          <ManuscriptPaper content={entry.content} />
        </View>

        {entry.aiComment && (
          <View style={styles.aiSection}>
            <View style={styles.aiHeader}>
              <View style={styles.emojiCircle}>
                <Ionicons name="sparkles" size={12} color="#fff" />
              </View>
              <Text style={styles.aiTitle}>선생님 코멘트</Text>
              {entry.stampType && (
                <View style={styles.stampContainer}>
                  <Image
                    source={getStampImage(entry.stampType)}
                    style={styles.stampImageSmall}
                    resizeMode="contain"
                  />
                </View>
              )}
            </View>
            <Text style={styles.aiCommentText}>{entry.aiComment}</Text>
          </View>
        )}

        {!entry.aiComment && (() => {
          // 일기 날짜와 현재 날짜 비교
          const entryDate = new Date(entry.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          entryDate.setHours(0, 0, 0, 0);

          const isToday = entryDate.getTime() === today.getTime();

          // 오늘 일기만 대기 메시지 표시
          if (isToday) {
            return (
              <View style={styles.noAiComment}>
                <Text style={styles.noAiCommentText}>
                  밤 사이 선생님이 코멘트를 달아줄 거예요! 🌙
                </Text>
              </View>
            );
          }

          return null;
        })()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 0,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  deleteButtonContainer: {
    marginRight: 0,
  },
  deleteButton: {
    fontSize: 16,
    color: COLORS.error,
    fontWeight: '600',
  },
  editButton: {
    fontSize: 16,
    color: '#4B5563',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
  },
  dateContainer: {
    backgroundColor: '#fff',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  dateWithWeather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  weatherIcon: {
    fontSize: 24,
  },
  moodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  moodIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
  moodTagText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  imageSection: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: '#f5f5f5',
  },
  diaryImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholderSection: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    opacity: 0.5,
  },
  diaryContent: {
    paddingTop: 24,
    paddingBottom: 18,
    backgroundColor: '#fffef8',
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  manuscriptContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fffef8',
    justifyContent: 'center',
  },
  manuscriptCell: {
    width: 22,
    height: 20,
    borderWidth: 0.5,
    borderColor: '#e0d5c7',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fffef8',
  },
  manuscriptChar: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'System',
  },
  aiSection: {
    backgroundColor: '#F0F6FF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 60,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    position: 'relative',
    overflow: 'visible',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
    justifyContent: 'space-between',
  },
  emojiCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#60A5FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 12,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.teacherTitle,
    flex: 1,
  },
  stampContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  stampImageSmall: {
    width: 72,
    height: 72,
  },
  aiCommentText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
  },
  noAiComment: {
    margin: 16,
    padding: 20,
    backgroundColor: '#F0F6FF',
    borderRadius: 12,
    alignItems: 'center',
  },
  noAiCommentText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
