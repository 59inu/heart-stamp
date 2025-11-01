import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { DiaryEntry, StampType } from '../models/DiaryEntry';
import { RootStackParamList } from '../navigation/types';
import { DiaryStorage } from '../services/diaryStorage';
import { apiService } from '../services/apiService';
import { WeatherService } from '../services/weatherService';
import { getStampImage } from '../utils/stampUtils';
import { logger } from '../utils/logger';

type NavigationProp = StackNavigationProp<RootStackParamList, 'DiaryDetail'>;
type DiaryDetailRouteProp = RouteProp<RootStackParamList, 'DiaryDetail'>;

// 원고지 계산 상수 (한 번만 계산)
const CELL_WIDTH = 22;
const HORIZONTAL_PADDING = 8 * 2 + 4 * 2; // diaryContent padding + manuscriptContainer padding
const SCREEN_WIDTH = Dimensions.get('window').width;
const AVAILABLE_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING;
const CELLS_PER_ROW = Math.floor(AVAILABLE_WIDTH / CELL_WIDTH);

// 원고지 스타일 컴포넌트 (React.memo로 최적화)
const ManuscriptPaper: React.FC<{ content: string }> = React.memo(({ content }) => {
  // 텍스트를 한 글자씩 분리하고 빈 칸 계산 (useMemo로 최적화)
  const { characters, emptyCellsNeeded } = React.useMemo(() => {
    const chars = content.split('');
    const totalCells = chars.length;
    const lastRowCells = totalCells % CELLS_PER_ROW;
    const empty = lastRowCells > 0 ? CELLS_PER_ROW - lastRowCells : 0;

    return {
      characters: chars,
      emptyCellsNeeded: empty,
    };
  }, [content]);

  return (
    <View style={styles.manuscriptContainer}>
      {characters.map((char, index) => (
        <View key={`char-${index}`} style={styles.manuscriptCell}>
          <Text style={styles.manuscriptChar}>
            {char === '\n' ? '' : char}
          </Text>
        </View>
      ))}
      {/* 마지막 줄 빈 칸 채우기 */}
      {Array.from({ length: emptyCellsNeeded }).map((_, index) => (
        <View key={`empty-${index}`} style={styles.manuscriptCell}>
          <Text style={styles.manuscriptChar}> </Text>
        </View>
      ))}
    </View>
  );
});

export const DiaryDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DiaryDetailRouteProp>();
  const [entry, setEntry] = useState<DiaryEntry | null>(null);

  const loadEntry = useCallback(async () => {
    let cancelled = false;

    const fetchData = async () => {
      let diary = await DiaryStorage.getById(route.params.entryId);

      // Check cancellation before making API call
      if (cancelled) return;

      // 서버에서 AI 코멘트 동기화
      if (diary && !diary.aiComment) {
        try {
          const serverData = await apiService.syncDiaryFromServer(diary._id);

          // Check cancellation after async operation
          if (cancelled) return;

          if (serverData && serverData.aiComment) {
            await DiaryStorage.update(diary._id, {
              aiComment: serverData.aiComment,
              stampType: serverData.stampType as StampType,
            });

            // Check cancellation before final fetch
            if (cancelled) return;

            // 다시 로드
            diary = await DiaryStorage.getById(route.params.entryId);
          }
        } catch (error) {
          logger.debug('서버 동기화 오류 (무시):', error);
        }
      }

      // Only update state if not cancelled
      if (!cancelled && diary) {
        setEntry(diary);
      }
    };

    fetchData();

    // Cleanup function
    return () => {
      cancelled = true;
    };
  }, [route.params.entryId]);

  useFocusEffect(
    useCallback(() => {
      const cleanup = loadEntry();
      return cleanup;
    }, [loadEntry])
  );

  if (!entry) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>일기를 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#333" />
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

      <ScrollView style={styles.content}>
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

        {/* 이미지 섹션 */}
        {entry.imageUri && (
          <View style={styles.imageSection}>
            <Image
              source={{ uri: entry.imageUri }}
              style={styles.diaryImage}
              resizeMode="cover"
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
              <Text style={styles.aiTitle}>✨ 선생님의 코멘트</Text>
              {entry.stampType && (
                <View style={styles.stampContainer}>
                  <Image
                    source={getStampImage(entry.stampType)}
                    style={styles.stampImage}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
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
    color: '#f44336',
    fontWeight: '600',
  },
  editButton: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  dateContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dateWithWeather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateText: {
    fontSize: 18,
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
    backgroundColor: '#FFB3BA',
  },
  moodYellow: {
    backgroundColor: '#FFF4B0',
  },
  moodGreen: {
    backgroundColor: '#B4E7CE',
  },
  moodTagText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  imageSection: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
  },
  diaryImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholderSection: {
    width: '100%',
    height: 200,
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
    paddingHorizontal: 8,
    paddingVertical: 16,
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
    padding: 4,
    borderRadius: 8,
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
    backgroundColor: '#e3f2fd',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1976d2',
  },
  stampContainer: {
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 8,
  },
  stampImage: {
    width: 40,
    height: 40,
  },
  aiCommentText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  noAiComment: {
    margin: 16,
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
  },
  noAiCommentText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
