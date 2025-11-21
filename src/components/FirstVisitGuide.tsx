import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { COLORS } from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FirstVisitGuideProps {
  visible: boolean;
  onComplete: () => void;
}

export const FirstVisitGuide: React.FC<FirstVisitGuideProps> = ({
  visible,
  onComplete,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={() => {}}
      />
      <View style={styles.card}>
        {/* 도장 이미지 */}
        <Image
          source={require('../../assets/stamp.png')}
          style={styles.stampImage}
          resizeMode="contain"
        />

        {/* 메인 메시지 */}
        <Text style={styles.message}>
          한 줄만 써도 괜찮아요.{'\n'}
          오늘 쓰면 내일 아침,{'\n'}
          선생님 답장이 도착합니다
        </Text>

        {/* 오늘 일기 쓰러 가기 버튼 */}
        <TouchableOpacity
          style={styles.button}
          onPress={onComplete}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>오늘 일기 쓰러 가기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  card: {
    width: SCREEN_WIDTH - 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 60,
    paddingHorizontal: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  stampImage: {
    width: 156, // 120 * 1.3
    height: 156,
    marginBottom: 32,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 40,
  },
  button: {
    backgroundColor: COLORS.buttonSecondaryBackground, // 하트 블루 (#87A6D1)
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: COLORS.buttonSecondaryBackground,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
