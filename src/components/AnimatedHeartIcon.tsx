import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaskedView from '@react-native-masked-view/masked-view';

interface AnimatedHeartIconProps {
  onPress: () => void;
  size?: number;
}

export const AnimatedHeartIcon: React.FC<AnimatedHeartIconProps> = ({
  onPress,
  size = 28,
}) => {
  const heartShake = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 주기적인 하트 애니메이션 (5초마다)
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(heartShake, {
            toValue: 10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(heartScale, {
            toValue: 1.1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(heartShake, {
            toValue: -10,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(heartShake, {
            toValue: 10,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(heartShake, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(heartScale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }, 5000);

    return () => clearInterval(interval);
  }, [heartShake, heartScale]);

  const handlePress = () => {
    // 탭 시 애니메이션
    Animated.sequence([
      Animated.parallel([
        Animated.timing(heartShake, {
          toValue: 15,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 1.2,
          duration: 80,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(heartShake, {
          toValue: -15,
          duration: 80,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(heartShake, {
          toValue: 0,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 1,
          duration: 80,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View
        style={{
          transform: [
            {
              rotate: heartShake.interpolate({
                inputRange: [-15, 15],
                outputRange: ['-15deg', '15deg'],
              }),
            },
            { scale: heartScale },
          ],
        }}
      >
        <MaskedView
          maskElement={<Ionicons name="heart" size={size} color="#fff" />}
        >
          <View style={{ width: size, height: size, position: 'relative' }}>
            {/* 베이지 원 - 왼쪽 위 */}
            <View
              style={[
                styles.colorCircle,
                {
                  width: size * 0.64,
                  height: size * 0.64,
                  borderRadius: size * 0.32,
                  backgroundColor: '#F5EFE5',
                  left: size * 0.07,
                  top: size * 0.11,
                },
              ]}
            />
            {/* 핑크 원 - 오른쪽 위 */}
            <View
              style={[
                styles.colorCircle,
                {
                  width: size * 0.57,
                  height: size * 0.57,
                  borderRadius: size * 0.29,
                  backgroundColor: '#F19392',
                  right: size * -0.07,
                  top: size * 0.11,
                },
              ]}
            />
            {/* 블루 원 - 아래 좌측 */}
            <View
              style={[
                styles.colorCircle,
                {
                  width: size * 0.71,
                  height: size * 0.64,
                  borderRadius: size * 0.36,
                  backgroundColor: '#87A6D1',
                  left: size * 0.18,
                  bottom: size * -0.07,
                },
              ]}
            />
            {/* 민트 작은 점 */}
            <View
              style={[
                styles.colorCircle,
                {
                  width: size * 0.54,
                  height: size * 0.29,
                  borderRadius: size * 0.18,
                  backgroundColor: '#9DD2B6',
                  left: 0,
                  bottom: size * 0.36,
                },
              ]}
            />
          </View>
        </MaskedView>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  colorCircle: {
    position: 'absolute',
    opacity: 1,
  },
});
