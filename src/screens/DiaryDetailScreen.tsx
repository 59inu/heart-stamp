import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DiaryEntry, StampType } from '../models/DiaryEntry';
import { RootStackParamList } from '../navigation/types';
import { DiaryStorage } from '../services/diaryStorage';
import { apiService } from '../services/apiService';

type NavigationProp = StackNavigationProp<RootStackParamList, 'DiaryDetail'>;
type DiaryDetailRouteProp = RouteProp<RootStackParamList, 'DiaryDetail'>;

export const DiaryDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DiaryDetailRouteProp>();
  const [entry, setEntry] = useState<DiaryEntry | null>(null);

  useEffect(() => {
    const loadEntry = async () => {
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
    };
    loadEntry();
  }, [route.params.entryId]);

  if (!entry) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>일기를 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const handleEdit = () => {
    navigation.navigate('DiaryWrite', { entryId: entry._id });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← 뒤로</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleEdit}>
          <Text style={styles.editButton}>수정</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            {format(new Date(entry.date), 'yyyy년 MM월 dd일 (E)', { locale: ko })}
          </Text>
        </View>

        <View style={styles.diaryContent}>
          <Text style={styles.contentText}>{entry.content}</Text>
        </View>

        {entry.aiComment && (
          <View style={styles.aiSection}>
            <View style={styles.aiHeader}>
              <Text style={styles.aiTitle}>✨ AI 선생님의 코멘트</Text>
              {entry.stampType && (
                <View style={styles.stampContainer}>
                  <Text style={styles.stamp}>
                    {entry.stampType === 'excellent' && '🌟'}
                    {entry.stampType === 'good' && '😊'}
                    {entry.stampType === 'nice' && '👍'}
                    {entry.stampType === 'keep_going' && '💪'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.aiCommentText}>{entry.aiComment}</Text>
          </View>
        )}

        {!entry.aiComment && (
          <View style={styles.noAiComment}>
            <Text style={styles.noAiCommentText}>
              밤 사이 AI 선생님이 코멘트를 달아줄 거예요! 🌙
            </Text>
          </View>
        )}
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
    fontSize: 16,
    color: '#666',
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
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  diaryContent: {
    padding: 16,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
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
  stamp: {
    fontSize: 32,
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
