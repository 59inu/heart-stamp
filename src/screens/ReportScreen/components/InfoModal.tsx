import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type ReportPeriod = 'week' | 'month';

interface InfoModalProps {
  visible: boolean;
  period: ReportPeriod;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ visible, period, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>리포트 항목 설명</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.modalItem}>
              <Text style={styles.modalItemTitle}>📊 기분 밸런스</Text>
              <Text style={styles.modalItemText}>
                전{period === 'week' ? '주' : '월'} 대비 가장 상승한 감정 무드를 보여줍니다
              </Text>
            </View>

            <View style={styles.modalItem}>
              <Text style={styles.modalItemTitle}>🔑 주요 키워드</Text>
              <Text style={styles.modalItemText}>
                일기에서 반복해 등장하거나 감정에 영향을 준 주요 키워드를 의미합니다
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
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
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalBody: {
    padding: 20,
    gap: 20,
  },
  modalItem: {
    gap: 8,
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalItemText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
