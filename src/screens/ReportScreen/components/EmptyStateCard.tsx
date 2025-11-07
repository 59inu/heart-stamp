import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type ReportPeriod = 'week' | 'month';

interface EmptyStateCardProps {
  error: string;
  period: ReportPeriod;
}

export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({ error, period }) => {
  if (error === 'not_completed') {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>⏰</Text>
        <Text style={styles.emptyMessage}>
          아직 리포트가 준비되지 않았어요
        </Text>
        <Text style={styles.emptySubtext}>
          {period === 'week' ? '주가 끝나면' : '달이 끝나면'} 리포트를 생성해드릴게요
        </Text>
      </View>
    );
  }

  if (error && error.includes('not completed yet')) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>⏰</Text>
        <Text style={styles.emptyMessage}>
          아직 리포트가 준비되지 않았어요
        </Text>
        <Text style={styles.emptySubtext}>
          {period === 'week' ? '주가 끝나면' : '달이 끝나면'} 리포트를 생성할 수 있어요
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>😔</Text>
        <Text style={styles.emptyMessage}>
          리포트를 불러올 수 없어요
        </Text>
        <Text style={styles.emptySubtext}>
          에러: {error}
        </Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  emptyCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 40,
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyMessage: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
