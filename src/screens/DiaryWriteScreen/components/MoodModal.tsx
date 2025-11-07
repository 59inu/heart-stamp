import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { MoodType } from '../../../models/DiaryEntry';
import { logger } from '../../../utils/logger';
import { COLORS } from '../../../constants/colors';

interface MoodModalProps {
  visible: boolean;
  selectedMood: MoodType | null;
  selectedMoodTag: string | null;
  onMoodSelect: (mood: MoodType) => void;
  onTagSelect: (tag: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

// 감정 태그 매핑
const moodTags: Record<MoodType, string[]> = {
  red: ['속상해요', '화나요', '짜증나요', '우울해요', '피곤해요', '지쳐요', '불안해요', '외로워요'],
  yellow: ['그저그래요', '무덤덤해요', '복잡해요', '애매해요', '어색해요', '심심해요', '권태로워요', '멍해요'],
  green: ['행복해요', '기뻐요', '즐거워요', '신나요', '평온해요', '만족해요', '감사해요', '설레요'],
};

export const MoodModal: React.FC<MoodModalProps> = ({
  visible,
  selectedMood,
  selectedMoodTag,
  onMoodSelect,
  onTagSelect,
  onCancel,
  onSave,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.moodModalOverlay}>
        <View style={styles.moodModalContent}>
          <Text style={styles.moodModalTitle}>오늘의 기분은 어땠어요?</Text>

          {/* 신호등 선택 */}
          <View style={styles.trafficLightSection}>
            <TouchableOpacity
              testID="traffic-light-red"
              style={[
                styles.trafficLight,
                selectedMood === 'red' ? styles.trafficLightRedSelected : styles.trafficLightRed,
              ]}
              onPress={() => onMoodSelect('red')}
            >
              <View style={styles.trafficLightCircle} />
            </TouchableOpacity>

            <TouchableOpacity
              testID="traffic-light-yellow"
              style={[
                styles.trafficLight,
                selectedMood === 'yellow' ? styles.trafficLightYellowSelected : styles.trafficLightYellow,
              ]}
              onPress={() => onMoodSelect('yellow')}
            >
              <View style={styles.trafficLightCircle} />
            </TouchableOpacity>

            <TouchableOpacity
              testID="traffic-light-green"
              style={[
                styles.trafficLight,
                selectedMood === 'green' ? styles.trafficLightGreenSelected : styles.trafficLightGreen,
              ]}
              onPress={() => onMoodSelect('green')}
            >
              <View style={styles.trafficLightCircle} />
            </TouchableOpacity>
          </View>

          {/* 감정 태그 */}
          {selectedMood ? (
            <ScrollView style={styles.moodTagScroll}>
              <View style={styles.moodTagContainer}>
                {moodTags[selectedMood].map((tag) => {
                  const isSelected = selectedMoodTag === tag;
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.moodTag,
                        isSelected && styles.moodTagSelected,
                      ]}
                      onPress={() => {
                        logger.debug('[태그 클릭]', tag, '/ 현재 선택:', selectedMoodTag, '/ isSelected:', isSelected);
                        onTagSelect(tag);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.moodTagText,
                          isSelected && styles.moodTagTextSelected,
                        ]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          ) : (
            <Text style={styles.moodTagPlaceholder}>신호등을 선택해주세요</Text>
          )}

          {/* 버튼 */}
          <View style={styles.moodModalButtons}>
            <TouchableOpacity
              style={styles.moodModalButtonCancel}
              onPress={onCancel}
            >
              <Text style={styles.moodModalButtonCancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="mood-modal-save-button"
              style={[
                styles.moodModalButtonSave,
                (!selectedMood || !selectedMoodTag) && styles.moodModalButtonDisabled
              ]}
              onPress={onSave}
              disabled={!selectedMood || !selectedMoodTag}
            >
              <Text style={[
                styles.moodModalButtonSaveText,
                (!selectedMood || !selectedMoodTag) && styles.moodModalButtonTextDisabled
              ]}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  moodModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  moodModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  moodModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  trafficLightSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  trafficLight: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'transparent',
  },
  trafficLightCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  trafficLightRed: {
    backgroundColor: '#FFB3BA',
  },
  trafficLightYellow: {
    backgroundColor: '#FFF4B0',
  },
  trafficLightGreen: {
    backgroundColor: '#B4E7CE',
  },
  trafficLightRedSelected: {
    backgroundColor: '#FF8A94',
    shadowColor: '#FF8A94',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 12,
  },
  trafficLightYellowSelected: {
    backgroundColor: '#FFE87C',
    shadowColor: '#FFE87C',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 12,
  },
  trafficLightGreenSelected: {
    backgroundColor: '#8AD9B5',
    shadowColor: '#8AD9B5',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 12,
  },
  moodTagScroll: {
    maxHeight: 200,
  },
  moodTagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  moodTag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  moodTagSelected: {
    backgroundColor: COLORS.buttonSecondaryBackground,
    borderColor: COLORS.buttonSecondaryBackground,
  },
  moodTagText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  moodTagTextSelected: {
    color: COLORS.buttonSecondaryText,
    fontWeight: '600',
  },
  moodTagPlaceholder: {
    textAlign: 'center',
    fontSize: 14,
    color: '#999',
    paddingVertical: 20,
  },
  moodModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  moodModalButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
  },
  moodModalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  moodModalButtonSave: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.buttonSecondaryBackground,
    borderRadius: 12,
    alignItems: 'center',
  },
  moodModalButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  moodModalButtonSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  moodModalButtonTextDisabled: {
    color: '#999',
  },
});
