import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { apiService } from '../services/apiService';
import { Letter } from '../models/Letter';
import { logger } from '../utils/logger';

type LetterDetailRouteProp = RouteProp<RootStackParamList, 'LetterDetail'>;

export const LetterDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<LetterDetailRouteProp>();
  const { letterId } = route.params;
  const [letter, setLetter] = useState<Letter | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLetter = useCallback(async () => {
    try {
      const result = await apiService.getLetters();
      if (result.success) {
        const foundLetter = result.data.find(l => l.id === letterId);
        if (foundLetter) {
          setLetter(foundLetter);

          // 읽지 않은 편지인 경우 읽음 처리
          if (!foundLetter.isRead) {
            await apiService.markLetterAsRead(foundLetter.id);
          }
        }
      } else {
        logger.error('Failed to load letter:', result.error);
      }
    } catch (error) {
      logger.error('Error loading letter:', error);
    } finally {
      setLoading(false);
    }
  }, [letterId]);

  useFocusEffect(
    useCallback(() => {
      loadLetter();
    }, [loadLetter])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#4B5563" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>선생님의 편지</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </SafeAreaView>
    );
  }

  if (!letter) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#4B5563" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>선생님의 편지</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>편지를 찾을 수 없습니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#4B5563" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>선생님의 편지</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={[letter]}
        keyExtractor={(item) => item.id}
        style={styles.listBackground}
        renderItem={({ item }) => (
          <View style={styles.letterDetailContainer}>
            <Text style={styles.letterDetailDate}>
              {item.year}년 {item.month}월
            </Text>
            <Text style={styles.letterDetailContent}>{item.content}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 0,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F6F9',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F6F9',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  listBackground: {
    backgroundColor: '#F7F6F9',
  },
  letterDetailContainer: {
    padding: 24,
  },
  letterDetailDate: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 32,
  },
  letterDetailContent: {
    fontSize: 16,
    lineHeight: 28,
    color: '#374151',
  },
});
