import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Switch,
} from 'react-native';
import { Image } from 'expo-image';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { DiaryEntry } from '../models/DiaryEntry';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getStampImage, getStampColor } from '../utils/stampUtils';
import { ManuscriptPaper } from './ManuscriptPaper';
import { COLORS } from '../constants/colors';
import { WeatherService } from '../services/weatherService';

const SCREEN_WIDTH = Dimensions.get('window').width;

// 실제 캡처할 이미지 크기 (디테일 화면과 동일)
const CAPTURE_WIDTH = SCREEN_WIDTH;

// 모달 미리보기 크기 (작게 표시)
const MODAL_WIDTH = SCREEN_WIDTH - 100;
const SCALE_RATIO = MODAL_WIDTH / CAPTURE_WIDTH;

interface DiaryShareModalProps {
  visible: boolean;
  diary: DiaryEntry;
  onClose: () => void;
}

export const DiaryShareModal: React.FC<DiaryShareModalProps> = ({ visible, diary, onClose }) => {
  const viewShotRef = useRef<ViewShot>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [viewShotHeight, setViewShotHeight] = useState<number | null>(null);
  const [includeComment, setIncludeComment] = useState(true);

  // ▸ 일기/코멘트 상태가 바뀔 때마다 높이 재측정하도록 리셋
  useEffect(() => {
    setViewShotHeight(null);
  }, [diary._id, includeComment]);

  const getScaledTransform = () => {
    if (!viewShotHeight) {
      return [{ scale: SCALE_RATIO }];
    }

    const delta = viewShotHeight * (1 - SCALE_RATIO);
    return [
      // 위·아래로 줄어든 것 중 위쪽만 살짝 당겨서 top 쪽이 잘리지 않게
      { translateY: -(delta / 2) + 1 }, // +1 정도 여유
      { scale: SCALE_RATIO },
    ];
  };

  const handleSaveToGallery = async () => {
    try {
      setIsSaving(true);

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '갤러리에 저장하려면 사진 접근 권한이 필요합니다.');
        return;
      }

      if (!viewShotRef.current?.capture) throw new Error('ViewShot이 준비되지 않았습니다.');
      const uri = await viewShotRef.current.capture();
      if (!uri) throw new Error('이미지 캡처 실패');

      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('저장 완료', '갤러리에 저장되었습니다.');
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('저장 실패', '이미지 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      setIsSharing(true);

      if (!viewShotRef.current?.capture) throw new Error('ViewShot이 준비되지 않았습니다.');
      const uri = await viewShotRef.current.capture();
      if (!uri) throw new Error('이미지 캡처 실패');

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('공유 불가', '이 기기에서는 공유 기능을 사용할 수 없습니다.');
        return;
      }

      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('공유 실패', '공유 중 오류가 발생했습니다.');
    } finally {
      setIsSharing(false);
    }
  };

  const formattedDate = format(new Date(diary.date), 'yyyy년 M월 d일 EEEE', {
    locale: ko,
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* 상단 헤더 영역 */}
          <View style={styles.modalHeader}>
            <View style={styles.headerContent}>
              <View style={styles.toggleContainer}>
                <Text style={styles.toggleLabel}>선생님 코멘트</Text>
                <Switch
                  value={includeComment}
                  onValueChange={setIncludeComment}
                  trackColor={{ false: '#d1d5db', true: COLORS.secondary }}
                  thumbColor="#fff"
                  ios_backgroundColor="#d1d5db"
                  style={styles.toggleSwitch}
                />
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={28} color="#666" />
            </TouchableOpacity>
          </View>

          {/* 스크롤 가능한 프리뷰 영역 */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.previewContainer}>
              {/* 축소 + 마스크 래퍼 */}
              <View
                style={[
                  styles.scaleWrapper,
                  viewShotHeight
                    ? {
                        // ▸ 실제 높이에 scale 적용한 만큼 + 약간 여유
                        height: Math.ceil(viewShotHeight * SCALE_RATIO) + 2,
                        overflow: 'hidden',
                      }
                    : undefined,
                ]}
              >
                <View style={{ transform: getScaledTransform() }}>
                  <ViewShot
                    ref={viewShotRef}
                    options={{
                      format: 'jpg',
                      quality: 0.95,
                      width: CAPTURE_WIDTH,
                    }}
                    style={styles.viewShot}
                    onLayout={(e) => {
                      const h = e.nativeEvent.layout.height;
                      // ▸ onLayout 여러 번 들어오면 더 큰 값만 반영
                      setViewShotHeight((prev) => (prev === null ? h : Math.max(prev, h)));
                    }}
                  >
                    <View style={styles.captureRoot}>
                      <View style={styles.shareableContent}>
                        {/* 날짜와 워터마크 */}
                        <View style={styles.dateContainer}>
                          <View style={styles.dateWithWeather}>
                            <Text style={styles.dateText}>{formattedDate}</Text>
                            {diary.weather && (
                              <Text style={styles.weatherEmoji}>
                                {WeatherService.getWeatherEmoji(diary.weather)}
                              </Text>
                            )}
                          </View>
                          <Text style={styles.watermark}>하트스탬프 일기장</Text>
                        </View>

                        {/* 이미지 섹션 */}
                        {diary.imageUri &&
                          diary.imageGenerationStatus !== 'generating' &&
                          diary.imageGenerationStatus !== 'pending' && (
                            <View style={styles.imageSection}>
                              <Image
                                source={{ uri: diary.imageUri }}
                                style={styles.diaryImage}
                                contentFit="contain"
                                cachePolicy="memory-disk"
                                priority="high"
                                transition={0}
                              />
                            </View>
                          )}

                        {/* 본문 - 원고지 스타일 */}
                        <View style={styles.contentSection}>
                          <ManuscriptPaper content={diary.content} />
                        </View>

                        {/* 선생님 코멘트 */}
                        {includeComment && diary.aiComment && (
                          <View style={styles.commentSection}>
                            <View style={styles.commentHeader}>
                              <View style={styles.emojiCircle}>
                                <Ionicons name="sparkles" size={12} color="#fff" />
                              </View>
                              <Text style={styles.commentLabel}>선생님 코멘트</Text>
                            </View>
                            <Text style={styles.commentText}>{diary.aiComment}</Text>
                          </View>
                        )}

                        {/* 도장 오버레이 */}
                        {diary.stampType && (
                          <View
                            style={[
                              styles.stampOverlay,
                              {
                                top:
                                  diary.imageUri &&
                                  diary.imageGenerationStatus !== 'generating' &&
                                  diary.imageGenerationStatus !== 'pending'
                                    ? '45%'
                                    : '15%',
                              },
                            ]}
                          >
                            <Image
                              source={getStampImage(diary.stampType)}
                              style={[
                                styles.stampImageLarge,
                                { tintColor: getStampColor(diary._id) },
                              ]}
                              contentFit="contain"
                              cachePolicy="memory-disk"
                              priority="high"
                              transition={0}
                            />
                          </View>
                        )}
                      </View>
                    </View>
                  </ViewShot>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* 버튼들 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSaveToGallery}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="download-outline" size={22} color="#fff" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.shareButton]}
              onPress={handleShare}
              disabled={isSharing}
            >
              {isSharing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="share-social-outline" size={22} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: MODAL_WIDTH + 32,
    minHeight: 500,
    maxHeight: 660,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingBottom: 4,
    paddingHorizontal: 8,
  },
  modalHeader: {
    height: 56,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    position: 'relative',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  toggleSwitch: {
    transform: [{ scale: 0.8 }],
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    padding: 8,
  },
  scrollView: {},
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 0,
    flexGrow: 0,
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    paddingTop: 8,
  },
  scaleWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  viewShot: {
    backgroundColor: '#faf8f3',
    width: CAPTURE_WIDTH,
  },
  captureRoot: {
    backgroundColor: '#fffef8',
    width: CAPTURE_WIDTH,
    paddingBottom: 16,
  },
  shareableContent: {
    backgroundColor: 'transparent',
    paddingTop: 0,
    paddingHorizontal: 0,
    width: CAPTURE_WIDTH,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#faf8f3',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateWithWeather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  weatherEmoji: {
    fontSize: 18,
  },
  watermark: {
    fontSize: 11,
    color: '#999',
  },
  imageSection: {
    width: '100%',
    height: 250,
    backgroundColor: '#fff',
    marginBottom: 0,
  },
  diaryImage: {
    width: '100%',
    height: '100%',
  },
  contentSection: {
    backgroundColor: '#fffef8',
    paddingVertical: 20,
    marginBottom: 12,
  },
  stampOverlay: {
    position: 'absolute',
    right: -80,
    zIndex: 10,
  },
  stampImageLarge: {
    width: 300,
    height: 300,
    opacity: 0.65,
  },
  commentSection: {
    backgroundColor: '#F0F6FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  emojiCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#60A5FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563EB',
    flex: 1,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButton: {
    backgroundColor: COLORS.secondary,
  },
  shareButton: {
    backgroundColor: COLORS.secondary,
  },
});
