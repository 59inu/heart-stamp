import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/colors';

interface MonthYearPickerProps {
  visible: boolean;
  currentDate: Date;
  onMonthSelect: (month: number) => void;
  onYearChange: (delta: number) => void;
  onClose: () => void;
}

export const MonthYearPicker: React.FC<MonthYearPickerProps> = ({
  visible,
  currentDate,
  onMonthSelect,
  onYearChange,
  onClose,
}) => {
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => onYearChange(-1)}
              style={styles.yearArrowButton}
            >
              <Ionicons name="chevron-back" size={24} color={COLORS.buttonText} />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>{currentYear}년</Text>

            <TouchableOpacity
              onPress={() => onYearChange(1)}
              style={styles.yearArrowButton}
            >
              <Ionicons name="chevron-forward" size={24} color={COLORS.buttonText} />
            </TouchableOpacity>
          </View>

          <View style={styles.pickerGrid}>
            {months.map((month, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.pickerItem,
                  index === currentMonth && styles.pickerItemSelected,
                ]}
                onPress={() => onMonthSelect(index)}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    index === currentMonth && styles.pickerItemTextSelected,
                  ]}
                >
                  {month}
                </Text>
              </TouchableOpacity>
            ))}
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
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    height: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  pickerItem: {
    width: '30%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemSelected: {
    backgroundColor: COLORS.buttonSecondaryBackground,
  },
  pickerItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  pickerItemTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  yearArrowButton: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.buttonBackground,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
