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
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DiaryEntry, WeatherType, MoodType } from '../models/DiaryEntry';
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
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [selectedMoodTag, setSelectedMoodTag] = useState<string | null>(null);

  const entryId = route.params?.entryId;
  const MAX_CHARS = 700;

  const weatherOptions: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'snowy', 'stormy'];

  // 감정 태그 매핑
  const moodTags: Record<MoodType, string[]> = {
    red: ['속상해요', '화나요', '짜증나요', '우울해요', '피곤해요', '지쳐요', '불안해요', '외로워요'],
    yellow: ['그저그래요', '무덤덤해요', '복잡해요', '애매해요', '어색해요', '심심해요', '권태로워요', '멍해요'],
    green: ['행복해요', '기뻐요', '즐거워요', '신나요', '평온해요', '만족해요', '감사해요', '설레요'],
  };

  useEffect(() => {
    const loadEntry = async () => {
      if (entryId) {
        const entry = await DiaryStorage.getById(entryId);
        if (entry) {
          setExistingEntry(entry);
          setContent(entry.content);
          setSelectedDate(new Date(entry.date));
          setWeather(entry.weather || null);
          setSelectedMood(entry.mood || null);
          setSelectedMoodTag(entry.moodTag || null);
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

  const handleSave = () => {
    if (!content.trim()) {
      Alert.alert('알림', '일기 내용을 입력해주세요.');
      return;
    }

    // 기분 선택 모달 표시
    setShowMoodModal(true);
  };

  const handleMoodSave = async () => {
    let savedEntry: DiaryEntry;

    if (existingEntry) {
      const updated = await DiaryStorage.update(existingEntry._id, {
        content,
        weather: weather || undefined,
        mood: selectedMood || undefined,
        moodTag: selectedMoodTag || undefined,
        syncedWithServer: false,
      });
      savedEntry = updated!;
    } else {
      savedEntry = await DiaryStorage.create({
        date: selectedDate.toISOString(),
        content,
        weather: weather || undefined,
        mood: selectedMood || undefined,
        moodTag: selectedMoodTag || undefined,
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

    // 모달 닫기
    setShowMoodModal(false);

    // 과거 날짜인지 확인
    const today = format(new Date(), 'yyyy-MM-dd');
    const diaryDate = format(selectedDate, 'yyyy-MM-dd');
    const isPastDate = diaryDate < today;

    const message = isPastDate
      ? '일기가 저장되었습니다.\n분명 훗날 읽으며 웃고 울게 될거에요. 💚'
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
            maxLength={MAX_CHARS}
            autoFocus
          />
          <View style={styles.charCountContainer}>
            <Text style={styles.charCount}>
              {content.length} / {MAX_CHARS}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* 기분 선택 모달 */}
      <Modal
        visible={showMoodModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMoodModal(false)}
      >
        <View style={styles.moodModalOverlay}>
          <View style={styles.moodModalContent}>
            <Text style={styles.moodModalTitle}>오늘의 기분은 어땠어요?</Text>

            {/* 신호등 선택 */}
            <View style={styles.trafficLightSection}>
              <TouchableOpacity
                style={[
                  styles.trafficLight,
                  selectedMood === 'red' ? styles.trafficLightRedSelected : styles.trafficLightRed,
                ]}
                onPress={() => {
                  setSelectedMood('red');
                  setSelectedMoodTag(null);
                }}
              >
                <View style={styles.trafficLightCircle} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.trafficLight,
                  selectedMood === 'yellow' ? styles.trafficLightYellowSelected : styles.trafficLightYellow,
                ]}
                onPress={() => {
                  setSelectedMood('yellow');
                  setSelectedMoodTag(null);
                }}
              >
                <View style={styles.trafficLightCircle} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.trafficLight,
                  selectedMood === 'green' ? styles.trafficLightGreenSelected : styles.trafficLightGreen,
                ]}
                onPress={() => {
                  setSelectedMood('green');
                  setSelectedMoodTag(null);
                }}
              >
                <View style={styles.trafficLightCircle} />
              </TouchableOpacity>
            </View>

            {/* 감정 태그 */}
            {selectedMood && (
              <ScrollView style={styles.moodTagScroll}>
                <View style={styles.moodTagContainer}>
                  {moodTags[selectedMood].map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.moodTag,
                        selectedMoodTag === tag && styles.moodTagSelected,
                      ]}
                      onPress={() => setSelectedMoodTag(tag)}
                    >
                      <Text
                        style={[
                          styles.moodTagText,
                          selectedMoodTag === tag && styles.moodTagTextSelected,
                        ]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}

            {/* 버튼 */}
            <View style={styles.moodModalButtons}>
              <TouchableOpacity
                style={styles.moodModalButtonCancel}
                onPress={() => setShowMoodModal(false)}
              >
                <Text style={styles.moodModalButtonCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.moodModalButtonSave}
                onPress={handleMoodSave}
              >
                <Text style={styles.moodModalButtonSaveText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  charCountContainer: {
    alignItems: 'flex-end',
    paddingTop: 8,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
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
  moodModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  moodModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  moodModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  trafficLightSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  trafficLight: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'transparent',
  },
  trafficLightCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
  },
  trafficLightRed: {
    backgroundColor: '#FFB3BA',
  },
  trafficLightYellow: {
    backgroundColor: '#FFF4B0',
  },
  trafficLightGreen: {
    backgroundColor: '#B4E7CE',
  },
  trafficLightRedSelected: {
    backgroundColor: '#FF8A94',
    shadowColor: '#FF8A94',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 12,
  },
  trafficLightYellowSelected: {
    backgroundColor: '#FFE87C',
    shadowColor: '#FFE87C',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 12,
  },
  trafficLightGreenSelected: {
    backgroundColor: '#8AD9B5',
    shadowColor: '#8AD9B5',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 12,
  },
  moodTagScroll: {
    maxHeight: 200,
  },
  moodTagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  moodTag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  moodTagSelected: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4CAF50',
  },
  moodTagText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  moodTagTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  moodModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  moodModalButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
  },
  moodModalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  moodModalButtonSave: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    alignItems: 'center',
  },
  moodModalButtonSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
