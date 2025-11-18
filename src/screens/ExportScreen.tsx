import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ExportService, ExportJob } from '../services/exportService';
import { COLORS } from '../constants/colors';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { RootStackParamList } from '../navigation/types';
import Toast from 'react-native-toast-message';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Export'>;

export const ExportScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadExportJobs();
    }, [])
  );

  const loadExportJobs = async () => {
    try {
      const jobs = await ExportService.getAllExportJobs();
      setExportJobs(jobs);
    } catch (error: any) {
      console.error('Failed to load export jobs:', error);
      Alert.alert('조회 실패', '내보내기 기록을 불러올 수 없습니다');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadExportJobs();
  };

  const handleRequestExport = async () => {
    Alert.alert(
      '일기 내보내기',
      '일기를 텍스트 파일로 내보냅니다.\n최대 24시간 이내에 처리됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
          onPress: async () => {
            try {
              setRequesting(true);
              await ExportService.requestExport('txt');
              Toast.show({
                type: 'success',
                text1: '내보내기 요청 완료',
                text2: '최대 24시간 이내에 처리됩니다',
                position: 'bottom',
                visibilityTime: 3000,
              });
              // Reload jobs to show new request
              loadExportJobs();
            } catch (error: any) {
              Alert.alert('내보내기 요청 실패', error.message);
            } finally {
              setRequesting(false);
            }
          },
        },
      ]
    );
  };

  const handleDownload = async (job: ExportJob) => {
    if (!job.s3Url) {
      Alert.alert('다운로드 불가', '다운로드 링크가 없습니다');
      return;
    }

    // Check if expired
    if (job.expiresAt && new Date(job.expiresAt) < new Date()) {
      Alert.alert('다운로드 만료', '다운로드 기간이 만료되었습니다.\n새로 내보내기를 요청해주세요.');
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(job.s3Url);
      if (canOpen) {
        await Linking.openURL(job.s3Url);
      } else {
        Alert.alert('다운로드 실패', 'URL을 열 수 없습니다');
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('다운로드 실패', '다운로드 중 오류가 발생했습니다');
    }
  };

  const getStatusBadge = (status: ExportJob['status']) => {
    const statusConfig = {
      pending: { text: '대기 중', color: '#999', bgColor: '#f5f5f5', icon: 'time-outline' },
      processing: { text: '처리 중', color: '#FF9800', bgColor: '#FFF3E0', icon: 'sync-outline' },
      completed: { text: '완료', color: '#4CAF50', bgColor: '#E8F5E9', icon: 'checkmark-circle-outline' },
      failed: { text: '실패', color: '#F44336', bgColor: '#FFEBEE', icon: 'alert-circle-outline' },
    };

    const config = statusConfig[status];

    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon as any} size={14} color={config.color} />
        <Text style={[styles.statusText, { color: config.color }]}>{config.text}</Text>
      </View>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy.MM.dd HH:mm', { locale: ko });
    } catch {
      return dateString;
    }
  };

  const formatExpiry = (expiresAt: string) => {
    try {
      return format(new Date(expiresAt), 'M/d까지', { locale: ko });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <>
        <SafeAreaView style={{ flex: 0, backgroundColor: '#fff' }} edges={['top']} />
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>일기 내보내기</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.settingsIconColor} />
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <SafeAreaView style={{ flex: 0, backgroundColor: '#fff' }} edges={['top']} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>일기 내보내기</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton} disabled={refreshing}>
          <Ionicons
            name="refresh"
            size={24}
            color={refreshing ? '#ccc' : COLORS.settingsIconColor}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* 내보내기 버튼 */}
        <View style={styles.exportButtonContainer}>
          <TouchableOpacity
            style={[styles.exportButton, requesting && styles.exportButtonDisabled]}
            onPress={handleRequestExport}
            disabled={requesting}
          >
            {requesting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.exportButtonText}>새로 내보내기</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.exportHint}>
            최대 24시간 이내에 처리됩니다
          </Text>
        </View>

        {/* 내보내기 기록 */}
        <View style={styles.historySection}>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>내보내기 기록</Text>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  '다운로드 링크 유효기간',
                  '다운로드 링크는 생성일로부터 14일간 유효합니다.'
                );
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="information-circle-outline" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {exportJobs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>내보내기 기록이 없습니다</Text>
            </View>
          ) : (
            exportJobs.map((job) => {
              // pending/processing: 요청일, completed/failed: 생성일(updatedAt)
              const dateLabel = (job.status === 'pending' || job.status === 'processing') ? '요청일' : '생성일';
              const dateValue = (job.status === 'pending' || job.status === 'processing') ? job.createdAt : job.updatedAt;

              return (
                <View key={job.id} style={styles.jobCard}>
                  <View style={styles.jobHeader}>
                    <View>
                      <Text style={styles.jobDate}>{dateLabel}: {formatDate(dateValue)}</Text>
                    </View>
                    {getStatusBadge(job.status)}
                  </View>

                {job.status === 'completed' && job.s3Url && (() => {
                  const isExpired = job.expiresAt ? new Date(job.expiresAt) < new Date() : false;
                  return (
                    <View style={styles.downloadSection}>
                      <TouchableOpacity
                        style={[styles.downloadButton, isExpired && styles.downloadButtonDisabled]}
                        onPress={() => !isExpired && handleDownload(job)}
                        disabled={isExpired}
                      >
                        <Ionicons name="cloud-download-outline" size={20} color="#fff" />
                        <Text style={styles.downloadButtonText}>
                          {isExpired ? '만료됨' : '다운로드'}
                        </Text>
                      </TouchableOpacity>
                      {job.expiresAt && (
                        <Text style={[styles.expiryText, isExpired && styles.expiredText]}>
                          {isExpired ? '만료됨' : `만료일: ${formatExpiry(job.expiresAt)}`}
                        </Text>
                      )}
                    </View>
                  );
                })()}

                {job.status === 'pending' && (
                  <Text style={styles.pendingText}>
                    24시간 내에 처리됩니다
                  </Text>
                )}

                {job.status === 'processing' && (
                  <View style={styles.processingContainer}>
                    <ActivityIndicator size="small" color="#FF9800" />
                    <Text style={styles.processingText}>파일 생성 중...</Text>
                  </View>
                )}

                {job.status === 'failed' && job.errorMessage && (
                  <Text style={styles.errorText}>{job.errorMessage}</Text>
                )}
                </View>
              );
            })
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  refreshButton: {
    padding: 4,
  },
  placeholder: {
    width: 36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  exportButtonContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.settingsIconColor,
    paddingVertical: 16,
    borderRadius: 12,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  exportHint: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  historySection: {
    marginTop: 8,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  jobCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  jobDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4,
  },
  jobEmail: {
    fontSize: 13,
    color: '#999',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  downloadSection: {
    marginTop: 2,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.settingsIconColor,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  downloadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  downloadButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  expiryText: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
    textAlign: 'center',
  },
  expiredText: {
    color: '#f44336',
    fontWeight: '600',
  },
  pendingText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  processingText: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 13,
    color: '#F44336',
    lineHeight: 18,
  },
  bottomSpacing: {
    height: 40,
  },
});
