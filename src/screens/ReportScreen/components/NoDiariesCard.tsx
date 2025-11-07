import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const NoDiariesCard: React.FC = () => {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>📖</Text>
      <Text style={styles.emptyMessage}>
        분석할 기억이 쌓이지 않았어요
      </Text>
      <Text style={styles.emptySubtext}>
        일기를 작성하면 감정 리포트를 생성할 수 있어요
      </Text>
    </View>
  );
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
