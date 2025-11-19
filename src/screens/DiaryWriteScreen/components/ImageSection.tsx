import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '../../../utils/logger';
import { COLORS } from '../../../constants/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_HEIGHT = (SCREEN_WIDTH * 3) / 5; // 3:5 비율
const PLACEHOLDER_HEIGHT = 80; // 플레이스홀더 높이 (작게)

interface ImageSectionProps {
  imageUri: string | null;
  uploadingImage: boolean;
  loadingImage: boolean;
  loadingEntry: boolean;
  onImagePick: () => void;
  onImageRemove: () => void;
  onLoadStart: () => void;
  onLoad: () => void;
  onError: (error: any) => void;
  isEditMode?: boolean;
  onAIGenerate?: () => void;
  aiGenerateSelected?: boolean;
}

export const ImageSection: React.FC<ImageSectionProps> = ({
  imageUri,
  uploadingImage,
  loadingImage,
  loadingEntry,
  onImagePick,
  onImageRemove,
  onLoadStart,
  onLoad,
  onError,
  isEditMode = false,
  onAIGenerate,
  aiGenerateSelected = false,
}) => {
  // 이미지가 있을 때
  if (imageUri) {
    return (
      <TouchableOpacity
        style={[styles.imageContainer, { height: IMAGE_HEIGHT }]}
        onPress={onImagePick}
        activeOpacity={0.7}
        disabled={uploadingImage}
      >
        {loadingEntry ? (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.buttonSecondaryBackground} />
          </View>
        ) : (
          <Image
            source={{ uri: imageUri }}
            style={styles.diaryImage}
            contentFit="contain"
            transition={200}
            placeholder={require('../../../../assets/image-placeholder.png')}
            placeholderContentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
          />
        )}
        {uploadingImage && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.buttonSecondaryBackground} />
            <Text style={styles.uploadingText}>업로드 중...</Text>
          </View>
        )}
        {!uploadingImage && (
          <TouchableOpacity
            style={styles.imageDeleteButton}
            onPress={onImageRemove}
            activeOpacity={0.7}
          >
            <Text style={styles.imageDeleteIcon}>×</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  // 이미지가 없을 때
  return (
    <View style={[styles.buttonContainer, { height: PLACEHOLDER_HEIGHT }]}>
      {/* AI 생성 버튼 표시 */}
      {onAIGenerate && (
        <>
          <TouchableOpacity
            style={[
              styles.button,
              styles.aiButton,
              aiGenerateSelected && styles.aiButtonSelected,
            ]}
            onPress={onAIGenerate}
            activeOpacity={0.7}
            disabled={uploadingImage}
          >
            <Ionicons
              name="sparkles"
              size={20}
              color={COLORS.emotionPositive}
              style={styles.buttonIcon}
            />
            <Text style={[styles.buttonText, aiGenerateSelected && styles.buttonTextSelected]}>
              그림일기 만들기
            </Text>
          </TouchableOpacity>
          <View style={styles.buttonSpacer} />
        </>
      )}
      <TouchableOpacity
        style={[styles.button, styles.galleryButton]}
        onPress={onImagePick}
        activeOpacity={0.7}
        disabled={uploadingImage}
      >
        <Ionicons name="images" size={20} color={COLORS.secondary} style={styles.buttonIcon} />
        <Text style={styles.buttonText}>갤러리에서 선택</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    width: '100%',
    backgroundColor: '#fff',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  diaryImage: {
    width: '100%',
    height: '100%',
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  buttonSpacer: {
    width: 8,
  },
  aiButton: {},
  aiButtonSelected: {
    backgroundColor: COLORS.emotionPositiveStrong,
  },
  galleryButton: {},
  fullWidth: {
    flex: 1,
  },
  buttonIcon: {
    marginBottom: 4,
  },
  buttonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  buttonTextSelected: {
    color: COLORS.emotionPositive,
    fontWeight: '600',
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
});
