import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DiaryEntry } from '../../../models/DiaryEntry';
import { getStampImage, getRandomStampPosition, getStampColor } from '../../../utils/stampUtils';
import { COLORS } from '../../../constants/colors';

interface DiaryCardProps {
  diary: DiaryEntry;
  onPress: () => void;
}

export const DiaryCard: React.FC<DiaryCardProps> = ({ diary, onPress }) => {
  return (
    <TouchableOpacity style={styles.selectedDiaryCard} onPress={onPress}>
      <View style={styles.cardContent}>
        {diary.mood && (
          <View style={styles.moodIndicatorContainer}>
            <View
              style={[
                styles.moodIndicator,
                diary.mood === 'red' && styles.moodRed,
                diary.mood === 'yellow' && styles.moodYellow,
                diary.mood === 'green' && styles.moodGreen,
              ]}
            />
            {diary.moodTag && (
              <Text style={styles.moodTagText}>{diary.moodTag}</Text>
            )}
          </View>
        )}
        <Text style={styles.diaryContentText} numberOfLines={3} ellipsizeMode="tail">
          {diary.content.replace(/\n/g, ' ')}
        </Text>
      </View>
      {diary.aiComment ? (
        <View style={styles.aiCommentPreview}>
          {diary.stampType && (() => {
            const stampPos = getRandomStampPosition(diary._id);
            const stampColor = getStampColor(diary._id);
            return (
              <Image
                source={getStampImage(diary.stampType)}
                style={[
                  styles.stampImageLarge,
                  {
                    top: stampPos.top,
                    right: stampPos.right,
                    transform: [{ rotate: stampPos.rotation }],
                  },
                ]}
                tintColor={stampColor}
                resizeMode="contain"
              />
            );
          })()}
          <View style={styles.aiCommentLabelContainer}>
            <View style={styles.emojiCircle}>
              <Ionicons name="sparkles" size={12} color="#fff" />
            </View>
            <Text style={styles.aiCommentLabel}>선생님 코멘트</Text>
          </View>
          <Text style={styles.aiCommentPreviewText}>
            {diary.aiComment}
          </Text>
        </View>
      ) : (() => {
        // 일기 날짜와 현재 날짜 비교
        const entryDate = new Date(diary.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        entryDate.setHours(0, 0, 0, 0);

        const isToday = entryDate.getTime() === today.getTime();

        // 오늘 일기만 대기 메시지 표시
        if (isToday) {
          return (
            <View style={styles.noAiCommentPreview}>
              <Text style={styles.noAiCommentPreviewText}>
                선생님이 일기를 읽고 있어요📖
              </Text>
            </View>
          );
        }

        return null;
      })()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  selectedDiaryCard: {
    marginBottom: 24,
  },
  stampImageLarge: {
    width: 150,
    height: 150,
    position: 'absolute',
    opacity: 0.95,
    zIndex: 1,
  },
  cardContent: {
    marginBottom: 16,
  },
  diaryContentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  aiCommentPreview: {
    backgroundColor: '#F0F6FF',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    position: 'relative',
  },
  aiCommentLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  emojiCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#60A5FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiCommentLabel: {
    fontSize: 14,
    color: COLORS.teacherTitle,
    fontWeight: 'bold',
  },
  aiCommentPreviewText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  noAiCommentPreview: {
    backgroundColor: '#F0F6FF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  noAiCommentPreviewText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  moodIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  moodIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  moodRed: {
    backgroundColor: COLORS.emotionNegativeStrong,
  },
  moodYellow: {
    backgroundColor: COLORS.emotionNeutralStrong,
  },
  moodGreen: {
    backgroundColor: COLORS.emotionPositiveStrong,
  },
  moodTagText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});
