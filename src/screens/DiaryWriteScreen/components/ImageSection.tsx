import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { logger } from '../../../utils/logger';
import { COLORS } from '../../../constants/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_HEIGHT = (SCREEN_WIDTH * 3) / 5; // 3:5 비율

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
}) => {
  return (
    <TouchableOpacity
      style={styles.imageContainer}
      onPress={onImagePick}
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
            onLoadStart={onLoadStart}
            onLoad={onLoad}
            onError={onError}
          />
          {loadingImage && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.buttonSecondaryBackground} />
            </View>
          )}
        </>
      ) : (
        <Image
          source={require('../../../../assets/image-placeholder.png')}
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
          onPress={onImageRemove}
          activeOpacity={0.7}
        >
          <Text style={styles.imageDeleteIcon}>×</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
});
