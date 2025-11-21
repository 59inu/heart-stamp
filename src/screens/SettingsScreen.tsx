import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Linking,
  Platform,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SURVEY_URL, SURVEY_BENEFIT } from '../constants/survey';
import { SurveyService } from '../services/surveyService';
import { FAQModal } from '../components/FAQModal';
import { ContactModal } from '../components/ContactModal';
import { UserGuideModal } from '../components/UserGuideModal';
import { ExportService } from '../services/exportService';
import { DiaryStorage } from '../services/diaryStorage';
import { NotificationService } from '../services/notificationService';
import { RootStackParamList } from '../navigation/types';
import { COLORS } from '../constants/colors';
import { PRIVACY_POLICY_VERSION } from '../constants/privacy';
import { logger } from '../utils/logger';
import { AnalyticsService } from '../services/analyticsService';
import { apiService } from '../services/apiService';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(true);
  const [hasPushPermission, setHasPushPermission] = useState(true);
  const [diaryCount, setDiaryCount] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [showUserGuideModal, setShowUserGuideModal] = useState(false);
  const [hasActiveExport, setHasActiveExport] = useState(false);
  const [hasNewNotice, setHasNewNotice] = useState(false);
  const [imageCredit, setImageCredit] = useState<{
    used: number;
    limit: number;
    remaining: number;
    resetDate: string;
  } | null>(null);

  const appVersion = '1.0.0';

  // 일기 개수 확인
  React.useEffect(() => {
    const loadDiaryCount = async () => {
      // 초기 한 번만 실제 일기 개수로 동기화
      const diaries = await DiaryStorage.getAll();
      await SurveyService.syncDiaryCount(diaries.length);

      // 동기화된 카운트 사용
      const count = await SurveyService.getDiaryWriteCount();
      setDiaryCount(count);
    };
    loadDiaryCount();
  }, []);

  // 알림 설정 및 export job 상태 불러오기
  useFocusEffect(
    React.useCallback(() => {
      const loadSettings = async () => {
        try {
          // 푸시 권한 체크
          const pushPermission = await NotificationService.checkPushPermission();
          setHasPushPermission(pushPermission);

          const dailyReminderSetting = await NotificationService.getDailyReminderEnabled();
          setDailyReminderEnabled(dailyReminderSetting);

          const teacherCommentSetting =
            await NotificationService.getTeacherCommentNotificationEnabled();
          setNotificationEnabled(teacherCommentSetting);

          // Export job 상태 체크
          const activeExport = await ExportService.hasActiveExportJob();
          setHasActiveExport(activeExport);

          // 그림일기 크레딧 조회
          const creditResult = await apiService.getImageGenerationCredit();
          if (creditResult.success) {
            setImageCredit(creditResult.data);
          }

          // 공지사항 확인 여부 체크
          const noticeVersion = await AsyncStorage.getItem('noticeViewedVersion');
          setHasNewNotice(noticeVersion !== PRIVACY_POLICY_VERSION);
        } catch (error) {
          logger.error('Failed to load settings:', error);
        }
      };
      loadSettings();
    }, [])
  );

  // AppState 리스너: 디바이스 설정에서 돌아왔을 때 권한 상태 재확인
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        logger.log('🔄 [Settings] App became active, checking permissions...');

        const pushPermission = await NotificationService.checkPushPermission();
        const previousPermission = hasPushPermission;
        setHasPushPermission(pushPermission);

        // 권한이 새로 생겼을 때 (false → true)
        if (!previousPermission && pushPermission) {
          logger.log('✅ [Settings] Permission granted, enabling notifications');
          await NotificationService.setTeacherCommentNotificationEnabled(true);
          setNotificationEnabled(true);
        }
        // 권한이 사라졌을 때 (true → false)
        else if (previousPermission && !pushPermission) {
          logger.log('⚠️ [Settings] Permission denied, disabling notifications');
          await NotificationService.setTeacherCommentNotificationEnabled(false);
          setNotificationEnabled(false);
        }

        // 현재 설정 값 다시 로드 (두 알림 모두)
        const teacherCommentSetting =
          await NotificationService.getTeacherCommentNotificationEnabled();
        setNotificationEnabled(teacherCommentSetting);

        const dailyReminderSetting = await NotificationService.getDailyReminderEnabled();
        setDailyReminderEnabled(dailyReminderSetting);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [hasPushPermission]);

  const handleNotice = async () => {
    // 공지사항 확인 처리
    await AsyncStorage.setItem('noticeViewedVersion', PRIVACY_POLICY_VERSION);
    setHasNewNotice(false);
    // 웹뷰로 공지사항 열기
    await WebBrowser.openBrowserAsync('https://heartstamp.kr/notices?embedded=true');
  };

  const handleTerms = async () => {
    await WebBrowser.openBrowserAsync('https://heartstamp.kr/terms?embedded=true');
  };

  const handlePrivacyPolicy = async () => {
    await WebBrowser.openBrowserAsync('https://heartstamp.kr/privacy?embedded=true');
  };

  const handleUserGuide = () => {
    setShowUserGuideModal(true);
  };

  const handleFeedback = () => {
    setShowContactModal(true);
  };

  const handleExportHistory = () => {
    navigation.navigate('Export');
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
              const result = await ExportService.deleteAllData();

              // 로컬 데이터도 삭제
              await DiaryStorage.clearAll();

              Alert.alert(
                '삭제 완료',
                `${result.deletedDiaries}개의 일기가 삭제되었습니다.\n앱을 다시 시작해주세요.`,
                [
                  {
                    text: '확인',
                    onPress: () => {
                      // TODO: Navigate to onboarding or restart app
                    },
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert('삭제 실패', error.message);
            }
          },
        },
      ]
    );
  };

  const handleTeacherCommentNotificationToggle = async (value: boolean) => {
    const previousState = notificationEnabled;

    try {
      setNotificationEnabled(value);

      if (value) {
        logger.log('🔔 [Settings] Enabling teacher comment notification...');

        // 설정 저장 (내부에서 권한 확인 및 토큰 등록 처리)
        await NotificationService.setTeacherCommentNotificationEnabled(true);

        // Analytics
        await AnalyticsService.logNotificationToggle('teacher_comment', true, previousState);
        await AnalyticsService.updateNotificationSettings(true, dailyReminderEnabled);
      } else {
        // 끄기
        await NotificationService.setTeacherCommentNotificationEnabled(false);

        // Analytics
        await AnalyticsService.logNotificationToggle('teacher_comment', false, previousState);
        await AnalyticsService.updateNotificationSettings(false, dailyReminderEnabled);
      }
    } catch (error) {
      logger.error('Failed to toggle teacher comment notification:', error);
      setNotificationEnabled(previousState);

      // 에러 메시지 파싱
      const errorMessage = error instanceof Error ? error.message : '';

      if (errorMessage.includes('permission denied')) {
        Alert.alert(
          '알림 권한 필요',
          '선생님 코멘트 알림을 받으려면 알림 권한이 필요합니다.\n\niOS 설정에서 알림을 허용해주세요.',
          [
            { text: '취소', style: 'cancel' },
            { text: '설정으로 이동', onPress: handleOpenSettings },
          ]
        );
      } else {
        Alert.alert('알림 설정 실패', '알림 설정 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    }
  };

  const handleDailyReminderToggle = async (value: boolean) => {
    const previousState = dailyReminderEnabled;
    try {
      setDailyReminderEnabled(value);
      await NotificationService.setDailyReminderEnabled(value);

      // Analytics: 알림 설정 토글
      await AnalyticsService.logNotificationToggle('daily_reminder', value, previousState);
      await AnalyticsService.updateNotificationSettings(notificationEnabled, value);
    } catch (error) {
      logger.error('Failed to toggle daily reminder:', error);
      // 실패 시 원래 상태로 복구
      setDailyReminderEnabled(previousState);

      // 에러 메시지 파싱
      const errorMessage = error instanceof Error ? error.message : '';

      if (errorMessage.includes('permission denied')) {
        Alert.alert(
          '알림 권한 필요',
          '일기 작성 알림을 받으려면 알림 권한이 필요합니다.\n\n설정에서 알림을 허용해주세요.',
          [
            { text: '취소', style: 'cancel' },
            { text: '설정으로 이동', onPress: handleOpenSettings },
          ]
        );
      } else {
        Alert.alert('알림 설정 실패', '알림 설정 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    }
  };

  const handleSurvey = async () => {
    await WebBrowser.openBrowserAsync(SURVEY_URL);
  };

  const handleOpenSettings = () => {
    // 바로 설정으로 이동 (중복 Alert 방지)
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  return (
    <>
      <SafeAreaView style={{ flex: 0, backgroundColor: '#fff' }} edges={['top']} />
      <SafeAreaView style={styles.container} edges={[]}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#4B5563" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>설정</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 알림 설정 */}
          <View style={[styles.section, styles.firstSection]}>
            <Text style={styles.sectionTitle}>알림</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>선생님 코멘트 알림</Text>
                <Text style={styles.settingDescription}>
                  선생님 코멘트가 도착하면 오전에 알림을 받습니다
                </Text>
              </View>
              <Switch
                value={notificationEnabled}
                onValueChange={handleTeacherCommentNotificationToggle}
                trackColor={{ false: '#d0d0d0', true: COLORS.settingsIconColor }}
                thumbColor={notificationEnabled ? '#fff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>일기 작성 알림</Text>
                <Text style={styles.settingDescription}>
                  매일 저녁 9시에 일기 작성을 알려드립니다
                </Text>
              </View>
              <Switch
                value={dailyReminderEnabled}
                onValueChange={handleDailyReminderToggle}
                trackColor={{ false: '#d0d0d0', true: COLORS.settingsIconColor }}
                thumbColor={dailyReminderEnabled ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* 그림일기 크레딧 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>그림일기</Text>

            <View style={styles.creditCard}>
              <View style={styles.creditHeader}>
                <Ionicons name="image-outline" size={24} color={COLORS.secondary} />
                <Text style={styles.creditTitle}>월간 크레딧</Text>
              </View>

              {imageCredit ? (
                <View style={styles.creditContent}>
                  <View style={styles.creditRow}>
                    <Text style={styles.creditLabel}>이번 달 사용</Text>
                    <Text style={styles.creditValue}>
                      {imageCredit.used} / {imageCredit.limit}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.creditContent}>
                  <Text style={styles.creditLoadingText}>로딩 중...</Text>
                </View>
              )}
            </View>
          </View>

          {/* 데이터 관리 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>데이터 관리</Text>

            <TouchableOpacity style={styles.menuItem} onPress={handleExportHistory}>
              <Ionicons name="download-outline" size={24} color={COLORS.settingsIconColor} />
              <Text style={styles.menuItemText}>일기 내보내기</Text>
              {hasActiveExport && (
                <View style={styles.processingBadge}>
                  <Text style={styles.processingText}>처리중</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAllData}>
              <Ionicons name="trash-outline" size={24} color="#F44336" />
              <Text style={[styles.menuItemText, { color: '#F44336' }]}>모든 데이터 삭제</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* 설문조사 배너 - 5회 이상 일기 작성자에게 표시 */}
          {diaryCount >= 5 && (
            <View style={styles.section}>
              <TouchableOpacity style={[styles.menuItem, styles.surveyItem]} onPress={handleSurvey}>
                <View style={styles.surveyIconContainer}>
                  <Ionicons name="clipboard-outline" size={24} color="#fff" />
                </View>
                <View style={styles.surveyTextContainer}>
                  <View style={styles.surveyTitleRow}>
                    <Text style={styles.surveyTitle}>사용자 설문조사 참여하기</Text>
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                  </View>
                  <Text style={styles.surveyDescription}>🎁 {SURVEY_BENEFIT.title}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            </View>
          )}

          {/* 정보 및 지원 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>정보 및 지원</Text>

            <TouchableOpacity style={styles.menuItem} onPress={handleNotice}>
              <Ionicons name="megaphone-outline" size={24} color={COLORS.settingsIconColor} />
              <Text style={styles.menuItemText}>공지사항</Text>
              <View style={styles.menuItemRight}>
                {hasNewNotice && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleUserGuide}>
              <Ionicons name="book-outline" size={24} color={COLORS.settingsIconColor} />
              <Text style={styles.menuItemText}>사용 가이드</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleFeedback}>
              <Ionicons name="help-circle-outline" size={24} color={COLORS.settingsIconColor} />
              <Text style={styles.menuItemText}>FAQ / 문의하기</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleTerms}>
              <Ionicons name="document-text-outline" size={24} color={COLORS.settingsIconColor} />
              <Text style={styles.menuItemText}>서비스 이용약관</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handlePrivacyPolicy}>
              <Ionicons
                name="shield-checkmark-outline"
                size={24}
                color={COLORS.settingsIconColor}
              />
              <Text style={styles.menuItemText}>개인정보 처리방침</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <View style={styles.menuItem}>
              <Ionicons
                name="information-circle-outline"
                size={24}
                color={COLORS.settingsIconColor}
              />
              <Text style={styles.menuItemText}>앱 버전</Text>
              <Text style={styles.versionText}>{appVersion}</Text>
            </View>
          </View>

          {/* 하단 여백 */}
          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* 문의하기 모달 */}
        <ContactModal
          visible={showContactModal}
          onClose={() => setShowContactModal(false)}
          onFAQ={() => setShowFAQModal(true)}
        />

        {/* FAQ 모달 */}
        <FAQModal visible={showFAQModal} onClose={() => setShowFAQModal(false)} />

        {/* 사용 가이드 모달 */}
        <UserGuideModal
          visible={showUserGuideModal}
          onClose={() => setShowUserGuideModal(false)}
          hideStartButton={true}
        />
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  section: {
    marginTop: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  firstSection: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#999',
    lineHeight: 18,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 16,
  },
  versionText: {
    fontSize: 14,
    color: '#999',
  },
  surveyItem: {
    backgroundColor: '#fffaed',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderBottomWidth: 0,
  },
  surveyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.buttonSecondaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  surveyTextContainer: {
    flex: 1,
  },
  surveyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  surveyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  newBadge: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  surveyDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 4,
  },
  completedText: {
    fontSize: 13,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  comingSoonBadge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
  },
  processingBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  processingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF9800',
  },
  bottomSpacing: {
    height: 40,
  },
  permissionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: -1,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  permissionWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#F57C00',
    marginLeft: 8,
    fontWeight: '500',
  },
  creditCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  creditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  creditTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  creditContent: {
    gap: 12,
  },
  creditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditLabel: {
    fontSize: 14,
    color: '#666',
  },
  creditValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  creditValueEmpty: {
    color: '#F44336',
  },
  creditFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  creditResetText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  creditLoadingText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 8,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
