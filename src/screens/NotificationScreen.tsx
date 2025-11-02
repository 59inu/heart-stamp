import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Notification } from '../models/Notification';
import { NotificationStorage } from '../services/notificationStorage';
import { RootStackParamList } from '../navigation/types';
import { COLORS } from '../constants/colors';
import { diaryEvents, EVENTS } from '../services/eventEmitter';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Notification'>;

export const NotificationScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    const data = await NotificationStorage.getAll();
    setNotifications(data);

    const count = await NotificationStorage.getUnreadCount();
    setUnreadCount(count);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  // AI 코멘트 달릴 때 실시간으로 알림 목록 업데이트
  useEffect(() => {
    const handleAICommentReceived = () => {
      console.log('🔔 [NotificationScreen] AI comment received - reloading notifications...');
      loadNotifications();
    };

    diaryEvents.on(EVENTS.AI_COMMENT_RECEIVED, handleAICommentReceived);

    return () => {
      diaryEvents.off(EVENTS.AI_COMMENT_RECEIVED, handleAICommentReceived);
    };
  }, [loadNotifications]);

  const handleNotificationPress = async (notification: Notification) => {
    // 읽음 처리
    if (!notification.isRead) {
      await NotificationStorage.markAsRead(notification._id);
      loadNotifications();
    }

    // 해당 일기 상세 화면으로 이동
    navigation.navigate('DiaryDetail', { entryId: notification.diaryId });
  };

  const handleMarkAllAsRead = async () => {
    await NotificationStorage.markAllAsRead();
    loadNotifications();
  };

  const handleClearAll = () => {
    Alert.alert(
      '모든 알림 삭제',
      '정말 모든 알림을 삭제하시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            await NotificationStorage.clearAll();
            loadNotifications();
          },
        },
      ]
    );
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.isRead && styles.unreadItem]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, !item.isRead && styles.unreadIconCircle]}>
          <Ionicons
            name="sparkles"
            size={20}
            color={!item.isRead ? '#60A5FA' : '#9CA3AF'}
          />
        </View>
      </View>

      <View style={styles.contentContainer}>
        <Text style={[styles.message, !item.isRead && styles.unreadMessage]}>
          {item.message}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(item.createdAt).toLocaleString('ko-KR', {
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#4B5563" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림</Text>
        <View style={styles.headerButtons}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>모두 읽음</Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={styles.headerButton}>
              <MaterialCommunityIcons name="delete-outline" size={22} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>알림이 없습니다</Text>
          <Text style={styles.emptySubText}>
            선생님이 일기를 확인하면 알림을 받을 수 있어요
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  headerButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  listContainer: {
    paddingVertical: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  unreadItem: {
    backgroundColor: '#F0F6FF',
  },
  iconContainer: {
    marginRight: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadIconCircle: {
    backgroundColor: '#DBEAFE',
  },
  contentContainer: {
    flex: 1,
  },
  message: {
    fontSize: 15,
    color: '#4B5563',
    marginBottom: 4,
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#1F2937',
  },
  timestamp: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#60A5FA',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#D1D5DB',
    marginTop: 8,
    textAlign: 'center',
  },
});
