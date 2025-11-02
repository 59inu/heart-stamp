import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SURVEY_URL, SURVEY_BENEFIT } from '../constants/survey';
import { COLORS } from '../constants/colors';

interface SurveyModalProps {
  visible: boolean;
  onClose: () => void;
  onParticipate: () => void;
}

export const SurveyModal: React.FC<SurveyModalProps> = ({
  visible,
  onClose,
  onParticipate,
}) => {
  const handleParticipate = async () => {
    onParticipate();
    await WebBrowser.openBrowserAsync(SURVEY_URL);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.emoji}>✨</Text>
          <Text style={styles.title}>특별 제안</Text>

          <Text style={styles.subtitle}>
            스탬프 다이어리 초기 사용자 설문조사
          </Text>

          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📋</Text>
              <Text style={styles.infoText}>소요시간: 2분</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🎁</Text>
              <Text style={styles.infoText}>
                혜택: {SURVEY_BENEFIT.title}
              </Text>
            </View>
          </View>

          <Text style={styles.description}>
            여러분의 소중한 의견으로{'\n'}
            더 나은 앱을 만들어갈게요 💚
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.laterButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.laterButtonText}>나중에 하기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.participateButton}
              onPress={handleParticipate}
              activeOpacity={0.7}
            >
              <Text style={styles.participateButtonText}>참여하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#f0f7f0',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.buttonSecondaryBackground,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flexWrap: 'wrap',
  },
  infoSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginLeft: 26,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  laterButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  participateButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.buttonSecondaryBackground,
    alignItems: 'center',
  },
  participateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
