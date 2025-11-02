import React, { useState, useEffect, useCallback } from 'react';
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
  Dimensions,
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
import { logger } from '../utils/logger';
import { COLORS } from '../constants/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_HEIGHT = (SCREEN_WIDTH * 3) / 5; // 3:5 비율

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
  const [loadingImage, setLoadingImage] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);

  const entryId = route.params?.entryId;
  const MAX_CHARS = 700;
  const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

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
        setLoadingEntry(true);
        // entryId가 있으면 해당 일기 불러오기
        const entry = await DiaryStorage.getById(entryId);
        if (entry) {
          setExistingEntry(entry);
          setContent(entry.content);
          setWeather(entry.weather || null);
          setSelectedMood(entry.mood || null);
          setSelectedMoodTag(entry.moodTag || null);

          // 이미지 URI 로드 및 로깅
          const loadedImageUri = entry.imageUri || null;
          logger.log('📸 이미지 URI 로드:', loadedImageUri);
          setImageUri(loadedImageUri);

          setSelectedDate(new Date(entry.date)); // 기존 일기의 날짜로 설정
        }
        setLoadingEntry(false);
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
          // 새 일기: 오늘 날짜일 때만 자동으로 현재 날씨 가져오기
          const today = format(new Date(), 'yyyy-MM-dd');
          const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
          if (selectedDateStr === today) {
            fetchWeather();
          }
        }
      }
    };
    loadEntry();
  }, [entryId]);


  const fetchWeather = useCallback(async () => {
    setLoadingWeather(true);
    const currentWeather = await WeatherService.getCurrentWeather();
    if (currentWeather) {
      setWeather(currentWeather);
    }
    setLoadingWeather(false);
  }, []);

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
      allowsEditing: false,
      quality: 0.7, // 압축 품질
    });

    if (!result.canceled && result.assets[0]) {
      const selectedImage = result.assets[0];

      // 파일 크기 체크
      if (selectedImage.fileSize && selectedImage.fileSize > MAX_IMAGE_SIZE) {
        Alert.alert(
          '파일 크기 초과',
          `이미지 크기는 최대 2MB까지 가능합니다.\n현재 크기: ${(selectedImage.fileSize / 1024 / 1024).toFixed(2)}MB`
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
    // 최초 작성 시 기본값 설정 (긍정 = green)
    if (!existingEntry && !selectedMood) {
      setSelectedMood('green');
    }
    setShowMoodModal(true);
  };

  const handleMoodSave = async () => {
    logger.debug('저장 시 선택된 mood:', selectedMood);
    logger.debug('저장 시 선택된 moodTag:', selectedMoodTag);

    let savedEntry: DiaryEntry;

    if (existingEntry) {
      const updateData = {
        content,
        weather: weather || undefined,
        mood: selectedMood || undefined,
        moodTag: selectedMoodTag || undefined,
        imageUri: imageUri || undefined,
        syncedWithServer: false,
      };
      logger.debug('업데이트할 데이터:', updateData);
      const updated = await DiaryStorage.update(existingEntry._id, updateData);
      logger.debug('업데이트된 엔트리:', updated);
      savedEntry = updated!;
    } else {
      const createData = {
        date: selectedDate.toISOString(),
        content,
        weather: weather || undefined,
        mood: selectedMood || undefined,
        moodTag: selectedMoodTag || undefined,
        imageUri: imageUri || undefined,
        syncedWithServer: false,
      };
      logger.debug('생성할 데이터:', createData);
      savedEntry = await DiaryStorage.create(createData);
      logger.debug('생성된 엔트리:', savedEntry);

      // 새 일기 작성 시에만 카운트 증가
      const newCount = await SurveyService.incrementDiaryCount();
      logger.log(`📝 일기 작성 횟수: ${newCount}`);
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
    let shouldShowSurvey = false;
    if (!existingEntry) {
      const hasShown = await SurveyService.hasShownSurvey();
      const diaryCount = await SurveyService.getDiaryWriteCount();

      if (!hasShown && diaryCount >= SURVEY_TRIGGER_COUNT) {
        shouldShowSurvey = true;
      }
    }

    // 과거 날짜인지 확인
    const today = format(new Date(), 'yyyy-MM-dd');
    const diaryDate = format(selectedDate, 'yyyy-MM-dd');
    const isPastDate = diaryDate < today;

    const message = isPastDate
      ? '일기가 저장되었습니다.\n분명 훗날 읽으며 웃고 울게 될거에요. 💚'
      : '일기가 저장되었습니다.\n밤 사이 선생님이 코멘트를 달아줄 거예요! 🌙';

    // 저장 완료 Alert 먼저 표시
    Alert.alert('저장 완료', message, [
      {
        text: '확인',
        onPress: () => {
          if (shouldShowSurvey) {
            // 설문 조건 충족 시 설문 모달 표시
            setShowSurveyModal(true);
          } else {
            // 설문 없으면 바로 goBack
            navigation.goBack();
          }
        },
      },
    ]);
  };

  const handleSurveyClose = async () => {
    await SurveyService.markSurveyShown();
    setShowSurveyModal(false);
    navigation.goBack();
  };

  const handleSurveyParticipate = async () => {
    await SurveyService.markSurveyShown();
    setShowSurveyModal(false);
    navigation.goBack();
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

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* 날씨 섹션 */}
          <View style={styles.weatherSection}>
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
            {loadingWeather && (
              <View style={styles.loadingIndicator}>
                <ActivityIndicator size="small" color={COLORS.buttonSecondaryBackground} />
              </View>
            )}
          </View>

          {/* 이미지 영역 */}
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={pickImage}
            activeOpacity={0.7}
            disabled={uploadingImage}
          >
            {loadingEntry ? (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color={COLORS.buttonSecondaryBackground} />
              </View>
            ) : imageUri ? (
              <>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.diaryImage}
                  resizeMode="contain"
                  onLoadStart={() => setLoadingImage(true)}
                  onLoad={() => {
                    logger.log('✅ 이미지 로드 성공:', imageUri);
                    setLoadingImage(false);
                  }}
                  onError={(error) => {
                    logger.error('❌ 이미지 로드 실패:', imageUri, error);
                    setLoadingImage(false);
                  }}
                />
                {loadingImage && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="large" color={COLORS.buttonSecondaryBackground} />
                  </View>
                )}
              </>
            ) : (
              <Image
                source={require('../../assets/image-placeholder.png')}
                style={[styles.diaryImage, styles.placeholderImage]}
                resizeMode="contain"
              />
            )}
            {uploadingImage && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color={COLORS.buttonSecondaryBackground} />
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
              onChangeText={(text) => {
                if (text.length > MAX_CHARS) {
                  Alert.alert('글자수 제한', '700자까지 작성할 수 있습니다.');
                  return;
                }
                setContent(text);
              }}
              maxLength={MAX_CHARS}
              autoFocus
            />
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
                testID="traffic-light-red"
                style={[
                  styles.trafficLight,
                  selectedMood === 'red' ? styles.trafficLightRedSelected : styles.trafficLightRed,
                ]}
                onPress={() => setSelectedMood('red')}
              >
                <View style={styles.trafficLightCircle} />
              </TouchableOpacity>

              <TouchableOpacity
                testID="traffic-light-yellow"
                style={[
                  styles.trafficLight,
                  selectedMood === 'yellow' ? styles.trafficLightYellowSelected : styles.trafficLightYellow,
                ]}
                onPress={() => setSelectedMood('yellow')}
              >
                <View style={styles.trafficLightCircle} />
              </TouchableOpacity>

              <TouchableOpacity
                testID="traffic-light-green"
                style={[
                  styles.trafficLight,
                  selectedMood === 'green' ? styles.trafficLightGreenSelected : styles.trafficLightGreen,
                ]}
                onPress={() => setSelectedMood('green')}
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
                        onPress={() => {
                          logger.debug('[태그 클릭]', tag, '/ 현재 선택:', selectedMoodTag, '/ isSelected:', isSelected);
                          setSelectedMoodTag(tag);
                        }}
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
                testID="mood-modal-save-button"
                style={[
                  styles.moodModalButtonSave,
                  (!selectedMood || !selectedMoodTag) && styles.moodModalButtonDisabled
                ]}
                onPress={handleMoodSave}
                disabled={!selectedMood || !selectedMoodTag}
              >
                <Text style={[
                  styles.moodModalButtonSaveText,
                  (!selectedMood || !selectedMoodTag) && styles.moodModalButtonTextDisabled
                ]}>저장</Text>
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
    backgroundColor: '#fff',
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    color: '#4B5563',
    fontWeight: 'bold',
  },
  scrollContent: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: '#f5f5f5',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  diaryImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    opacity: 0.3,
    width: '80%',
    height: '80%',
  },
  imagePlaceholderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  imagePlaceholderText: {
    fontSize: 15,
    color: '#666',
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
    color: COLORS.buttonSecondaryBackground,
    fontWeight: '600',
  },
  weatherSection: {
    padding: 16,
    backgroundColor: COLORS.buttonBackground,
  },
  loadingIndicator: {
    marginTop: 8,
    alignItems: 'center',
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
    marginTop: 8,
    marginBottom: 4,
  },
  weatherButton: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    minWidth: 60,
    backgroundColor: '#fff',
    shadowColor: COLORS.buttonText,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  weatherButtonSelected: {
    backgroundColor: COLORS.primaryLight,
    shadowColor: COLORS.buttonText,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.35,
    shadowRadius: 4.65,
    elevation: 8,
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
    color: '#333',
    fontWeight: '700',
  },
  editorContainer: {
    padding: 16,
    paddingBottom: 100,
    minHeight: 300,
  },
  textInput: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 300,
  },
  aiCommentSection: {
    backgroundColor: COLORS.secondaryLight,
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
    color: COLORS.secondary,
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
    marginBottom: 32,
  },
  trafficLight: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'transparent',
  },
  trafficLightCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    backgroundColor: COLORS.buttonSecondaryBackground,
    borderColor: COLORS.buttonSecondaryBackground,
  },
  moodTagText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  moodTagTextSelected: {
    color: COLORS.buttonSecondaryText,
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
    backgroundColor: COLORS.buttonSecondaryBackground,
    borderRadius: 12,
    alignItems: 'center',
  },
  moodModalButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  moodModalButtonSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  moodModalButtonTextDisabled: {
    color: '#999',
  },
});
