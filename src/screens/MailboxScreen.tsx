import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { apiService } from '../services/apiService';
import { Letter } from '../models/Letter';
import { logger } from '../utils/logger';
import { COLORS } from '../constants/colors';

type NavigationProp = any;

export const MailboxScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLetters = useCallback(async () => {
    try {
      const result = await apiService.getLetters();
      if (result.success) {
        setLetters(result.data);
      } else {
        logger.error('Failed to load letters:', result.error);
      }
    } catch (error) {
      logger.error('Error loading letters:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLetters();
    setRefreshing(false);
  }, [loadLetters]);

  const handleLetterPress = useCallback(
    (letter: Letter) => {
      navigation.navigate('LetterDetail', { letterId: letter.id });
    },
    [navigation]
  );

  useFocusEffect(
    useCallback(() => {
      loadLetters();
    }, [loadLetters])
  );

  const renderLetterItem = ({ item }: { item: Letter }) => (
    <TouchableOpacity
      style={styles.letterItem}
      onPress={() => handleLetterPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.letterIconContainer}>
        <Image
          source={require('../../assets/icon.png')}
          style={[styles.letterIcon, item.isRead && styles.letterIconRead]}
          resizeMode="contain"
        />
      </View>
      <View style={styles.letterContent}>
        <View style={styles.letterHeader}>
          <Text style={[styles.letterTitle, !item.isRead && styles.unreadTitle]}>
            {item.month}월의 편지
          </Text>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.letterDate}>
          {item.year}년 {item.month}월
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#4B5563" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>우편함</Text>
        <View style={styles.placeholder} />
      </View>

{loading ? (
        <View style={[styles.loadingContainer, { paddingBottom: insets.bottom }]}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
<FlatList
          data={letters}
          keyExtractor={(item) => item.id}
          renderItem={renderLetterItem}
          ListEmptyComponent={
            <View style={[styles.emptyContainer, { paddingBottom: insets.bottom + 100 }]}>
              <MaterialCommunityIcons name="mailbox-open-outline" size={80} color="#D1D5DB" />
              <Text style={styles.emptyText}>일기를 열심히 쓰면{'\n'}편지가 온다는 소문이 있어요</Text>
            </View>
          }
          contentContainerStyle={
            letters.length > 0
              ? [styles.listContainer, { paddingBottom: insets.bottom, flexGrow: 1 }]
              : { flexGrow: 1 }
          }
          style={styles.listBackground}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        />
      )}
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
    width: 36,
    padding: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  placeholder: {
    width: 36,
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
    paddingHorizontal: 40,
    backgroundColor: '#F7F6F9',
  },
  emptyText: {
    marginTop: 24,
    fontSize: 16,
    lineHeight: 24,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  listBackground: {
    backgroundColor: '#F7F6F9',
  },
  listContainer: {
    padding: 16,
  },
  letterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  letterIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  letterIcon: {
    width: 28,
    height: 28,
  },
  letterIconRead: {
    opacity: 0.4,
  },
  letterContent: {
    flex: 1,
  },
  letterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  letterTitle: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  unreadTitle: {
    fontWeight: '600',
    color: '#111827',
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginLeft: 6,
  },
  letterDate: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
