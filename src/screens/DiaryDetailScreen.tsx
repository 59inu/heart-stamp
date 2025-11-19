import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
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
import { getStampImage, getRandomStampPosition, getStampColor } from '../utils/stampUtils';
import { logger } from '../utils/logger';
import { COLORS } from '../constants/colors';
import { diaryEvents, EVENTS } from '../services/eventEmitter';
import { AnalyticsService } from '../services/analyticsService';
import { DiaryShareModal } from '../components/DiaryShareModal';
import { ManuscriptPaper } from '../components/ManuscriptPaper';

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_HEIGHT = (SCREEN_WIDTH * 3) / 5; // 3:5 비율

type NavigationProp = StackNavigationProp<RootStackParamList, 'DiaryDetail'>;
type DiaryDetailRouteProp = RouteProp<RootStackParamList, 'DiaryDetail'>;

export const DiaryDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DiaryDetailRouteProp>();
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageLoadStatus, setImageLoadStatus] = useState<string>('pending');
  const [showShareModal, setShowShareModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setImageLoadStatus('pending'); // 리셋
    let diary = await DiaryStorage.getById(route.params.entryId);

    // 서버에서 AI 코멘트 동기화
    if (diary && (!diary.aiComment || !diary.stampType)) {
      const result = await apiService.syncDiaryFromServer(diary._id);

      if (result.success && result.data.aiComment) {
        await DiaryStorage.update(diary._id, {
          aiComment: result.data.aiComment,
          stampType: result.data.stampType as StampType,
        });

        diary = await DiaryStorage.getById(route.params.entryId);
      } else if (!result.success) {
        // 404 에러는 조용히 처리 (AI 코멘트가 아직 생성되지 않은 정상 상태)
        if (result.errorType === 'NETWORK_ERROR') {
          logger.debug('네트워크 에러로 AI 코멘트 조회 실패');
        }
        // 다른 에러는 무시 (서버에 일기가 없거나 AI 코멘트가 없는 상태)
      }
    }

    if (diary) {
      setEntry(diary);

      // Analytics: AI 코멘트 조회 (핵심 가치 전달 순간!)
      if (diary.aiComment) {
        // 알림에서 왔는지, 다이어리 리스트에서 왔는지 등은 별도 파라미터로 추적 가능
        // 여기서는 'other'로 설정 (화면 진입 경로는 navigation params로 전달 가능)
        AnalyticsService.logAICommentViewed(diary, 'other');
      }
    }

    setLoading(false);
  }, [route.params.entryId]);

  // Pull-to-Refresh 핸들러
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      logger.log('🔄 [DiaryDetailScreen] Pull-to-refresh triggered - syncing with server...');
      const result = await DiaryStorage.syncWithServer();

      if (!result.success) {
        logger.error('동기화 실패:', result.error);
        Alert.alert(
          '동기화 실패',
          `서버와 동기화하지 못했습니다.\n\n${result.error}\n\n나중에 다시 시도해주세요.`,
          [{ text: '확인' }]
        );
      } else {
        logger.log('✅ [DiaryDetailScreen] Pull-to-refresh completed');
        diaryEvents.emit(EVENTS.AI_COMMENT_RECEIVED);
      }

      // 동기화 실패해도 로컬 데이터는 로드
      await fetchData();
    } catch (error) {
      logger.error('Pull-to-refresh 오류:', error);
      Toast.show({
        type: 'error',
        text1: '오류',
        text2: '새로고침 중 오류가 발생했습니다',
        position: 'bottom',
        visibilityTime: 3000,
      });
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
      logger.log('📖 AI comment received event - reloading diary detail...');
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
            // 로컬에서 먼저 삭제
            const localDeleted = await DiaryStorage.delete(entry._id);

            if (!localDeleted) {
              Toast.show({
                type: 'error',
                text1: '오류',
                text2: '일기 삭제에 실패했습니다',
                position: 'bottom',
                visibilityTime: 3000,
              });
              return;
            }

            // 서버에서도 삭제 시도
            const result = await apiService.deleteDiary(entry._id);

            if (result.success) {
              // 성공: 화면 닫기
              navigation.goBack();
            } else {
              // 서버 삭제 실패: 사용자에게 알림
              Alert.alert(
                '서버 삭제 실패',
                `일기가 로컬에서는 삭제되었지만 서버 삭제에 실패했습니다.\n\n${result.error}\n\n다음 동기화 시 자동으로 재시도됩니다.`,
                [{ text: '확인', onPress: () => navigation.goBack() }]
              );
            }
          },
        },
      ]
    );
  }, [entry, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>일기를 찾을 수 없습니다.</Text>
        </View>
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
        <View style={styles.dateInfo}>
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
        {/* 공유 버튼 */}
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => setShowShareModal(true)}
        >
          <Ionicons name="share-outline" size={20} color="#666" />
        </TouchableOpacity>
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
        {entry.imageUri && entry.imageGenerationStatus !== 'generating' && entry.imageGenerationStatus !== 'pending' && (
          <View style={styles.imageSection}>
            <Image
              source={{ uri: entry.imageUri }}
              style={styles.diaryImage}
              contentFit="contain"
              transition={200}
              cachePolicy="memory-disk"
              priority="high"
            />
          </View>
        )}

        {/* 이미지 생성 상태 표시 */}
        {entry.imageGenerationStatus && entry.imageGenerationStatus !== 'completed' && (
          <View style={[
            styles.imageGenerationStatus,
            entry.imageGenerationStatus === 'failed' && styles.imageGenerationStatusFailed
          ]}>
            <View style={styles.imageGenerationIconCircle}>
              <Ionicons
                name={entry.imageGenerationStatus === 'failed' ? 'alert-circle' : 'brush'}
                size={16}
                color="#fff"
              />
            </View>
            <Text style={styles.imageGenerationStatusText}>
              {entry.imageGenerationStatus === 'pending' && '그림일기 준비 중...'}
              {entry.imageGenerationStatus === 'generating' && '그림 그리고 있어요 🎨'}
              {entry.imageGenerationStatus === 'failed' && '그림 생성에 실패했어요'}
            </Text>
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
                  {imageLoadStatus === 'error' && __DEV__ ? (
                    // Expo Go 오프라인 제약: 이미지 로딩 실패 시 텍스트 대체
                    <View style={{ justifyContent: 'center', alignItems: 'center', width: 72, height: 72 }}>
                      <Text style={{ fontSize: 40 }}>🏆</Text>
                      <Text style={{ fontSize: 8, color: '#999', marginTop: 2 }}>
                        (개발 모드{'\n'}오프라인 제약)
                      </Text>
                    </View>
                  ) : (
                    <Image
                      source={getStampImage(entry.stampType)}
                      style={styles.stampImageSmall}
                      tintColor={getStampColor(entry._id)}
                      resizeMode="contain"
                      onError={(e) => {
                        setImageLoadStatus('error');
                      }}
                      onLoad={() => {
                        setImageLoadStatus('loaded');
                      }}
                    />
                  )}
                </View>
              )}
            </View>
            <Text style={styles.aiCommentText}>{entry.aiComment}</Text>
            <Text style={styles.aiDisclaimer}>AI가 자동 생성한 코멘트입니다</Text>
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

      {/* 공유 모달 */}
      {entry && (
        <DiaryShareModal
          visible={showShareModal}
          diary={entry}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateInfo: {
    flex: 1,
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
    backgroundColor: '#fff',
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
    position: 'relative',
  },
  shareButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
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
  aiDisclaimer: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
  },
  imageGenerationStatus: {
    backgroundColor: '#FFF8E1',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imageGenerationStatusFailed: {
    backgroundColor: '#FFEBEE',
  },
  imageGenerationIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFA726',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageGenerationStatusText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
});
