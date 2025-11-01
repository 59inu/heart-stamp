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
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { DiaryEntry, WeatherType, MoodType } from '../models/DiaryEntry';
import { RootStackParamList } from '../navigation/types';
import { apiService } from '../services/apiService';
import { DiaryStorage } from '../services/diaryStorage';
import { WeatherService } from '../services/weatherService';
import { getStampImage } from '../utils/stampUtils';
import { SurveyModal } from '../components/SurveyModal';
import { SurveyService } from '../services/surveyService';
import { SURVEY_TRIGGER_COUNT } from '../constants/survey';

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
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);

  const entryId = route.params?.entryId;
  const MAX_CHARS = 700;
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

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
        // entryId가 있으면 해당 일기 불러오기
        const entry = await DiaryStorage.getById(entryId);
        if (entry) {
          setExistingEntry(entry);
          setContent(entry.content);
          setWeather(entry.weather || null);
          setSelectedMood(entry.mood || null);
          setSelectedMoodTag(entry.moodTag || null);
          setImageUri(entry.imageUri || null);
          setSelectedDate(new Date(entry.date)); // 기존 일기의 날짜로 설정
        }
      } else {
        // entryId가 없으면 날짜로 기존 일기 확인
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const allEntries = await DiaryStorage.getAll();
        const existingForDate = allEntries.find(
          (e) => format(new Date(e.date), 'yyyy-MM-dd') === dateStr
        );

        if (existingForDate) {
          // 해당 날짜에 일기가 있으면 수정 모드로 전환
          setExistingEntry(existingForDate);
          setContent(existingForDate.content);
          setWeather(existingForDate.weather || null);
          setSelectedMood(existingForDate.mood || null);
          setSelectedMoodTag(existingForDate.moodTag || null);
          setImageUri(existingForDate.imageUri || null);
        } else {
          // 새 일기: 자동으로 현재 날씨 가져오기
          fetchWeather();
        }
      }
    };
    loadEntry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId]);


  const fetchWeather = async () => {
    setLoadingWeather(true);
    const currentWeather = await WeatherService.getCurrentWeather();
    if (currentWeather) {
      setWeather(currentWeather);
    }
    setLoadingWeather(false);
  };

  const pickImage = async () => {
    // 권한 요청
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
      return;
    }

    // 이미지 선택
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7, // 압축 품질
    });

    if (!result.canceled && result.assets[0]) {
      const selectedImage = result.assets[0];

      // 파일 크기 체크
      if (selectedImage.fileSize && selectedImage.fileSize > MAX_IMAGE_SIZE) {
        Alert.alert(
          '파일 크기 초과',
          `이미지 크기는 최대 5MB까지 가능합니다.\n현재 크기: ${(selectedImage.fileSize / 1024 / 1024).toFixed(2)}MB`
        );
        return;
      }

      // 서버에 이미지 업로드
      setUploadingImage(true);
      const serverImageUrl = await apiService.uploadImage(selectedImage.uri);
      setUploadingImage(false);

      if (serverImageUrl) {
        setImageUri(serverImageUrl);
      } else {
        Alert.alert('업로드 실패', '이미지 업로드에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  const removeImage = () => {
    Alert.alert(
      '이미지 삭제',
      '사진을 삭제하시겠어요?',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => setImageUri(null),
        },
      ]
    );
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
        imageUri: imageUri || undefined,
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
        imageUri: imageUri || undefined,
        syncedWithServer: false,
      });

      // 새 일기 작성 시에만 카운트 증가
      const newCount = await SurveyService.incrementDiaryCount();
      console.log(`📝 일기 작성 횟수: ${newCount}`);
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

    // 설문조사 모달 체크 (새 일기 작성 시에만)
    if (!existingEntry) {
      const hasShown = await SurveyService.hasShownSurvey();
      const diaryCount = await SurveyService.getDiaryWriteCount();

      if (!hasShown && diaryCount >= SURVEY_TRIGGER_COUNT) {
        // 저장 완료 알림 후 설문조사 모달 표시
        setTimeout(() => {
          setShowSurveyModal(true);
        }, 500);
      }
    }

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

  const handleSurveyClose = async () => {
    await SurveyService.markSurveyShown();
    setShowSurveyModal(false);
  };

  const handleSurveyParticipate = async () => {
    await SurveyService.markSurveyShown();
    await SurveyService.markSurveyCompleted();
    setShowSurveyModal(false);
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
            {format(existingEntry ? new Date(existingEntry.date) : selectedDate, 'yyyy년 MM월 dd일 (E)', { locale: ko })}
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

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* 이미지 영역 */}
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={pickImage}
            activeOpacity={0.7}
            disabled={uploadingImage}
          >
            <Image
              source={
                imageUri
                  ? { uri: imageUri }
                  : require('../../assets/image-placeholder.png')
              }
              style={[
                styles.diaryImage,
                !imageUri && styles.placeholderImage,
              ]}
              resizeMode={imageUri ? 'cover' : 'contain'}
            />
            {uploadingImage && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.uploadingText}>업로드 중...</Text>
              </View>
            )}
            {!imageUri && !uploadingImage && (
              <View style={styles.imagePlaceholderOverlay}>
                <Text style={styles.imagePlaceholderText}>탭하여 사진 추가</Text>
              </View>
            )}
            {imageUri && !uploadingImage && (
              <TouchableOpacity
                style={styles.imageDeleteButton}
                onPress={removeImage}
                activeOpacity={0.7}
              >
                <Text style={styles.imageDeleteIcon}>×</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

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
        </ScrollView>
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
                  // 다른 신호등으로 변경할 때만 태그 리셋
                  if (selectedMood !== 'red') {
                    setSelectedMoodTag(null);
                  }
                  setSelectedMood('red');
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
                  // 다른 신호등으로 변경할 때만 태그 리셋
                  if (selectedMood !== 'yellow') {
                    setSelectedMoodTag(null);
                  }
                  setSelectedMood('yellow');
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
                  // 다른 신호등으로 변경할 때만 태그 리셋
                  if (selectedMood !== 'green') {
                    setSelectedMoodTag(null);
                  }
                  setSelectedMood('green');
                }}
              >
                <View style={styles.trafficLightCircle} />
              </TouchableOpacity>
            </View>

            {/* 감정 태그 */}
            {selectedMood ? (
              <ScrollView style={styles.moodTagScroll}>
                <View style={styles.moodTagContainer}>
                  {moodTags[selectedMood].map((tag) => {
                    const isSelected = selectedMoodTag === tag;
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[
                          styles.moodTag,
                          isSelected && styles.moodTagSelected,
                        ]}
                        onPress={() => setSelectedMoodTag(tag)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.moodTagText,
                            isSelected && styles.moodTagTextSelected,
                          ]}
                        >
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            ) : (
              <Text style={styles.moodTagPlaceholder}>신호등을 선택해주세요</Text>
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

      {/* 설문조사 모달 */}
      <SurveyModal
        visible={showSurveyModal}
        onClose={handleSurveyClose}
        onParticipate={handleSurveyParticipate}
      />
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
  scrollContent: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  diaryImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    opacity: 0.3,
  },
  imagePlaceholderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  imageDeleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageDeleteIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '400',
    lineHeight: 24,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    marginTop: 12,
    fontSize: 14,
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
  moodTagPlaceholder: {
    textAlign: 'center',
    fontSize: 14,
    color: '#999',
    paddingVertical: 20,
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
