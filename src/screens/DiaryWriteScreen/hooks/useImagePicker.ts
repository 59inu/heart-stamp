import { useState } from 'react';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import { ImageCache } from '../../../services/imageCache';
import { logger } from '../../../utils/logger';

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

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

      // 파일 크기 체크
      if (selectedImage.fileSize && selectedImage.fileSize > MAX_IMAGE_SIZE) {
        Alert.alert(
          '파일 크기 초과',
          `이미지 크기는 최대 2MB까지 가능합니다.\n현재 크기: ${(selectedImage.fileSize / 1024 / 1024).toFixed(2)}MB`
        );
        return;
      }

      try {
        setUploadingImage(true);

        // 1. 로컬에 저장하고 S3 업로드 시작
        logger.log('💾 [useImagePicker] Saving image locally and uploading to S3...');
        await ImageCache.saveAndUpload(
          selectedImage.uri,
          (serverUrl) => {
            // 2. S3 업로드 성공 시 URL 설정
            logger.log('✅ [useImagePicker] S3 upload complete:', serverUrl);
            setImageUri(serverUrl);
            setUploadingImage(false);

            // 성공 토스트
            Toast.show({
              type: 'success',
              text1: '이미지 추가 완료',
              text2: '일기에 사진이 추가되었어요',
              position: 'bottom',
              visibilityTime: 2000,
            });
          }
        );
      } catch (error: any) {
        setUploadingImage(false);
        logger.error('❌ [useImagePicker] Error saving image:', error);

        // 에러 토스트
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
