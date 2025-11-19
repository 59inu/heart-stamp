import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { RootStackParamList } from '../../navigation/types';
import { WeatherType } from '../../models/DiaryEntry';
import { SurveyModal } from '../../components/SurveyModal';
import { SurveyService } from '../../services/surveyService';
import { logger } from '../../utils/logger';
import { useLoadEntry } from './hooks/useLoadEntry';
import { useWeather } from './hooks/useWeather';
import { useImagePicker } from './hooks/useImagePicker';
import { useDiarySave } from './hooks/useDiarySave';
import { MoodModal } from './components/MoodModal';
import { WeatherSection } from './components/WeatherSection';
import { ImageSection } from './components/ImageSection';

type NavigationProp = StackNavigationProp<RootStackParamList, 'DiaryWrite'>;
type DiaryWriteRouteProp = RouteProp<RootStackParamList, 'DiaryWrite'>;

export const DiaryWriteScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DiaryWriteRouteProp>();

  const [selectedDate] = useState(route.params?.date || new Date());
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [weather, setWeather] = useState<WeatherType | null>(null);
  const [aiGenerateSelected, setAiGenerateSelected] = useState(false);

  const entryId = route.params?.entryId;
  const MAX_CHARS = 700;

  // Weather hook을 먼저 선언
  const weatherHook = useWeather(setWeather);

  // fetchWeather를 useCallback으로 감싸서 참조 안정화
  const fetchWeather = useCallback(async () => {
    await weatherHook.fetchWeather();
  }, [weatherHook.fetchWeather]);

  // Custom hooks
  const {
    content,
    setContent,
    existingEntry,
    selectedMood,
    setSelectedMood,
    selectedMoodTag,
    setSelectedMoodTag,
    imageUri,
    setImageUri,
    loadingEntry,
  } = useLoadEntry({
    entryId,
    selectedDate,
    fetchWeather,
    setWeather,
  });

  const {
    uploadingImage,
    loadingImage,
    setLoadingImage,
    pickImage,
    removeImage,
  } = useImagePicker(imageUri, setImageUri);

  const handleSaveComplete = (shouldShowSurvey: boolean) => {
    if (shouldShowSurvey) {
      setShowSurveyModal(true);
    } else {
      navigation.goBack();
    }
  };

  const {
    showMoodModal,
    setShowMoodModal,
    handleSave,
    handleMoodSave,
  } = useDiarySave({
    existingEntry,
    selectedDate,
    content,
    weather,
    selectedMood,
    selectedMoodTag,
    imageUri,
    onSaveComplete: handleSaveComplete,
  });

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

  const handleMoodSelect = (mood: 'red' | 'yellow' | 'green') => {
    setSelectedMood(mood);
  };

  const handleAIImageGenerate = () => {
    setAiGenerateSelected(true);
    Alert.alert(
      '',
      '일기를 쓰고 저장하면 어울리는 그림을 그려올게요',
      [{ text: '확인' }]
    );
  };

  const handleImagePick = () => {
    setAiGenerateSelected(false);
    pickImage();
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
          <WeatherSection
            weather={weather}
            loadingWeather={weatherHook.loadingWeather}
            onWeatherSelect={setWeather}
          />

          {/* 이미지 영역 */}
          <ImageSection
            imageUri={imageUri}
            uploadingImage={uploadingImage}
            loadingImage={loadingImage}
            loadingEntry={loadingEntry}
            onImagePick={handleImagePick}
            onImageRemove={removeImage}
            onLoadStart={() => setLoadingImage(true)}
            onLoad={() => {
              logger.log('✅ 이미지 로드 성공:', imageUri);
              setLoadingImage(false);
            }}
            onError={(error) => {
              logger.error('❌ 이미지 로드 실패:', imageUri, error);
              setLoadingImage(false);
            }}
            isEditMode={!!entryId}
            onAIGenerate={handleAIImageGenerate}
            aiGenerateSelected={aiGenerateSelected}
          />

          <View style={styles.editorContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="오늘 하루는 어땠나요?"
              placeholderTextColor="#999"
              multiline
              value={content}
              onChangeText={(text) => {
                if (text.length > MAX_CHARS) {
                  Toast.show({
                    type: 'info',
                    text1: '글자수 제한',
                    text2: '700자까지 작성할 수 있습니다',
                    position: 'bottom',
                    visibilityTime: 2000,
                  });
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
      <MoodModal
        visible={showMoodModal}
        selectedMood={selectedMood}
        selectedMoodTag={selectedMoodTag}
        onMoodSelect={handleMoodSelect}
        onTagSelect={setSelectedMoodTag}
        onCancel={() => setShowMoodModal(false)}
        onSave={handleMoodSave}
      />

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
});
