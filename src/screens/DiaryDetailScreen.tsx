import React, { useState, useEffect, useCallback } from 'react';
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

type NavigationProp = StackNavigationProp<RootStackParamList, 'DiaryDetail'>;
type DiaryDetailRouteProp = RouteProp<RootStackParamList, 'DiaryDetail'>;

// 원고지 스타일 컴포넌트
const ManuscriptPaper: React.FC<{ content: string }> = ({ content }) => {
  // 텍스트를 한 글자씩 분리 (공백과 줄바꿈 포함)
  const characters = content.split('');

  // 한 줄에 들어가는 칸 개수 계산 (화면 너비 기준)
  const cellWidth = 22;
  const screenWidth = Dimensions.get('window').width;
  const horizontalPadding = 8 * 2 + 4 * 2; // diaryContent padding + manuscriptContainer padding
  const availableWidth = screenWidth - horizontalPadding;
  const cellsPerRow = Math.floor(availableWidth / cellWidth);

  // 마지막 줄을 채우기 위한 빈 칸 계산
  const totalCells = characters.length;
  const lastRowCells = totalCells % cellsPerRow;
  const emptyCellsNeeded = lastRowCells > 0 ? cellsPerRow - lastRowCells : 0;

  console.log('Screen width:', screenWidth);
  console.log('Available width:', availableWidth);
  console.log('Cells per row:', cellsPerRow);
  console.log('Total cells:', totalCells);
  console.log('Empty cells needed:', emptyCellsNeeded);

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
};

export const DiaryDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DiaryDetailRouteProp>();
  const [entry, setEntry] = useState<DiaryEntry | null>(null);

  const loadEntry = useCallback(async () => {
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
          // 다시 로드
          diary = await DiaryStorage.getById(route.params.entryId);
        }
      } catch (error) {
        console.log('서버 동기화 오류 (무시):', error);
      }
    }

    setEntry(diary);
  }, [route.params.entryId]);

  useFocusEffect(
    useCallback(() => {
      loadEntry();
    }, [loadEntry])
  );

  if (!entry) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>일기를 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const handleEdit = () => {
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
  };

  const handleDelete = () => {
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
  };

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
