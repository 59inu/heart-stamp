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
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DiaryEntry, WeatherType } from '../models/DiaryEntry';
import { RootStackParamList } from '../navigation/types';
import { apiService } from '../services/apiService';
import { DiaryStorage } from '../services/diaryStorage';
import { WeatherService } from '../services/weatherService';
import { getStampImage } from '../utils/stampUtils';

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
  const [weather, setWeather] = useState<WeatherType | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  const entryId = route.params?.entryId;

  const weatherOptions: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'snowy', 'stormy'];

  useEffect(() => {
    const loadEntry = async () => {
      if (entryId) {
        const entry = await DiaryStorage.getById(entryId);
        if (entry) {
          setExistingEntry(entry);
          setContent(entry.content);
          setSelectedDate(new Date(entry.date));
          setWeather(entry.weather || null);
        }
      } else {
        // 새 일기: 자동으로 현재 날씨 가져오기
        fetchWeather();
      }
    };
    loadEntry();
  }, [entryId]);

  const fetchWeather = async () => {
    setLoadingWeather(true);
    const currentWeather = await WeatherService.getCurrentWeather();
    if (currentWeather) {
      setWeather(currentWeather);
    }
    setLoadingWeather(false);
  };

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('알림', '일기 내용을 입력해주세요.');
      return;
    }

    let savedEntry: DiaryEntry;

    if (existingEntry) {
      const updated = await DiaryStorage.update(existingEntry._id, {
        content,
        weather: weather || undefined,
        syncedWithServer: false,
      });
      savedEntry = updated!;
    } else {
      savedEntry = await DiaryStorage.create({
        date: selectedDate.toISOString(),
        content,
        weather: weather || undefined,
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

    // 과거 날짜인지 확인
    const today = format(new Date(), 'yyyy-MM-dd');
    const diaryDate = format(selectedDate, 'yyyy-MM-dd');
    const isPastDate = diaryDate < today;

    const message = isPastDate
      ? '일기가 저장되었습니다.\n분명 훗날 읽으며 웃고 울게 될거에요.'
      : '일기가 저장되었습니다.\n밤 사이 선생님이 코멘트를 달아줄 거예요! 🌙';

    Alert.alert('저장 완료', message, [
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

        <View style={styles.weatherSection}>
          <Text style={styles.weatherLabel}>날씨</Text>
          {loadingWeather ? (
            <ActivityIndicator size="small" color="#4CAF50" />
          ) : (
            <View style={styles.weatherButtons}>
              {weatherOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.weatherButton,
                    weather === option && styles.weatherButtonSelected,
                  ]}
                  onPress={() => setWeather(option)}
                >
                  <Text style={styles.weatherEmoji}>
                    {WeatherService.getWeatherEmoji(option)}
                  </Text>
                  <Text
                    style={[
                      styles.weatherText,
                      weather === option && styles.weatherTextSelected,
                    ]}
                  >
                    {WeatherService.getWeatherLabel(option)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
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
                ✨ 선생님의 코멘트
              </Text>
              {existingEntry.stampType && (
                <Image
                  source={getStampImage(existingEntry.stampType)}
                  style={styles.stampDisplay}
                  resizeMode="contain"
                />
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
  weatherSection: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  weatherLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  weatherButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weatherButton: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    minWidth: 60,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  weatherButtonSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
  },
  weatherEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  weatherText: {
    fontSize: 12,
    color: '#666',
  },
  weatherTextSelected: {
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
    width: 32,
    height: 32,
  },
  aiCommentText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
});
