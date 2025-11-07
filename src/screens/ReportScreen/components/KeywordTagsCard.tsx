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
    padding: 20,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  tagsList: {
    gap: 12,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tagItemTop3: {
    backgroundColor: '#fffaed',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  tagRank: {
    width: 24,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.emotionPositive,
    marginRight: 12,
  },
  tagRankTop3: {
    fontSize: 18,
    color: COLORS.emotionNeutral,
  },
  tagText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  tagTextTop3: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tagCount: {
    fontSize: 13,
    color: '#999',
    marginLeft: 12,
  },
  tagCountTop3: {
    fontSize: 14,
    color: '#999',
  },
});
