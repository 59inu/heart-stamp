/**
 * 오프라인 배너 컴포넌트
 * 네트워크가 연결되지 않았을 때 화면 상단에 표시되는 배너
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export const OfflineBanner: React.FC = () => {
  const { isConnected } = useNetworkStatus();
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (isConnected === false) {
      // 오프라인 상태: 배너 내려오기
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else if (isConnected === true) {
      // 온라인 상태: 배너 올리기
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isConnected, slideAnim]);

  // isConnected가 null이면 아직 상태를 모르는 것이므로 아무것도 표시하지 않음
  if (isConnected === null) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name="cloud-offline" size={16} color="#fff" />
        <Text style={styles.text}>오프라인 - 일기는 기기에 저장됩니다</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FF6B6B',
    paddingTop: Platform.OS === 'ios' ? 48 : 8,
    paddingBottom: 8,
    paddingHorizontal: 16,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
