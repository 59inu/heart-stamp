import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { CONTACT_FORM_URL } from '../constants/faq';
import { COLORS } from '../constants/colors';

interface ContactModalProps {
  visible: boolean;
  onClose: () => void;
  onFAQ: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  visible,
  onClose,
  onFAQ,
}) => {
  const handleContactForm = async () => {
    const result = await WebBrowser.openBrowserAsync(CONTACT_FORM_URL);
    // 웹뷰가 닫힌 후 모달도 닫기
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent}>
          <Text style={styles.title}>어떻게 도와드릴까요?</Text>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => {
              onClose();
              onFAQ();
            }}
            activeOpacity={0.7}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="book-outline" size={24} color={COLORS.settingsIconColor} />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>자주 묻는 질문</Text>
              <Text style={styles.optionDescription}>
                빠른 답변을 찾아보세요
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleContactForm}
            activeOpacity={0.7}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="mail-outline" size={24} color={COLORS.settingsIconColor} />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>문의하기</Text>
              <Text style={styles.optionDescription}>
                새로운 문의사항을 보내주세요
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
    borderRadius: 16,
    width: '100%',
    maxWidth: 340,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.buttonBackground,
    borderRadius: 12,
    marginBottom: 12,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.settingsIconBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#999',
  },
});
