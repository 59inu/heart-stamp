import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '../../../services/apiService';

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
      const result = await apiService.uploadImage(selectedImage.uri);
      setUploadingImage(false);

      if (result.success) {
        setImageUri(result.data);
      } else {
        Alert.alert(
          '업로드 실패',
          `이미지 업로드에 실패했습니다.\n\n${result.error}\n\n다시 시도해주세요.`,
          [
            { text: '취소', style: 'cancel' },
            { text: '재시도', onPress: pickImage }
          ]
        );
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
