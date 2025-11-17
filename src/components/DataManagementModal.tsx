import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExportService, ExportJob } from '../services/exportService';
import { COLORS } from '../constants/colors';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface DataManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({ visible, onClose }) => {
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible) {
      loadExportJobs();
    }
  }, [visible]);

  const loadExportJobs = async () => {
    try {
      setRefreshing(true);
      const jobs = await ExportService.getAllExportJobs();
      setExportJobs(jobs);
    } catch (error: any) {
      console.error('Failed to load export jobs:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRequestExport = async () => {
    try {
      setLoading(true);

      Alert.alert(
        '일기 내보내기',
        '일기 데이터를 텍스트 파일로 내보냅니다.\n24시간 내에 완료되며, 알림으로 안내해드립니다.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '확인',
            onPress: async () => {
              try {
                await ExportService.requestExport('txt');
                Alert.alert('내보내기 요청 완료', '24시간 내에 완료됩니다.\n완료되면 알림으로 안내해드립니다.');
                loadExportJobs();
              } catch (error: any) {
                Alert.alert('내보내기 요청 실패', error.message);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('오류', error.message);
    } finally {
      setLoading(false);
    }
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
      Alert.alert('다운로드 실패', '다운로드 중 오류가 발생했습니다');
    }
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      '모든 데이터 삭제',
      '정말로 모든 일기 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await ExportService.deleteAllData();
              Alert.alert(
                '삭제 완료',
                `${result.deletedDiaries}개의 일기가 삭제되었습니다.\n앱을 다시 시작해주세요.`,
                [
                  {
                    text: '확인',
                    onPress: () => {
                      onClose();
                      // TODO: Navigate to onboarding or restart app
                    },
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert('삭제 실패', error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getStatusBadge = (status: ExportJob['status']) => {
    const statusConfig = {
      pending: { text: '대기 중', color: '#999', bgColor: '#f5f5f5' },
      processing: { text: '처리 중', color: '#FF9800', bgColor: '#FFF3E0' },
      completed: { text: '완료', color: '#4CAF50', bgColor: '#E8F5E9' },
      failed: { text: '실패', color: '#F44336', bgColor: '#FFEBEE' },
    };

    const config = statusConfig[status];

    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
        <Text style={[styles.statusText, { color: config.color }]}>{config.text}</Text>
      </View>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MM월 dd일 HH:mm', { locale: ko });
    } catch {
      return dateString;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>데이터 관리</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Export Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>일기 내보내기</Text>
              <Text style={styles.sectionDescription}>
                일기 데이터를 텍스트 파일로 내보냅니다.{'\n'}
                완료까지 최대 24시간이 소요되며, 알림으로 안내해드립니다.
              </Text>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleRequestExport}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={20} color="#fff" />
                    <Text style={styles.primaryButtonText}>내보내기 요청</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Export History */}
            {exportJobs.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>내보내기 기록</Text>
                  <TouchableOpacity onPress={loadExportJobs} disabled={refreshing}>
                    <Ionicons
                      name="refresh"
                      size={20}
                      color={refreshing ? '#ccc' : COLORS.settingsIconColor}
                    />
                  </TouchableOpacity>
                </View>

                {exportJobs.map((job) => (
                  <View key={job.id} style={styles.jobItem}>
                    <View style={styles.jobHeader}>
                      <Text style={styles.jobDate}>{formatDate(job.createdAt)}</Text>
                      {getStatusBadge(job.status)}
                    </View>

                    {job.status === 'completed' && job.s3Url && (
                      <>
                        <TouchableOpacity
                          style={styles.downloadButton}
                          onPress={() => handleDownload(job)}
                        >
                          <Ionicons name="cloud-download-outline" size={18} color={COLORS.settingsIconColor} />
                          <Text style={styles.downloadButtonText}>다운로드</Text>
                        </TouchableOpacity>
                        {job.expiresAt && (
                          <Text style={styles.expiryText}>
                            만료: {formatDate(job.expiresAt)}
                          </Text>
                        )}
                      </>
                    )}

                    {job.status === 'failed' && job.errorMessage && (
                      <Text style={styles.errorText}>{job.errorMessage}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Danger Zone */}
            <View style={[styles.section, styles.dangerSection]}>
              <Text style={styles.dangerTitle}>위험 구역</Text>
              <Text style={styles.dangerDescription}>
                아래 작업은 되돌릴 수 없습니다. 신중하게 선택해주세요.
              </Text>

              <TouchableOpacity
                style={[styles.dangerButton, loading && styles.buttonDisabled]}
                onPress={handleDeleteAllData}
                disabled={loading}
              >
                <Ionicons name="trash-outline" size={20} color="#F44336" />
                <Text style={styles.dangerButtonText}>모든 데이터 삭제</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.settingsIconColor,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  jobItem: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  jobDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.settingsIconColor,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.settingsIconColor,
  },
  expiryText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#F44336',
    marginTop: 8,
  },
  dangerSection: {
    borderBottomWidth: 0,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
    marginBottom: 8,
  },
  dangerDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: '#F44336',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
});
