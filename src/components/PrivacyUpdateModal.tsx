import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { COLORS } from '../constants/colors';

interface PrivacyUpdateModalProps {
  visible: boolean;
  onAgree: () => void;
}

export const PrivacyUpdateModal: React.FC<PrivacyUpdateModalProps> = ({
  visible,
  onAgree,
}) => {
  const handleViewPrivacy = async () => {
    await WebBrowser.openBrowserAsync('https://heartstamp.kr/privacy?embedded=true');
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onAgree}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Ionicons name="document-text" size={32} color={COLORS.primary} />
            <Text style={styles.title}>개인정보 처리방침 업데이트</Text>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>
              더 나은 서비스 제공을 위해 개인정보 처리방침이 업데이트되었습니다.
            </Text>

            <View style={styles.updateBox}>
              <Text style={styles.updateTitle}>📌 주요 변경사항</Text>
              <View style={styles.updateItem}>
                <Text style={styles.updateLabel}>• 새로운 기능</Text>
                <Text style={styles.updateText}>
                  나노바나나 AI 그림일기 기능이 추가되었습니다
                </Text>
              </View>
              <View style={styles.updateItem}>
                <Text style={styles.updateLabel}>• 데이터 전송</Text>
                <Text style={styles.updateText}>
                  그림일기 사용 시에만 일기의 주요 장면이 추출되어 나노바나나 AI로 전송됩니다
                </Text>
              </View>
              <View style={styles.updateItem}>
                <Text style={styles.updateLabel}>• 개인정보 보호</Text>
                <Text style={styles.updateText}>
                  성별, 나이 등이 모호하게 처리되어 개인 특정이 어렵습니다
                </Text>
              </View>
              <View style={styles.updateItem}>
                <Text style={styles.updateLabel}>• 데이터 보관</Text>
                <Text style={styles.updateText}>
                  이미지 생성 완료 즉시 자동 삭제됩니다
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={handleViewPrivacy} style={styles.viewPolicyButton}>
              <Text style={styles.viewPolicyText}>전체 개인정보 처리방침 보기</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity style={styles.agreeButton} onPress={onAgree}>
            <Text style={styles.agreeButtonText}>동의하고 계속하기</Text>
          </TouchableOpacity>
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
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 20,
    maxHeight: 400,
  },
  description: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  updateBox: {
    backgroundColor: '#F7F6F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  updateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  updateItem: {
    marginBottom: 12,
  },
  updateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  updateText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    paddingLeft: 12,
  },
  viewPolicyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  viewPolicyText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    marginRight: 4,
  },
  agreeButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  agreeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
