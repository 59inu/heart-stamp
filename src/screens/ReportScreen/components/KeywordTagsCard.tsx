import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Report } from '../../../models/Report';
import { COLORS } from '../../../constants/colors';

interface KeywordTagsCardProps {
  report: Report;
}

export const KeywordTagsCard: React.FC<KeywordTagsCardProps> = ({ report }) => {
  if (!report.keywords || report.keywords.length === 0) {
    return null;
  }

  return (
    <View style={styles.tagsCard}>
      <Text style={styles.cardTitle}>주요 감정 키워드</Text>
      <View style={styles.tagsList}>
        {report.keywords.map((item, index) => (
          <View
            key={item.keyword}
            style={[
              styles.tagItem,
              index < 3 && styles.tagItemTop3,
            ]}
          >
            <Text
              style={[
                styles.tagRank,
                index < 3 && styles.tagRankTop3,
              ]}
            >
              {index + 1}
            </Text>
            <Text
              style={[
                styles.tagText,
                index < 3 && styles.tagTextTop3,
              ]}
            >
              {item.keyword}
            </Text>
            <Text
              style={[
                styles.tagCount,
                index < 3 && styles.tagCountTop3,
              ]}
            >
              {item.count}회
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tagsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  tagsList: {
    gap: 8,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  tagItemTop3: {
    backgroundColor: '#FAF7F2', // 도장 카운터와 동일한 베이지
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 2,
  },
  tagRank: {
    width: 24,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.emotionPositive,
    marginRight: 12,
  },
  tagRankTop3: {
    fontSize: 16,
    color: '#7A6F5D', // 진한 베이지
  },
  tagText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  tagTextTop3: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  tagCount: {
    fontSize: 12,
    color: '#999',
    marginLeft: 12,
  },
  tagCountTop3: {
    fontSize: 13,
    color: '#999',
  },
});
