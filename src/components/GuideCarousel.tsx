import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { GUIDE_STEPS } from '../constants/guide';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GuideCarouselProps {
  onComplete: () => void;
  containerWidth?: number; // 커스텀 너비 (기본값: 화면 너비)
}

export const GuideCarousel: React.FC<GuideCarouselProps> = ({
  onComplete,
  containerWidth = SCREEN_WIDTH,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / containerWidth);
    setCurrentIndex(index);
  };

  const isLastStep = currentIndex === GUIDE_STEPS.length - 1;

  return (
    <View style={styles.container}>
      {/* 캐로셀 */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={{ width: containerWidth }}
      >
        {GUIDE_STEPS.map((step, index) => (
          <View
            key={index}
            style={[styles.slide, { width: containerWidth }]}
          >
            <Text style={styles.emoji}>{step.emoji}</Text>
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.description}>{step.description}</Text>
            {step.example && (
              <Text style={styles.example}>{step.example}</Text>
            )}
            {step.highlight && (
              <Text style={styles.highlight}>{step.highlight}</Text>
            )}
          </View>
        ))}
      </ScrollView>

      {/* 페이지 인디케이터 */}
      <View style={styles.indicators}>
        {GUIDE_STEPS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              index === currentIndex && styles.indicatorActive,
            ]}
          />
        ))}
      </View>

      {/* 시작하기 버튼 */}
      {isLastStep && (
        <View style={styles.startButtonContainer}>
          <TouchableOpacity
            style={styles.startButton}
            onPress={onComplete}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>시작하기</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  slide: {
    paddingHorizontal: 30,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 60,
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 12,
  },
  example: {
    fontSize: 15,
    color: '#4CAF50',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 12,
  },
  highlight: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  indicators: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d0d0d0',
    marginHorizontal: 4,
  },
  indicatorActive: {
    width: 24,
    backgroundColor: '#4CAF50',
  },
  startButtonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
