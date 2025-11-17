import { useState } from 'react';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { ImageCache } from '../../../services/imageCache';
import { logger } from '../../../utils/logger';

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_IMAGE_WIDTH = 1200; // 최대 너비 (리사이징)

interface UseImagePickerReturn {
  uploadingImage: boolean;
  loadingImage: boolean;
  setLoadingImage: (loading: boolean) => void;
  pickImage: () => Promise<void>;
  removeImage: () => void;
}

export const useImagePicker = (
  imageUri: string | null,
  setImageUri: (uri: string | null) => void
): UseImagePickerReturn => {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);

  const pickImage = async () => {
    // 권한 요청
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
      return;
    }

    // 이미지 선택
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7, // 압축 품질
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      const selectedImage = pickerResult.assets[0];

      logger.log('📸 [useImagePicker] Selected image:', {
        uri: selectedImage.uri,
        width: selectedImage.width,
        height: selectedImage.height,
        fileSize: selectedImage.fileSize,
      });

      // URI 유효성 체크
      if (!selectedImage.uri || selectedImage.uri.trim() === '') {
        Alert.alert('오류', '이미지 URI가 유효하지 않습니다.');
        return;
      }

      try {
        setUploadingImage(true);

        // 1. 이미지 리사이징 (너비가 MAX_IMAGE_WIDTH보다 크면 축소)
        let processedUri = selectedImage.uri;
        if (selectedImage.width && selectedImage.width > MAX_IMAGE_WIDTH) {
          logger.log(`🔧 [useImagePicker] Resizing image from ${selectedImage.width}px to ${MAX_IMAGE_WIDTH}px`);
          const manipResult = await ImageManipulator.manipulateAsync(
            selectedImage.uri,
            [{ resize: { width: MAX_IMAGE_WIDTH } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
          );
          processedUri = manipResult.uri;
          logger.log(`✅ [useImagePicker] Image resized: ${manipResult.width}x${manipResult.height}`);
        } else {
          // 리사이징 불필요하지만 압축은 적용
          logger.log('🔧 [useImagePicker] Compressing image...');
          const manipResult = await ImageManipulator.manipulateAsync(
            selectedImage.uri,
            [],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
          );
          processedUri = manipResult.uri;
        }

        // 2. 로컬에 저장하고 S3 업로드 시작
        logger.log('💾 [useImagePicker] Saving image locally and uploading to S3...');
        const localUri = await ImageCache.saveAndUpload(
          processedUri,
          (serverUrl) => {
            // 3. S3 업로드 성공 시 URL 설정하고 로딩 종료
            logger.log('✅ [useImagePicker] S3 upload complete:', serverUrl);
            setImageUri(serverUrl);
            setUploadingImage(false);
          },
          (error) => {
            // 4. S3 업로드 실패 시 사용자에게 알리고 로딩 종료
            logger.error('❌ [useImagePicker] S3 upload failed:', error);
            setUploadingImage(false);
            Toast.show({
              type: 'error',
              text1: '이미지 업로드 실패',
              text2: error,
              position: 'bottom',
              visibilityTime: 3000,
            });
          }
        );

        // 로컬 이미지를 먼저 표시하고 업로드는 백그라운드에서 진행
        setImageUri(localUri);
        // uploadingImage는 S3 업로드 완료/실패 시 콜백에서 false로 설정

        // 4. saveAndUpload는 백그라운드에서 진행되므로
        //    로딩 스피너는 S3 업로드 완료 시(콜백)까지 유지
      } catch (error: any) {
        setUploadingImage(false);
        logger.error('❌ [useImagePicker] Error saving image:', error);

        Toast.show({
          type: 'error',
          text1: '이미지 저장 실패',
          text2: '다시 시도해주세요',
          position: 'bottom',
          visibilityTime: 3000,
        });
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

  return {
    uploadingImage,
    loadingImage,
    setLoadingImage,
    pickImage,
    removeImage,
  };
};
