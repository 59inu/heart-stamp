import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DiaryEntry } from '../models/DiaryEntry';
import { RootStackParamList } from '../navigation/types';
import { apiService } from '../services/apiService';
import { DiaryStorage } from '../services/diaryStorage';

type NavigationProp = StackNavigationProp<RootStackParamList, 'DiaryWrite'>;
type DiaryWriteRouteProp = RouteProp<RootStackParamList, 'DiaryWrite'>;

export const DiaryWriteScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DiaryWriteRouteProp>();

  const [content, setContent] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    route.params?.date || new Date()
  );
  const [existingEntry, setExistingEntry] = useState<DiaryEntry | null>(null);

  const entryId = route.params?.entryId;

  useEffect(() => {
    const loadEntry = async () => {
      if (entryId) {
        const entry = await DiaryStorage.getById(entryId);
        if (entry) {
          setExistingEntry(entry);
          setContent(entry.content);
          setSelectedDate(new Date(entry.date));
        }
      }
    };
    loadEntry();
  }, [entryId]);

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('알림', '일기 내용을 입력해주세요.');
      return;
    }

    let savedEntry: DiaryEntry;

    if (existingEntry) {
      const updated = await DiaryStorage.update(existingEntry._id, {
        content,
        syncedWithServer: false,
      });
      savedEntry = updated!;
    } else {
      savedEntry = await DiaryStorage.create({
        date: selectedDate.toISOString(),
        content,
        syncedWithServer: false,
      });
    }

    // Upload to server
    const uploaded = await apiService.uploadDiary(savedEntry);
    if (uploaded) {
      await DiaryStorage.update(savedEntry._id, {
        syncedWithServer: true,
      });
    }

    Alert.alert('저장 완료', '일기가 저장되었습니다.\n밤 사이 AI 선생님이 코멘트를 달아줄 거예요! 🌙', [
      { text: '확인', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButton}>취소</Text>
          </TouchableOpacity>
          <Text style={styles.dateText}>
            {format(selectedDate, 'yyyy년 MM월 dd일 (E)', { locale: ko })}
          </Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveButton}>저장</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.editorContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="오늘 하루는 어땠나요?"
            placeholderTextColor="#999"
            multiline
            value={content}
            onChangeText={setContent}
            autoFocus
          />
        </View>

        {existingEntry?.aiComment && (
          <View style={styles.aiCommentSection}>
            <View style={styles.aiCommentHeader}>
              <Text style={styles.aiCommentTitle}>
                ✨ AI 선생님의 코멘트
              </Text>
              {existingEntry.stampType && (
                <Text style={styles.stampDisplay}>
                  {existingEntry.stampType === 'excellent' && '🌟'}
                  {existingEntry.stampType === 'good' && '😊'}
                  {existingEntry.stampType === 'nice' && '👍'}
                  {existingEntry.stampType === 'keep_going' && '💪'}
                </Text>
              )}
            </View>
            <Text style={styles.aiCommentText}>{existingEntry.aiComment}</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  editorContainer: {
    flex: 1,
    padding: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    textAlignVertical: 'top',
  },
  aiCommentSection: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  aiCommentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiCommentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
  },
  stampDisplay: {
    fontSize: 24,
  },
  aiCommentText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
});
