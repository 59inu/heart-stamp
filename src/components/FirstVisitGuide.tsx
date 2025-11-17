import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { GuideCarousel } from './GuideCarousel';

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
        <GuideCarousel
          onComplete={onComplete}
          containerWidth={SCREEN_WIDTH - 40}
        />
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
    backgroundColor: '#F4EBDD',
    borderRadius: 20,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
});
