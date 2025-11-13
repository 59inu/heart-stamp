import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DiaryStorage } from '../services/diaryStorage';
import { SyncQueue } from '../services/syncQueue';
import { diaryEvents, EVENTS } from '../services/eventEmitter';
import { logger } from '../utils/logger';

interface SyncStatusBarProps {
  onSyncComplete?: () => void;
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({ onSyncComplete }) => {
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadUnsyncedCount = async () => {
    try {
      const diaries = await DiaryStorage.getAll();
      const unsynced = diaries.filter(d => !d.syncedWithServer);
      setUnsyncedCount(unsynced.length);
    } catch (error) {
      logger.error('Failed to load unsynced count:', error);
    }
  };

  useEffect(() => {
    loadUnsyncedCount();

    // 일기 업데이트 시 카운트 갱신
    const handleDiaryUpdate = () => {
      loadUnsyncedCount();
    };

    diaryEvents.on(EVENTS.DIARY_UPDATED, handleDiaryUpdate);
    diaryEvents.on(EVENTS.AI_COMMENT_RECEIVED, handleDiaryUpdate);

    return () => {
      diaryEvents.off(EVENTS.DIARY_UPDATED, handleDiaryUpdate);
      diaryEvents.off(EVENTS.AI_COMMENT_RECEIVED, handleDiaryUpdate);
    };
  }, []);

  const handleSync = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    logger.log('🔄 [SyncStatusBar] Manual sync triggered');

    try {
      // 1단계: 로컬 일기를 서버에 업로드 (SyncQueue 처리)
      logger.log('📤 [SyncStatusBar] Uploading unsynced diaries...');
      await SyncQueue.processQueue();

      // 2단계: 서버에서 최신 데이터 가져오기
      logger.log('📥 [SyncStatusBar] Fetching from server...');
      const result = await DiaryStorage.syncWithServer();

      if (result.success) {
        logger.log('✅ [SyncStatusBar] Sync completed successfully');
        await loadUnsyncedCount();
        onSyncComplete?.();
      } else {
        logger.error('❌ [SyncStatusBar] Sync failed:', result.error);
        Alert.alert(
          '동기화 실패',
          result.error || '서버와 연결할 수 없습니다. 인터넷 연결을 확인해주세요.',
          [{ text: '확인' }]
        );
        // 실패해도 카운트 갱신 (실패한 항목 확인)
        await loadUnsyncedCount();
      }
    } catch (error) {
      logger.error('❌ [SyncStatusBar] Sync error:', error);
      Alert.alert(
        '동기화 오류',
        '일기 동기화 중 오류가 발생했습니다. 나중에 다시 시도해주세요.',
        [{ text: '확인' }]
      );
      await loadUnsyncedCount();
    } finally {
      setIsSyncing(false);
    }
  };

  // 동기화할 항목이 없으면 표시하지 않음
  if (unsyncedCount === 0) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleSync}
      disabled={isSyncing}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {isSyncing ? (
          <>
            <ActivityIndicator size="small" color="#4CAF50" style={styles.icon} />
            <View style={styles.textContainer}>
              <Text style={styles.mainText}>동기화 중...</Text>
            </View>
          </>
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={20} color="#FF9800" style={styles.icon} />
            <View style={styles.textContainer}>
              <Text style={styles.mainText}>
                {unsyncedCount}개 일기 백업 대기중
              </Text>
              <Text style={styles.subText}>탭해서 지금 동기화</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#999" />
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  icon: {
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  mainText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  subText: {
    fontSize: 12,
    color: '#666',
  },
});
